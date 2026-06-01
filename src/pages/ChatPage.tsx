import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useConversations } from '../context/ConversationContext';
import { startChatSession } from '../lib/api';
import { useModels } from '../context/ModelsContext';
import { buildChatPath } from '../lib/routes';
import { useChatStreaming } from '../context/ChatStreamingContext';
import { ChatComposer } from '../components/chat/ChatComposer';
import { ChatMessages } from '../components/chat/ChatMessages';
import type { ChatMessage } from '../types/ui';

const emptyStream = {
  streaming: false,
  streamingContent: '',
  loadingPhase: '',
  loadingProgress: 0,
  layersOnRpc: 0,
};

export function ChatPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const modelParam = searchParams.get('model') ?? '';
  const convParam = searchParams.get('conv') ?? '';

  const {
    conversations,
    activeId,
    setActiveId,
    createConversation,
  } = useConversations();

  const { streams, nodeCount, startStream, stopStream } = useChatStreaming();
  const { models } = useModels();

  const [thinkingEnabled, setThinkingEnabled] = useState<boolean>(() => {
    try { return localStorage.getItem('rmcluster_thinking') !== 'false'; }
    catch { return true; }
  });

  // Sync active conversation from URL — never auto-create, lazy-create on first send
  useEffect(() => {
    if (convParam) {
      const found = conversations.find((c) => c.id === convParam);
      if (found) { setActiveId(found.id); return; }
    }
    setActiveId(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convParam]);

  // Clear activeId when navigating away so background streams can fire toasts
  useEffect(() => {
    return () => setActiveId(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeConv = conversations.find((c) => c.id === activeId) ?? null;
  const messages = activeConv?.messages ?? [];
  const model = activeConv?.model ?? modelParam;

  const { streaming, streamingContent, loadingPhase, loadingProgress, layersOnRpc } =
    (activeId ? streams[activeId] : null) ?? emptyStream;

  const thinkingSupported = models.find((m) => m.model === model)?.supports_thinking ?? false;

  const toggleThinking = () => {
    setThinkingEnabled((prev) => {
      const next = !prev;
      try { localStorage.setItem('rmcluster_thinking', String(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const handleSend = (content: string) => {
    if (!content.trim() || streaming || !model) return;

    let convId = activeId;
    let prevMessages: ChatMessage[] = activeConv?.messages ?? [];
    let convTitle = activeConv?.title ?? 'New conversation';

    if (!convId) {
      // No conversation yet — create one lazily on first send
      const newConv = createConversation(model);
      setActiveId(newConv.id);
      navigate(buildChatPath(model, newConv.id), { replace: true });
      void startChatSession(newConv.id, model).catch(() => undefined);
      convId = newConv.id;
      prevMessages = [];
      convTitle = 'New conversation';
    }

    startStream({ convId, model, content, prevMessages, thinkingEnabled, convTitle });
  };

  const handleStop = () => {
    if (activeId) stopStream(activeId);
  };

  const title = activeConv?.title ?? 'New conversation';
  const modelLabel = model || 'No model';

  return (
    <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
      {/* Topbar */}
      <div className="flex items-center justify-between px-6 h-14 border-b border-(--border) shrink-0">
        <div className="font-(--font-heading) text-sm text-(--text-primary)">
          {title}
        </div>
        <div className="flex items-center gap-2">
          {thinkingSupported && (
            <label
              className="thinking-toggle"
              title={thinkingEnabled ? 'Thinking mode on — click to disable' : 'Thinking mode off — click to enable'}
            >
              <input
                type="checkbox"
                checked={thinkingEnabled}
                onChange={toggleThinking}
                style={{ display: 'none' }}
              />
              <span className={`thinking-toggle-track${thinkingEnabled ? ' on' : ''}`}>
                <span className="thinking-toggle-thumb" />
              </span>
              <span className="thinking-toggle-label">Think</span>
            </label>
          )}
          <div className="text-xs text-(--text-muted) font-(--font-mono) px-2 py-0.5 bg-(--bg-elevated) border border-(--border) rounded">
            {modelLabel}
          </div>
        </div>
      </div>
      <ChatMessages
        messages={messages}
        streaming={streaming}
        streamingContent={streamingContent}
        loadingPhase={loadingPhase}
        loadingProgress={loadingProgress}
        layersOnRpc={layersOnRpc}
      />
      <ChatComposer
        onSend={handleSend}
        onStop={handleStop}
        disabled={streaming}
        streaming={streaming}
        nodeCount={nodeCount}
      />
    </div>
  );
}
