import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useConversations } from '../../context/ConversationContext';
import { useModels } from '../../context/ModelsContext';
import { ThemeToggle } from '../ThemeToggle';
import { buildChatPath } from '../../lib/routes';
import { Plus, X } from 'lucide-react';

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (urlModel) setSelectedModel(urlModel);
  }, [searchParams]);

  // Auto-select the first model once the list loads
  useEffect(() => {
    if (!selectedModel && models.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
    <aside className="w-(--sidebar-width) flex flex-col h-full border-r border-(--border) bg-(--bg-surface) shrink-0 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-(--border) flex flex-col gap-3 shrink-0">
        <div className="text-[0.7rem] uppercase tracking-[0.24em] text-(--text-muted) font-semibold px-1">
          Chats
        </div>
        <div className="rounded-xl border border-(--border) bg-(--bg-elevated) p-2">
          <div className="flex flex-col items-stretch gap-2">
            {models.length > 0 && (
              <select
                className="w-full px-3 py-2 bg-(--bg-surface) border border-(--border) rounded-md text-(--text-primary) text-[0.78rem] outline-none cursor-pointer transition-colors focus:border-(--border-focus)"
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
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md bg-(--accent) text-white hover:opacity-90 transition-opacity cursor-pointer border-0 outline-none disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={handleNewChat}
              disabled={!selectedModel}
            >
              <Plus size={13} />
              New chat
            </button>
          </div>
        </div>
      </div>

      {/* Conversation list */}
      <div className="chat-conv-list flex-1 overflow-y-auto py-2">
        {conversations.length === 0 ? (
          <p className="text-[0.8rem] text-(--text-muted) px-2 py-4 text-center">
            No conversations yet
          </p>
        ) : (
          <>
            <div className="px-4 py-1 text-[0.7rem] font-semibold tracking-widest uppercase text-(--text-muted)">
              Recent
            </div>
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`flex items-center gap-2 px-3 py-2 mx-1 rounded-lg cursor-pointer hover:bg-(--bg-elevated) transition-colors group${activeId === conv.id ? ' bg-(--bg-elevated)' : ''}`}
                onClick={() => handleSelectConv(conv.id, conv.model)}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-(--text-primary) truncate">{conv.title}</div>
                  <div className="text-xs text-(--text-muted)">
                    {relativeDate(conv.updated_at)}
                  </div>
                </div>
                <button
                  className="ml-auto opacity-0 group-hover:opacity-100 p-1 rounded text-(--text-muted) hover:text-(--danger) transition-all bg-transparent border-0 leading-none shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation(conv.id);
                  }}
                  title="Delete conversation"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-(--border) flex items-center gap-2 shrink-0">
        <span className="text-[0.78rem] text-(--text-muted) flex-1">
          {conversations.length} conversation
          {conversations.length !== 1 ? 's' : ''}
        </span>
        <ThemeToggle />
      </div>
    </aside>
  );
}
