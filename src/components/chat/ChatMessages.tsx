import { useEffect, useRef } from 'react';
import type { ChatMessage } from '../../types/ui';

type ChatMessagesProps = {
  messages: ChatMessage[];
  streaming: boolean;
  streamingContent: string;
};

const AssistantIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <circle cx="4" cy="4" r="2.2" fill="currentColor" />
    <circle cx="10" cy="4" r="2.2" fill="currentColor" opacity="0.5" />
    <circle cx="4" cy="10" r="2.2" fill="currentColor" opacity="0.5" />
    <circle cx="10" cy="10" r="2.2" fill="currentColor" opacity="0.3" />
  </svg>
);

export function ChatMessages({ messages, streaming, streamingContent }: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, streamingContent]);

  if (messages.length === 0 && !streaming) {
    return <div className="chat-messages" />;
  }

  return (
    <div className="chat-messages">
      {messages.map((msg, idx) => (
        <div key={idx} className={`msg-row ${msg.role}`}>
          <div className={`msg-avatar ${msg.role === 'user' ? 'user-avatar' : 'assistant-avatar'}`}>
            {msg.role === 'user' ? 'U' : <AssistantIcon />}
          </div>
          <div className="msg-bubble">{msg.content}</div>
        </div>
      ))}

      {/* Typing indicator while waiting for first token */}
      {streaming && streamingContent === '' && (
        <div className="msg-row assistant">
          <div className="msg-avatar assistant-avatar">
            <AssistantIcon />
          </div>
          <div className="typing-indicator">
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
