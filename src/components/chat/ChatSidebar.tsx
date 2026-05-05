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
    <aside className="chat-sidebar">
      <div className="chat-sidebar-header">
        <div className="chat-sidebar-brand">
          <span className="chat-sidebar-logo" aria-hidden="true">
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
              <circle cx="4" cy="4" r="2.5" fill="white" />
              <circle cx="10" cy="4" r="2.5" fill="rgba(255,255,255,0.5)" />
              <circle cx="4" cy="10" r="2.5" fill="rgba(255,255,255,0.5)" />
              <circle cx="10" cy="10" r="2.5" fill="rgba(255,255,255,0.3)" />
            </svg>
          </span>
          rmcluster
        </div>
        <button className="btn btn-primary w-full" onClick={handleNewChat}>
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

      {/* Model selector */}
      {models.length > 0 && (
        <div
          style={{
            padding: 'var(--space-2) var(--space-3)',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <select
            className="chat-sidebar-model-select"
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
        </div>
      )}

      {/* Conversation list */}
      <div className="chat-conv-list">
        {conversations.length === 0 ? (
          <p
            style={{
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              padding: 'var(--space-4) var(--space-2)',
              textAlign: 'center',
            }}
          >
            No conversations yet
          </p>
        ) : (
          <>
            <div className="conv-section-label">Recent</div>
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`conv-item${activeId === conv.id ? ' active' : ''}`}
                onClick={() => handleSelectConv(conv.id, conv.model)}
              >
                <div className="conv-item-text">
                  <div className="conv-title">{conv.title}</div>
                  <div className="conv-date">
                    {relativeDate(conv.updated_at)}
                  </div>
                </div>
                <button
                  className="conv-delete"
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
      <div className="chat-sidebar-footer">
        <span
          style={{ fontSize: '0.78rem', color: 'var(--text-muted)', flex: 1 }}
        >
          {conversations.length} conversation
          {conversations.length !== 1 ? 's' : ''}
        </span>
        <ThemeToggle />
      </div>
    </aside>
  );
}
