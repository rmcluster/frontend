import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useConversations } from '../context/ConversationContext';
import { streamChat } from '../lib/api';
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
    // No matching conv — create one
    const conv = createConversation(modelParam);
    setActiveId(conv.id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convParam]);

  const activeConv = conversations.find((c) => c.id === activeId) ?? null;
  const messages = activeConv?.messages ?? [];
  const model = activeConv?.model ?? modelParam;

  const handleSend = async (content: string) => {
    if (!content.trim() || streaming) return;

    const convId = activeId;
    if (!convId) return;

    // Append user message
    appendMessage(convId, { role: 'user', content });

    // Append empty assistant placeholder
    appendMessage(convId, { role: 'assistant', content: '' });

    const controller = new AbortController();
    abortRef.current = controller;
    setStreaming(true);
    setStreamingContent('');

    const history = [
      ...(activeConv?.messages ?? []),
      { role: 'user' as const, content },
    ];

    try {
      for await (const token of streamChat(history, model, controller.signal)) {
        setStreamingContent((prev) => prev + token);
        updateLastMessage(convId, (prev) => prev + token);
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        updateLastMessage(convId, (prev) =>
          prev || '_(Error: could not reach model server)_'
        );
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
