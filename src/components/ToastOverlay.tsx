import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { useChatStreaming } from '../context/ChatStreamingContext';
import { useConversations } from '../context/ConversationContext';
import { buildChatPath } from '../lib/routes';

export function ToastOverlay() {
  const { toasts, dismissToast } = useChatStreaming();
  const { conversations } = useConversations();
  const navigate = useNavigate();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => {
        const conv = conversations.find((c) => c.id === toast.convId);
        const title = conv?.title ?? toast.convTitle;
        const model = conv?.model ?? toast.model;

        return (
          <div
            key={toast.id}
            className="pointer-events-auto bg-(--bg-surface) border border-(--border) rounded-xl shadow-lg px-4 py-3 flex items-center gap-3 w-96"
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs text-(--text-muted) mb-0.5">Response finished</p>
              <p className="text-sm font-medium text-(--text-primary) truncate">{title}</p>
              <p className="text-xs text-(--text-muted) font-mono truncate">{model}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => {
                  navigate(buildChatPath(model, toast.convId));
                  dismissToast(toast.id);
                }}
                className="px-2.5 py-1 text-xs font-medium rounded-md bg-(--accent) text-white hover:opacity-90 transition-opacity cursor-pointer border-0 outline-none"
              >
                View
              </button>
              <button
                onClick={() => dismissToast(toast.id)}
                className="p-1 rounded text-(--text-muted) hover:text-(--text-primary) transition-colors cursor-pointer bg-transparent border-0 outline-none"
              >
                <X size={13} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
