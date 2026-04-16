import { useRef } from 'react';
import type { KeyboardEvent } from 'react';

type ChatComposerProps = {
  onSend: (content: string) => void;
  onStop: () => void;
  disabled: boolean;
  streaming: boolean;
};

export function ChatComposer({ onSend, onStop, disabled, streaming }: ChatComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    const val = textareaRef.current?.value.trim() ?? '';
    if (!val || disabled) return;
    onSend(val);
    if (textareaRef.current) {
      textareaRef.current.value = '';
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      submit();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  };

  return (
    <div className="chat-composer-wrap">
      <div className="chat-composer">
        <textarea
          ref={textareaRef}
          className="chat-composer-textarea"
          placeholder="Ask anything… (Ctrl+Enter to send)"
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          rows={1}
          disabled={disabled && !streaming}
        />
        {streaming ? (
          <button
            type="button"
            className="chat-composer-send chat-composer-stop"
            onClick={onStop}
            title="Stop generating"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          </button>
        ) : (
          <button
            type="button"
            className="chat-composer-send"
            onClick={submit}
            disabled={disabled}
            title="Send message (Ctrl+Enter)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        )}
      </div>
      <p className="composer-hint">Ctrl+Enter to send · rmcluster</p>
    </div>
  );
}
