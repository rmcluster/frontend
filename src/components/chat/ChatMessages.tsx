import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage } from '../../types/ui';
import { ClusterIcon } from '../../icons/ClusterIcon';

type ChatMessagesProps = {
  messages: ChatMessage[];
  streaming: boolean;
  streamingContent: string;
  loadingPhase?: string;
  loadingProgress?: number;
  layersOnRpc?: number;
};

function phaseLabel(phase: string, progress: number): string {
  switch (phase) {
    case 'starting':
      return 'Starting instance…';
    case 'initializing':
      return 'Connecting to nodes…';
    case 'downloading':
      return progress > 0
        ? `Downloading model… ${progress.toFixed(1)}%`
        : 'Downloading model…';
    case 'loading_model':
      return 'Loading model into memory…';
    case 'warming_up':
      return 'Warming up…';
    default:
      return '';
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
  const [open, setOpen] = useState(true);
  const prevComplete = useRef(false);
  useEffect(() => {
    if (thinkingComplete && !prevComplete.current) {
      prevComplete.current = true;
      setOpen(false);
    }
  }, [thinkingComplete]);

  return (
    <details
      className="thinking-block"
      open={open}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="thinking-summary">
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="thinking-chevron"
        >
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

// Shared class strings to avoid repetition
const assistantAvatar =
  'w-7.5 h-7.5 rounded-sm shrink-0 grid place-items-center text-[0.7rem] font-(--font-heading) bg-(--bg-elevated) border border-(--border) text-(--accent) mt-0.5';
const assistantBubble =
  'msg-bubble--markdown px-4 py-2.5 rounded-2xl rounded-bl-sm text-[0.9375rem] leading-relaxed max-w-150 word-break bg-(--bg-surface) border border-(--border) text-(--text-primary)';

export function ChatMessages({
  messages,
  streaming,
  streamingContent,
  loadingPhase,
  loadingProgress = 0,
  layersOnRpc = 0,
}: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, streamingContent]);

  if (messages.length === 0 && !streaming) {
    return (
      <div className="chat-messages flex-1 overflow-y-auto px-6 pt-6 pb-4 flex flex-col gap-5" />
    );
  }

  return (
    <div className="chat-messages flex-1 overflow-y-auto px-6 pt-6 pb-4 flex flex-col gap-5">
      {messages.map((msg, idx) => {
        if (msg.role === 'system') return null;

        // The empty assistant placeholder added at the start of streaming is
        // visually covered by the typing indicator — skip it to avoid a double row.
        if (msg.role === 'assistant' && msg.content === '') return null;

        if (msg.role === 'assistant') {
          const { thinking, response, thinkingComplete } = parseThinking(
            msg.content
          );
          return (
            <div key={idx} className="flex gap-3 max-w-195 w-full self-start">
              <div className={assistantAvatar}>
                <ClusterIcon />
              </div>
              <div className="flex flex-col gap-1.5 min-w-0">
                <div className={assistantBubble}>
                  {thinking && (
                    <ThinkingBlock
                      thinking={thinking}
                      thinkingComplete={thinkingComplete}
                    />
                  )}
                  {response && (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {response}
                    </ReactMarkdown>
                  )}
                </div>
                {msg.tokensPerSec != null && (
                  <span className="text-xs text-(--text-muted) font-(--font-mono) px-1">
                    {msg.tokensPerSec.toFixed(1)} tok/s
                  </span>
                )}
              </div>
            </div>
          );
        }

        return (
          <div
            key={idx}
            className="flex gap-3 max-w-195 w-full self-end flex-row-reverse"
          >
            <div className="w-7.5 h-7.5 rounded-sm shrink-0 grid place-items-center text-[0.7rem] font-(--font-heading) bg-(--accent) text-white mt-0.5">
              U
            </div>
            <div className="px-4 py-2.5 rounded-2xl rounded-br-sm text-[0.9375rem] leading-relaxed max-w-150 wrap-break-word whitespace-pre-wrap bg-(--accent) text-white">
              {msg.content}
            </div>
          </div>
        );
      })}
      {/* Status indicator while waiting for first token */}
      {streaming && streamingContent === '' && (
        <div className="flex gap-3 max-w-195 w-full self-start">
          <div className="w-7.5 h-7.5 rounded-sm shrink-0 grid place-items-center text-[0.7rem] bg-(--bg-elevated) border border-(--border) text-(--accent) mt-0.5">
            <ClusterIcon />
          </div>
          {loadingPhase && phaseLabel(loadingPhase, loadingProgress) ? (
            <div className="typing-status">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-status-text">
                {phaseLabel(loadingPhase, loadingProgress)}
                {layersOnRpc > 0 && ` · ${layersOnRpc} layers on RPC nodes`}
              </span>
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
