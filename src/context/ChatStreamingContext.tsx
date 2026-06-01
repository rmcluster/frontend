import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { streamChat, streamNodesToLoadedDevices, appendChatEvent } from '../lib/api';
import { useConversations } from './ConversationContext';
import type { ChatMessage, LoadedDevice } from '../types/ui';

export type StreamEntry = {
  streaming: boolean;
  streamingContent: string;
  loadingPhase: string;
  loadingProgress: number;
  layersOnGpu: number;
  nodeCount: number;
  loadedDevices: LoadedDevice[];
};

export type StreamToast = {
  id: string;
  convId: string;
  convTitle: string;
  model: string;
};

const emptyEntry: StreamEntry = {
  streaming: false,
  streamingContent: '',
  loadingPhase: '',
  loadingProgress: 0,
  layersOnGpu: 0,
  nodeCount: 0,
  loadedDevices: [],
};

export type StartStreamParams = {
  convId: string;
  model: string;
  content: string;
  prevMessages: ChatMessage[];
  thinkingEnabled: boolean;
  convTitle: string;
};

type ChatStreamingContextValue = {
  streams: Record<string, StreamEntry>;
  toasts: StreamToast[];
  startStream: (params: StartStreamParams) => void;
  stopStream: (convId: string) => void;
  dismissToast: (id: string) => void;
};

const ChatStreamingContext = createContext<ChatStreamingContextValue | null>(null);

export function ChatStreamingProvider({ children }: { children: ReactNode }) {
  const { appendMessage, updateLastMessage, setConversationDevices, activeId } = useConversations();
  const [streams, setStreams] = useState<Record<string, StreamEntry>>({});
  const [toasts, setToasts] = useState<StreamToast[]>([]);
  const abortRefs = useRef<Record<string, AbortController>>({});
  // Ref so async stream callbacks always see the current activeId without stale closure
  const activeIdRef = useRef<string | null>(activeId);
  useEffect(() => {
    activeIdRef.current = activeId;
    if (activeId) {
      setToasts((prev) => prev.filter((t) => t.convId !== activeId));
    }
  }, [activeId]);

  const patch = useCallback((convId: string, update: Partial<StreamEntry>) => {
    setStreams((prev) => ({
      ...prev,
      [convId]: { ...(prev[convId] ?? emptyEntry), ...update },
    }));
  }, []);

  const stopStream = useCallback((convId: string) => {
    abortRefs.current[convId]?.abort();
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const startStream = useCallback(({
    convId, model, content, prevMessages, thinkingEnabled, convTitle,
  }: StartStreamParams) => {
    abortRefs.current[convId]?.abort();
    const controller = new AbortController();
    abortRefs.current[convId] = controller;

    appendMessage(convId, { role: 'user', content });
    appendMessage(convId, { role: 'assistant', content: '' });

    void appendChatEvent(convId, {
      event_type: 'message_sent',
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    }).catch(() => undefined);

    patch(convId, {
      streaming: true,
      streamingContent: '',
      loadingPhase: '',
      loadingProgress: 0,
    });

    const history: ChatMessage[] = [
      ...(!thinkingEnabled ? [{ role: 'system' as const, content: '/no_think' }] : []),
      ...prevMessages,
      { role: 'user' as const, content },
    ];

    void (async () => {
      let assistantContent = '';
      let firstTokenTime: number | null = null;
      let tokenCount = 0;

      const attemptStream = async (isRetry: boolean): Promise<boolean> => {
        if (isRetry) {
          await new Promise((r) => setTimeout(r, 2000));
          if (controller.signal.aborted) return false;
        }
        for await (const event of streamChat(history, model, controller.signal)) {
          if (event.type === 'nodes') {
            const loadedDevices = streamNodesToLoadedDevices(event.nodes);
            setConversationDevices(convId, loadedDevices);
            patch(convId, {
              nodeCount: event.nodes.length,
              loadedDevices,
            });
          } else if (event.type === 'status') {
            if (assistantContent === '' && event.phase !== 'finished') {
              patch(convId, {
                loadingPhase: event.phase,
                loadingProgress: event.percentage,
              });
            }
          } else if (event.type === 'token') {
            if (firstTokenTime === null) firstTokenTime = Date.now();
            tokenCount += 1;
            assistantContent += event.token;
            patch(convId, { streamingContent: assistantContent, loadingPhase: '' });
          }
        }
        return true;
      };

      const finalize = (tps?: number) => {
        updateLastMessage(convId, () => assistantContent, tps);
        void appendChatEvent(convId, {
          event_type: 'message_completed',
          role: 'assistant',
          content: assistantContent,
          timestamp: new Date().toISOString(),
        }).catch(() => undefined);
        if (activeIdRef.current !== convId) {
          setToasts((prev) => [...prev, {
            id: crypto.randomUUID(), convId, convTitle, model,
          }]);
        }
      };

      const calcTps = () =>
        firstTokenTime !== null && tokenCount > 0
          ? tokenCount / ((Date.now() - firstTokenTime) / 1000)
          : undefined;

      try {
        let ok = await attemptStream(false);
        if (!ok) throw new DOMException('Aborted', 'AbortError');
        if (assistantContent === '') {
          ok = await attemptStream(true);
          if (!ok) throw new DOMException('Aborted', 'AbortError');
        }
        finalize(calcTps());
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          try {
            await attemptStream(true);
            finalize(calcTps());
          } catch (retryErr) {
            if ((retryErr as Error).name !== 'AbortError') {
              updateLastMessage(convId, (prev) => prev || '_(Error: could not reach model server)_');
              void appendChatEvent(convId, {
                event_type: 'stream_error',
                error: (retryErr as Error).message,
                timestamp: new Date().toISOString(),
              }).catch(() => undefined);
            }
          }
        }
      } finally {
        patch(convId, { streaming: false, streamingContent: '', loadingPhase: '' });
        delete abortRefs.current[convId];
      }
    })();
  }, [appendMessage, updateLastMessage, setConversationDevices, patch]);

  return (
    <ChatStreamingContext.Provider value={{ streams, toasts, startStream, stopStream, dismissToast }}>
      {children}
    </ChatStreamingContext.Provider>
  );
}

export function useChatStreaming(): ChatStreamingContextValue {
  const ctx = useContext(ChatStreamingContext);
  if (!ctx) throw new Error('useChatStreaming must be used inside ChatStreamingProvider');
  return ctx;
}
