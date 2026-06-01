import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  getCurrentChatRun,
  getLoadingStatus,
  startChatRun,
  stopCurrentChatRun,
  subscribeToChatRun,
} from '../lib/api';
import { useConversations } from './ConversationContext';
import type { ChatMessage, ChatRunSnapshot, ChatRunStreamEvent } from '../types/ui';

export type StreamEntry = {
  streaming: boolean;
  streamingContent: string;
  loadingPhase: string;
  loadingProgress: number;
  layersOnRpc: number;
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
  layersOnRpc: 0,
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

function isRunActive(snapshot: ChatRunSnapshot): boolean {
  return snapshot.status === 'starting' || snapshot.status === 'streaming';
}

export function ChatStreamingProvider({ children }: { children: ReactNode }) {
  const {
    conversations,
    appendMessages,
    upsertAssistantMessage,
    activeId,
  } = useConversations();
  const [streams, setStreams] = useState<Record<string, StreamEntry>>({});
  const [nodeCount, setNodeCount] = useState(0);
  const [toasts, setToasts] = useState<StreamToast[]>([]);
  const sourcesRef = useRef<Record<string, EventSource>>({});
  const reconnectTimersRef = useRef<Record<string, number>>({});
  const reconnectAttemptsRef = useRef<Record<string, number>>({});
  const intentionalCloseRef = useRef<Set<string>>(new Set());
  const hydratedRef = useRef<Set<string>>(new Set());
  const hydrationPromiseRef = useRef<Record<string, Promise<ChatRunSnapshot | null>>>({});
  const activeIdRef = useRef<string | null>(activeId);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

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

  const applySnapshot = useCallback((convId: string, snapshot: ChatRunSnapshot) => {
    upsertAssistantMessage(convId, snapshot.assistant_content);
    patch(convId, {
      streaming: isRunActive(snapshot),
      streamingContent: snapshot.assistant_content,
      loadingPhase: snapshot.loading_phase,
      loadingProgress: snapshot.loading_progress,
      layersOnRpc: snapshot.layers_on_rpc,
    });
  }, [patch, upsertAssistantMessage]);

  const clearReconnectTimer = useCallback((convId: string) => {
    const timer = reconnectTimersRef.current[convId];
    if (timer !== undefined) {
      window.clearTimeout(timer);
      delete reconnectTimersRef.current[convId];
    }
  }, []);

  const closeSource = useCallback((convId: string, intentional = false) => {
    clearReconnectTimer(convId);
    if (intentional) {
      intentionalCloseRef.current.add(convId);
    }
    sourcesRef.current[convId]?.close();
    delete sourcesRef.current[convId];
  }, [clearReconnectTimer]);

  const scheduleReconnect = useCallback((convId: string, convTitle: string, model: string) => {
    if (intentionalCloseRef.current.has(convId) || reconnectTimersRef.current[convId] !== undefined) {
      return;
    }

    const attempt = reconnectAttemptsRef.current[convId] ?? 0;
    const delay = Math.min(1000 * (attempt + 1), 5000);
    reconnectTimersRef.current[convId] = window.setTimeout(() => {
      delete reconnectTimersRef.current[convId];
      void getCurrentChatRun(convId)
        .then((snapshot) => {
          applySnapshot(convId, snapshot);
          if (isRunActive(snapshot) && !intentionalCloseRef.current.has(convId)) {
            reconnectAttemptsRef.current[convId] = attempt + 1;
            attachSource(convId, convTitle, model);
          }
        })
        .catch(() => {
          reconnectAttemptsRef.current[convId] = attempt + 1;
          scheduleReconnect(convId, convTitle, model);
        });
    }, delay);
  }, [applySnapshot]);

  const attachSource = useCallback((convId: string, convTitle: string, model: string) => {
    closeSource(convId);
    intentionalCloseRef.current.delete(convId);
    reconnectAttemptsRef.current[convId] = 0;
    const source = subscribeToChatRun(
      convId,
      (event: ChatRunStreamEvent) => {
        applySnapshot(convId, event.snapshot);
        if (!isRunActive(event.snapshot)) {
          closeSource(convId, true);
          if (event.snapshot.status === 'completed' && activeIdRef.current !== convId) {
            setToasts((prev) => [
              ...prev,
              { id: crypto.randomUUID(), convId, convTitle, model },
            ]);
          }
        }
      },
      () => {
        if (intentionalCloseRef.current.has(convId)) {
          closeSource(convId, true);
          return;
        }
        closeSource(convId);
        scheduleReconnect(convId, convTitle, model);
      }
    );
    sourcesRef.current[convId] = source;
  }, [applySnapshot, closeSource, scheduleReconnect]);

  const hydrateRun = useCallback((convId: string, convTitle: string, model: string): Promise<ChatRunSnapshot | null> => {
    const existing = hydrationPromiseRef.current[convId];
    if (existing) return existing;

    const pending = getCurrentChatRun(convId)
      .then((snapshot) => {
        applySnapshot(convId, snapshot);
        if (isRunActive(snapshot)) {
          attachSource(convId, convTitle, model);
        }
        return snapshot;
      })
      .catch(() => null)
      .finally(() => {
        delete hydrationPromiseRef.current[convId];
      });

    hydrationPromiseRef.current[convId] = pending;
    return pending;
  }, [applySnapshot, attachSource]);

  useEffect(() => {
    conversations.forEach((conv) => {
      if (hydratedRef.current.has(conv.id)) return;
      hydratedRef.current.add(conv.id);
      void hydrateRun(conv.id, conv.title, conv.model);
    });
  }, [conversations, hydrateRun]);

  useEffect(() => () => {
    Object.values(sourcesRef.current).forEach((source) => source.close());
    sourcesRef.current = {};
    Object.values(reconnectTimersRef.current).forEach((timer) => window.clearTimeout(timer));
    reconnectTimersRef.current = {};
  }, []);

  const stopStream = useCallback((convId: string) => {
    intentionalCloseRef.current.add(convId);
    void stopCurrentChatRun(convId)
      .then(async () => {
        const snapshot = await getCurrentChatRun(convId);
        applySnapshot(convId, snapshot);
      })
      .catch(() => undefined)
      .finally(() => {
        closeSource(convId, true);
      });
  }, [applySnapshot, closeSource]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const startStream = useCallback(({
    convId, model, content, prevMessages, thinkingEnabled, convTitle,
  }: StartStreamParams) => {
    closeSource(convId, true);
    intentionalCloseRef.current.delete(convId);

    void (async () => {
      const existingRun = await hydrateRun(convId, convTitle, model);
      if (existingRun && isRunActive(existingRun)) {
        return;
      }

      appendMessages(convId, [
        { role: 'user', content },
        { role: 'assistant', content: '' },
      ]);
      patch(convId, { streaming: true, streamingContent: '', loadingPhase: '', loadingProgress: 0, layersOnRpc: 0 });

      const messages: Array<Pick<ChatMessage, 'role' | 'content'>> = [
        ...prevMessages.map((message) => ({ role: message.role, content: message.content })),
        { role: 'user' as const, content },
      ];

      try {
        const snapshot = await startChatRun(convId, {
          model,
          messages,
          thinking_enabled: thinkingEnabled,
        });
        applySnapshot(convId, snapshot);
        attachSource(convId, convTitle, model);
      } catch {
        upsertAssistantMessage(convId, '_(Error: could not reach model server)_');
        patch(convId, { streaming: false, loadingPhase: '', loadingProgress: 0 });
      }
    })();
  }, [appendMessages, attachSource, applySnapshot, closeSource, hydrateRun, patch, upsertAssistantMessage]);

  return (
    <ChatStreamingContext.Provider
      value={{
        streams,
        nodeCount,
        toasts: activeId ? toasts.filter((toast) => toast.convId !== activeId) : toasts,
        startStream,
        stopStream,
        dismissToast,
      }}
    >
      {children}
    </ChatStreamingContext.Provider>
  );
}

export function useChatStreaming(): ChatStreamingContextValue {
  const ctx = useContext(ChatStreamingContext);
  if (!ctx) throw new Error('useChatStreaming must be used inside ChatStreamingProvider');
  return ctx;
}
