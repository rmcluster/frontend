import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { streamChat, appendChatEvent, getLoadingStatus } from '../lib/api';
import { useConversations } from './ConversationContext';
import type { ChatMessage } from '../types/ui';

export type StreamEntry = {
  streaming: boolean;
  streamingContent: string;
  loadingPhase: string;
  loadingProgress: number;
  layersOnGpu: number;
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
  nodeCount: number;
  toasts: StreamToast[];
  startStream: (params: StartStreamParams) => void;
  stopStream: (convId: string) => void;
  dismissToast: (id: string) => void;
};

const ChatStreamingContext = createContext<ChatStreamingContextValue | null>(null);

export function ChatStreamingProvider({ children }: { children: ReactNode }) {
  const { appendMessage, updateLastMessage, activeId } = useConversations();
  const [streams, setStreams] = useState<Record<string, StreamEntry>>({});
  const [nodeCount, setNodeCount] = useState(0);
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

  // Always-on slow poll for node count
  useEffect(() => {
    const fetch = () => {
      void getLoadingStatus().then((s) => setNodeCount(s.node_count)).catch(() => undefined);
    };
    fetch();
    const id = setInterval(fetch, 5000);
    return () => clearInterval(id);
  }, []);

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

    patch(convId, { streaming: true, streamingContent: '', loadingPhase: '', loadingProgress: 0 });

    const history: ChatMessage[] = [
      ...(!thinkingEnabled ? [{ role: 'system' as const, content: '/no_think' }] : []),
      ...prevMessages,
      { role: 'user' as const, content },
    ];

    void (async () => {
      let assistantContent = '';
      let firstTokenTime: number | null = null;
      let tokenCount = 0;

      // Poll loading phase until first token arrives
      const phaseInterval = setInterval(() => {
        if (assistantContent !== '') { clearInterval(phaseInterval); return; }
        void getLoadingStatus().then((s) => {
          if (assistantContent === '') {
            patch(convId, { loadingPhase: s.phase, loadingProgress: s.progress, layersOnGpu: s.layers_on_gpu });
          }
        }).catch(() => undefined);
      }, 1200);

      const attemptStream = async (isRetry: boolean): Promise<boolean> => {
        if (isRetry) {
          await new Promise((r) => setTimeout(r, 2000));
          if (controller.signal.aborted) return false;
        }
        for await (const token of streamChat(history, model, controller.signal)) {
          if (firstTokenTime === null) firstTokenTime = Date.now();
          tokenCount += 1;
          assistantContent += token;
          patch(convId, { streamingContent: assistantContent, loadingPhase: '' });
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
        clearInterval(phaseInterval);
        patch(convId, { streaming: false, streamingContent: '', loadingPhase: '' });
        delete abortRefs.current[convId];
      }
    })();
  }, [appendMessage, updateLastMessage, patch]);

  return (
    <ChatStreamingContext.Provider value={{ streams, nodeCount, toasts, startStream, stopStream, dismissToast }}>
      {children}
    </ChatStreamingContext.Provider>
  );
}

export function useChatStreaming(): ChatStreamingContextValue {
  const ctx = useContext(ChatStreamingContext);
  if (!ctx) throw new Error('useChatStreaming must be used inside ChatStreamingProvider');
  return ctx;
}
