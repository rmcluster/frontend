import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useConversations } from '../context/ConversationContext';
import { streamChat, startChatSession, appendChatEvent } from '../lib/api';
import { ChatComposer } from '../components/chat/ChatComposer';
import { ChatMessages } from '../components/chat/ChatMessages';

export function ChatPage() {
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
  const abortRef = useRef<AbortController | null>(null);

  // Resolve active conversation on mount / when params change
  useEffect(() => {
    if (convParam) {
      const found = conversations.find((c) => c.id === convParam);
      if (found) {
        setActiveId(found.id);
        return;
      }
    }
    const conv = createConversation(modelParam);
    setActiveId(conv.id);
    // Register the session server-side (best-effort)
    void startChatSession(conv.id, modelParam).catch(() => undefined);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convParam]);

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
      ...(activeConv?.messages ?? []),
      { role: 'user' as const, content },
    ];

    let assistantContent = '';
    try {
      for await (const token of streamChat(history, model, controller.signal)) {
        assistantContent += token;
        setStreamingContent((prev) => prev + token);
        updateLastMessage(convId, (prev) => prev + token);
      }
      void appendChatEvent(convId, {
        event_type: 'message_completed',
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date().toISOString(),
      }).catch(() => undefined);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        updateLastMessage(convId, (prev) =>
          prev || '_(Error: could not reach model server)_'
        );
        void appendChatEvent(convId, {
          event_type: 'stream_error',
          error: (err as Error).message,
          timestamp: new Date().toISOString(),
        }).catch(() => undefined);
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
        <div className="chat-topbar-model">{modelLabel}</div>
      </div>
      <ChatMessages
        messages={messages}
        streaming={streaming}
        streamingContent={streamingContent}
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
