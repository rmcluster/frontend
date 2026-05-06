import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage } from '../../types/ui';

type ChatMessagesProps = {
  messages: ChatMessage[];
  streaming: boolean;
  streamingContent: string;
  loadingPhase?: string;
  loadingProgress?: number;
};

function phaseLabel(phase: string, progress: number): string {
  switch (phase) {
    case 'starting':      return 'Starting instance…';
    case 'downloading':   return progress > 0 ? `Downloading model… ${progress.toFixed(1)}%` : 'Downloading model…';
    case 'loading_model': return 'Loading model into memory…';
    case 'warming_up':    return 'Warming up…';
    default:              return '';
  }
}

// Split a raw assistant content string into its <think> block and the visible response.
function parseThinking(content: string): {
  thinking: string;
  response: string;
  thinkingComplete: boolean;
} {
  if (!content.startsWith('<think>')) {
    return { thinking: '', response: content, thinkingComplete: true };
  }
  const closeIdx = content.indexOf('</think>');
  if (closeIdx === -1) {
    // Still inside the think block
    return {
      thinking: content.slice('<think>'.length).trimStart(),
      response: '',
      thinkingComplete: false,
    };
  }
  return {
    thinking: content.slice('<think>'.length, closeIdx).trimStart(),
    response: content.slice(closeIdx + '</think>'.length).trimStart(),
    thinkingComplete: true,
  };
}

// Collapsible thinking block. Starts open while the model is still thinking,
// collapses automatically once thinking is complete.
function ThinkingBlock({
  thinking,
  thinkingComplete,
}: {
  thinking: string;
  thinkingComplete: boolean;
}) {
  // Start open; auto-collapse when the </think> tag arrives.
  const [open, setOpen] = useState(true);
  const prevComplete = useRef(false);
  if (thinkingComplete && !prevComplete.current) {
    prevComplete.current = true;
    // Collapse on the render where thinking first completes
    // (use a ref-based flag to avoid setState during render — schedule it)
  }
  useEffect(() => {
    if (thinkingComplete) setOpen(false);
  }, [thinkingComplete]);

  return (
    <details
      className="thinking-block"
      open={open}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="thinking-summary">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="thinking-chevron">
          <polyline points="6 9 12 15 18 9" />
        </svg>
        {thinkingComplete ? 'Thinking' : 'Thinking…'}
      </summary>
      <div className="thinking-content">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{thinking}</ReactMarkdown>
      </div>
    </details>
  );
}

const AssistantIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <circle cx="4" cy="4" r="2.2" fill="currentColor" />
    <circle cx="10" cy="4" r="2.2" fill="currentColor" opacity="0.5" />
    <circle cx="4" cy="10" r="2.2" fill="currentColor" opacity="0.5" />
    <circle cx="10" cy="10" r="2.2" fill="currentColor" opacity="0.3" />
  </svg>
);

export function ChatMessages({ messages, streaming, streamingContent, loadingPhase, loadingProgress = 0 }: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, streamingContent]);

  if (messages.length === 0 && !streaming) {
    return <div className="chat-messages flex-1 overflow-y-auto px-6 pt-6 pb-4 flex flex-col gap-5" />;
  }

  return (
    <div className="chat-messages flex-1 overflow-y-auto px-6 pt-6 pb-4 flex flex-col gap-5">
      {messages.map((msg, idx) => {
        // The empty assistant placeholder added at the start of streaming is
        // visually covered by the typing indicator — skip it to avoid a double row.
        if (msg.role === 'assistant' && msg.content === '') return null;

        if (msg.role === 'assistant') {
          const { thinking, response, thinkingComplete } = parseThinking(msg.content);
          return (
            <div key={idx} className="flex gap-3 max-w-[780px] w-full self-start">
              <div className="w-[30px] h-[30px] rounded-[var(--radius-sm)] flex-shrink-0 grid place-items-center text-[0.7rem] font-bold font-[var(--font-heading)] bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--accent)] mt-0.5">
                <AssistantIcon />
              </div>
              <div className="msg-bubble--markdown px-4 py-2.5 rounded-2xl rounded-bl-[var(--radius-sm)] text-[0.9375rem] leading-relaxed max-w-[600px] word-break bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-primary)]">
                {thinking && (
                  <ThinkingBlock thinking={thinking} thinkingComplete={thinkingComplete} />
                )}
                {response && (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{response}</ReactMarkdown>
                )}
              </div>
            </div>
          );
        }

        return (
          <div key={idx} className="flex gap-3 max-w-[780px] w-full self-end flex-row-reverse">
            <div className="w-[30px] h-[30px] rounded-[var(--radius-sm)] flex-shrink-0 grid place-items-center text-[0.7rem] font-bold font-[var(--font-heading)] bg-[var(--accent)] text-white mt-0.5">
              U
            </div>
            <div className="px-4 py-2.5 rounded-2xl rounded-br-[var(--radius-sm)] text-[0.9375rem] leading-relaxed max-w-[600px] break-words whitespace-pre-wrap bg-[var(--accent)] text-white">
              {msg.content}
            </div>
          </div>
        );
      })}

      {/* Status indicator while waiting for first token */}
      {streaming && streamingContent === '' && (
        <div className="flex gap-3 max-w-[780px] w-full self-start">
          <div className="w-[30px] h-[30px] rounded-[var(--radius-sm)] flex-shrink-0 grid place-items-center text-[0.7rem] font-bold bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--accent)] mt-0.5">
            <AssistantIcon />
          </div>
          {loadingPhase && phaseLabel(loadingPhase, loadingProgress) ? (
            <div className="typing-status">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-status-text">{phaseLabel(loadingPhase, loadingProgress)}</span>
            </div>
          ) : (
            <div className="typing-indicator">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          )}
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
