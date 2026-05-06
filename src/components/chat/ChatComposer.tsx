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
    <div className="px-6 pb-4 flex-shrink-0 border-t border-[var(--border-subtle)] bg-[var(--bg-base)]">
      <div className="flex items-end gap-3 bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-xl)] px-5 py-3 focus-within:border-[var(--border-focus)] focus-within:shadow-[0_0_0_3px_var(--accent-dim)] transition-all max-w-[780px] mx-auto">
        <textarea
          ref={textareaRef}
          className="chat-composer-textarea flex-1 resize-none border-0 outline-none bg-transparent text-[0.9375rem] text-[var(--text-primary)] leading-relaxed max-h-[180px] overflow-y-auto p-0 placeholder:text-[var(--text-muted)]"
          placeholder="Ask anything… (Ctrl+Enter to send)"
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          rows={1}
          disabled={disabled && !streaming}
        />
        {streaming ? (
          <button
            type="button"
            className="flex-shrink-0 w-9 h-9 rounded-[var(--radius-md)] bg-[var(--danger-dim)] text-[var(--danger)] border border-[var(--danger-dim)] grid place-items-center hover:bg-[var(--danger)] hover:text-white transition-colors"
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
            className="flex-shrink-0 w-9 h-9 rounded-[var(--radius-md)] bg-[var(--accent)] text-white border-0 grid place-items-center hover:bg-[var(--accent-hover)] hover:scale-105 transition-all disabled:opacity-35 disabled:cursor-not-allowed disabled:scale-100"
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
      <p className="text-center text-[0.7rem] text-[var(--text-muted)] mt-2 font-[var(--font-mono)]">
        Ctrl+Enter to send · rmcluster
      </p>
    </div>
  );
}
