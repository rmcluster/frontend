import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useConversations } from '../context/ConversationContext';
import { streamChat, startChatSession, appendChatEvent, getLoadingStatus } from '../lib/api';
import { buildChatPath } from '../lib/routes';
import { ChatComposer } from '../components/chat/ChatComposer';
import { ChatMessages } from '../components/chat/ChatMessages';

export function ChatPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const modelParam = searchParams.get('model') ?? '';
  const convParam = searchParams.get('conv') ?? '';

  const {
    conversations,
    activeId,
    setActiveId,
    createConversation,
    appendMessage,
    updateLastMessage,
  } = useConversations();

  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [loadingPhase, setLoadingPhase] = useState('');
  const [thinkingEnabled, setThinkingEnabled] = useState<boolean>(() => {
    try { return localStorage.getItem('rmcluster_thinking') !== 'false'; }
    catch { return true; }
  });
  const abortRef = useRef<AbortController | null>(null);

  const toggleThinking = () => {
    setThinkingEnabled((prev) => {
      const next = !prev;
      try { localStorage.setItem('rmcluster_thinking', String(next)); } catch { /* ignore */ }
      return next;
    });
  };

  // Poll loading status only while streaming with no tokens yet.
  // Once the first token arrives (streamingContent !== '') stop immediately.
  useEffect(() => {
    if (!streaming) {
      setLoadingPhase('');
      return;
    }
    if (streamingContent !== '') {
      // Tokens are flowing — no need to show a loading phase any more
      setLoadingPhase('');
      return;
    }
    const id = setInterval(() => {
      void getLoadingStatus()
        .then((s) => setLoadingPhase(s.phase))
        .catch(() => undefined);
    }, 1200);
    return () => clearInterval(id);
  }, [streaming, streamingContent]);

  // Resolve active conversation on mount / when model or conv params change
  useEffect(() => {
    if (convParam) {
      const found = conversations.find((c) => c.id === convParam);
      if (found) {
        setActiveId(found.id);
        return;
      }
    }
    if (!modelParam) return;
    const conv = createConversation(modelParam);
    setActiveId(conv.id);
    // Stamp the conv ID into the URL so re-renders don't create duplicate conversations
    navigate(buildChatPath(modelParam, conv.id), { replace: true });
    // Register the session server-side (best-effort)
    void startChatSession(conv.id, modelParam).catch(() => undefined);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convParam, modelParam]);

  const activeConv = conversations.find((c) => c.id === activeId) ?? null;
  const messages = activeConv?.messages ?? [];
  const model = activeConv?.model ?? modelParam;

  const handleSend = async (content: string) => {
    if (!content.trim() || streaming) return;

    const convId = activeId;
    if (!convId) return;

    appendMessage(convId, { role: 'user', content });
    appendMessage(convId, { role: 'assistant', content: '' });

    void appendChatEvent(convId, {
      event_type: 'message_sent',
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    }).catch(() => undefined);

    const controller = new AbortController();
    abortRef.current = controller;
    setStreaming(true);
    setStreamingContent('');

    const history = [
      // Prepend a system directive when thinking is off so the model skips its <think> block
      ...(!thinkingEnabled ? [{ role: 'system' as const, content: '/no_think' }] : []),
      ...(activeConv?.messages ?? []),
      { role: 'user' as const, content },
    ] as import('../types/ui').ChatMessage[];

    let assistantContent = '';

    const attemptStream = async (isRetry: boolean) => {
      if (isRetry) {
        await new Promise((r) => setTimeout(r, 2000));
        if (controller.signal.aborted) return false;
      }
      for await (const token of streamChat(history, model, controller.signal)) {
        assistantContent += token;
        setStreamingContent((prev) => prev + token);
        updateLastMessage(convId, (prev) => prev + token);
      }
      return true;
    };

    try {
      let succeeded = await attemptStream(false);
      if (!succeeded) throw new DOMException('Aborted', 'AbortError');

      // If no content was received the model likely wasn't ready yet — retry once
      if (assistantContent === '') {
        succeeded = await attemptStream(true);
        if (!succeeded) throw new DOMException('Aborted', 'AbortError');
      }

      void appendChatEvent(convId, {
        event_type: 'message_completed',
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date().toISOString(),
      }).catch(() => undefined);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        // First attempt threw — retry once before surfacing the error
        try {
          await attemptStream(true);
          void appendChatEvent(convId, {
            event_type: 'message_completed',
            role: 'assistant',
            content: assistantContent,
            timestamp: new Date().toISOString(),
          }).catch(() => undefined);
        } catch (retryErr) {
          if ((retryErr as Error).name !== 'AbortError') {
            updateLastMessage(convId, (prev) =>
              prev || '_(Error: could not reach model server)_'
            );
            void appendChatEvent(convId, {
              event_type: 'stream_error',
              error: (retryErr as Error).message,
              timestamp: new Date().toISOString(),
            }).catch(() => undefined);
          }
        }
      }
    } finally {
      setStreaming(false);
      setStreamingContent('');
      abortRef.current = null;
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
  };

  const title = activeConv?.title ?? 'New conversation';
  const modelLabel = model || 'No model';

  return (
    <div className="chat-main">
      <div className="chat-topbar">
        <div className="chat-topbar-title">{title}</div>
        <div className="chat-topbar-right">
          <button
            className={`thinking-toggle-btn${thinkingEnabled ? ' active' : ''}`}
            onClick={toggleThinking}
            title={thinkingEnabled ? 'Thinking mode on — click to disable' : 'Thinking mode off — click to enable'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9.663 17h4.673M12 3a7 7 0 0 1 4.95 11.95A5 5 0 0 1 12 21a5 5 0 0 1-4.95-6.05A7 7 0 0 1 12 3z"/>
            </svg>
            Think
          </button>
          <div className="chat-topbar-model">{modelLabel}</div>
        </div>
      </div>
      <ChatMessages
        messages={messages}
        streaming={streaming}
        streamingContent={streamingContent}
        loadingPhase={loadingPhase}
      />
      <ChatComposer
        onSend={(content) => void handleSend(content)}
        onStop={handleStop}
        disabled={streaming}
        streaming={streaming}
      />
    </div>
  );
}
