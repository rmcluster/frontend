import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useConversations } from '../../context/ConversationContext';
import { useModels } from '../../context/ModelsContext';
import { ThemeToggle } from '../ThemeToggle';
import { buildChatPath } from '../../lib/routes';

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function ChatSidebar() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    conversations,
    activeId,
    setActiveId,
    createConversation,
    updateConversationModel,
    deleteConversation,
  } = useConversations();
  const { models } = useModels();
  const [selectedModel, setSelectedModel] = useState<string>(
    searchParams.get('model') ?? ''
  );

  // Keep dropdown in sync when URL model param changes (e.g. clicking a conversation)
  useEffect(() => {
    const urlModel = searchParams.get('model');
    if (urlModel) setSelectedModel(urlModel);
  }, [searchParams]);

  // Auto-select the first model once the list loads
  useEffect(() => {
    if (!selectedModel && models.length > 0) {
      setSelectedModel(models[0].model);
    }
  }, [models, selectedModel]);

  const handleNewChat = () => {
    const conv = createConversation(selectedModel);
    setActiveId(conv.id);
    navigate(buildChatPath(selectedModel, conv.id));
  };

  const handleSelectConv = (id: string, model: string) => {
    setActiveId(id);
    navigate(buildChatPath(model, id));
  };

  return (
    <aside className="w-[var(--sidebar-width)] flex flex-col h-full border-r border-[var(--border)] bg-[var(--bg-surface)] flex-shrink-0 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border)] flex flex-col gap-3 flex-shrink-0">
        <div className="text-[0.7rem] uppercase tracking-[0.24em] text-[var(--text-muted)] font-semibold px-1">
          Chats
        </div>
        <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-elevated)] p-2">
          <div className="flex flex-col items-stretch gap-2">
            {models.length > 0 && (
              <select
                className="w-full px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[var(--text-primary)] text-[0.78rem] outline-none cursor-pointer transition-colors focus:border-[var(--border-focus)]"
                value={selectedModel}
                onChange={(e) => {
                  const newModel = e.target.value;
                  setSelectedModel(newModel);
                  const activeConv = conversations.find((c) => c.id === activeId);
                  const hasMessages = (activeConv?.messages.length ?? 0) > 0;
                  if (!hasMessages) {
                    if (activeId && activeConv) {
                      // Reuse the existing empty conversation — just swap its model
                      updateConversationModel(activeId, newModel);
                      navigate(buildChatPath(newModel, activeId));
                    } else {
                      navigate(buildChatPath(newModel));
                    }
                  }
                }}
              >
                {models.map((m) => (
                  <option key={m.model} value={m.model}>
                    {m.display_name}
                  </option>
                ))}
              </select>
            )}
            <button
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-[var(--radius-md)] bg-[var(--accent)] text-white hover:opacity-90 transition-opacity cursor-pointer border-0 outline-none disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={handleNewChat}
              disabled={!selectedModel}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New chat
            </button>
          </div>
        </div>
      </div>

      {/* Conversation list */}
      <div className="chat-conv-list flex-1 overflow-y-auto py-2">
        {conversations.length === 0 ? (
          <p className="text-[0.8rem] text-[var(--text-muted)] px-2 py-4 text-center">
            No conversations yet
          </p>
        ) : (
          <>
            <div className="px-4 py-1 text-[0.7rem] font-semibold tracking-widest uppercase text-[var(--text-muted)]">
              Recent
            </div>
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`flex items-center gap-2 px-3 py-2 mx-1 rounded-lg cursor-pointer hover:bg-[var(--bg-elevated)] transition-colors group${activeId === conv.id ? ' bg-[var(--bg-elevated)]' : ''}`}
                onClick={() => handleSelectConv(conv.id, conv.model)}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-[var(--text-primary)] truncate">{conv.title}</div>
                  <div className="text-xs text-[var(--text-muted)]">
                    {relativeDate(conv.updated_at)}
                  </div>
                </div>
                <button
                  className="ml-auto opacity-0 group-hover:opacity-100 p-1 rounded text-[var(--text-muted)] hover:text-[var(--danger)] transition-all bg-transparent border-0 leading-none flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation(conv.id);
                  }}
                  title="Delete conversation"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-[var(--border)] flex items-center gap-2 flex-shrink-0">
        <span className="text-[0.78rem] text-[var(--text-muted)] flex-1">
          {conversations.length} conversation
          {conversations.length !== 1 ? 's' : ''}
        </span>
        <ThemeToggle />
      </div>
    </aside>
  );
}
