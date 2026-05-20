import { useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { Square, Send } from 'lucide-react';

const MIN_COMPOSER_HEIGHT = 40;

type ChatComposerProps = {
  onSend: (content: string) => void;
  onStop: () => void;
  disabled: boolean;
  streaming: boolean;
  nodeCount?: number;
};

export function ChatComposer({ onSend, onStop, disabled, streaming, nodeCount = 0 }: ChatComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    const val = textareaRef.current?.value.trim() ?? '';
    if (!val || disabled) return;
    onSend(val);
    if (textareaRef.current) {
      textareaRef.current.value = '';
      textareaRef.current.style.height = `${MIN_COMPOSER_HEIGHT}px`;
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
    el.style.height = `${Math.max(MIN_COMPOSER_HEIGHT, Math.min(el.scrollHeight, 180))}px`;
  };

  return (
    <div className="px-6 pt-4 pb-4 shrink-0 border-t border-(--border-subtle) bg-(--bg-base)">
      <div className="flex items-end gap-3 bg-(--bg-surface) border border-(--border) rounded-xl px-5 py-3 focus-within:border-(--border-focus) focus-within:shadow-[0_0_0_3px_var(--accent-dim)] transition-all max-w-195 mx-auto">
        <textarea
          ref={textareaRef}
          className="chat-composer-textarea flex-1 resize-none border-0 outline-none bg-transparent text-[0.9375rem] text-(--text-primary) leading-5 min-h-10 max-h-45 overflow-y-auto py-2.5 px-0 placeholder:text-(--text-muted)"
          placeholder="Ask anything… (Ctrl+Enter to send)"
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          rows={1}
          disabled={disabled && !streaming}
        />
        {streaming ? (
          <button
            type="button"
            className="shrink-0 w-9 h-9 rounded-md bg-(--danger-dim) text-(--danger) border border-(--danger-dim) grid place-items-center hover:bg-(--danger) hover:text-white transition-colors"
            onClick={onStop}
            title="Stop generating"
          >
            <Square size={14} fill="currentColor" />
          </button>
        ) : (
          <button
            type="button"
            className="shrink-0 w-9 h-9 rounded-md bg-(--accent) text-white border-0 grid place-items-center hover:bg-(--accent-hover) hover:scale-105 transition-all disabled:opacity-35 disabled:cursor-not-allowed disabled:scale-100"
            onClick={submit}
            disabled={disabled}
            title="Send message (Ctrl+Enter)"
          >
            <Send size={14} />
          </button>
        )}
      </div>
      <p className="text-center text-[0.7rem] text-(--text-muted) mt-2 font-(--font-mono)">
        Ctrl+Enter to send · {nodeCount === 1 ? '1 node' : `${nodeCount} nodes`}
      </p>
    </div>
  );
}
