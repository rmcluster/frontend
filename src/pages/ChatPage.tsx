import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useConversations } from '../context/ConversationContext';
import {
  appendChatEvent,
  getAllocations,
  getLoadingStatus,
  getParallelismTarget,
  setParallelismTarget,
  startChatSession,
  streamChat,
} from '../lib/api';
import { useModels } from '../context/ModelsContext';
import { buildChatPath } from '../lib/routes';
import { ChatComposer } from '../components/chat/ChatComposer';
import { ChatMessages } from '../components/chat/ChatMessages';
import { buildRequestHistory, chooseDefaultModel } from './chatPageLogic';

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
    appendMessage,
    updateLastMessage,
  } = useConversations();

  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [loadingPhase, setLoadingPhase] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [layersOffloaded, setLayersOffloaded] = useState(0);
  const [nodeCount, setNodeCount] = useState(0);
  const [parallelismTarget, setParallelismTargetValue] = useState(1);
  const [parallelismDraft, setParallelismDraft] = useState('1');
  const [parallelismError, setParallelismError] = useState('');
  const [allocatedDevices, setAllocatedDevices] = useState<string[]>([]);
  const firstTokenTimeRef = useRef<number | null>(null);
  const tokenCountRef = useRef(0);
  const { models } = useModels();
  const [thinkingEnabled, setThinkingEnabled] = useState<boolean>(() => {
    try { return localStorage.getItem('rmcluster_thinking') !== 'false'; }
    catch { return true; }
  });
  const abortRef = useRef<AbortController | null>(null);

  const toggleThinking = () => {
    setThinkingEnabled((prev) => {
      const next = !prev;
      try { localStorage.setItem('rmcluster_thinking', String(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const defaultModel = chooseDefaultModel(models);
  const activeConv = conversations.find((c) => c.id === activeId) ?? null;
  const messages = activeConv?.messages ?? [];
  const model = activeConv?.model ?? modelParam ?? defaultModel;

  // Keep the scheduler target in sync with the server.
  useEffect(() => {
    void getParallelismTarget()
      .then((value) => {
        setParallelismTargetValue(value.parallelism_target);
        setParallelismDraft(String(value.parallelism_target));
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    setParallelismDraft(String(parallelismTarget));
  }, [parallelismTarget]);

  // Always-on slow poll for node count.
  useEffect(() => {
    const fetchStatus = () => {
      void getLoadingStatus().then((s) => setNodeCount(s.node_count)).catch(() => undefined);
    };
    fetchStatus();
    const id = setInterval(fetchStatus, 5000);
    return () => clearInterval(id);
  }, []);

  // Fast poll for loading phase only while streaming with no tokens yet.
  // Once the first token arrives (streamingContent !== '') stop immediately.
  useEffect(() => {
    if (!streaming) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoadingPhase('');
      return;
    }
    if (streamingContent !== '') {
      // Tokens are flowing — no need to show a loading phase any more
      setLoadingPhase('');
      return;
    }
    const id = setInterval(() => {
      void getLoadingStatus()
        .then((s) => {
          setLoadingPhase(s.phase);
          setLoadingProgress(s.progress);
          setLayersOffloaded(s.layers_offloaded || s.layers_on_gpu);
          setNodeCount(s.node_count);
        })
        .catch(() => undefined);
    }, 1200);
    return () => clearInterval(id);
  }, [streaming, streamingContent]);

  useEffect(() => {
    const activeModel = activeConv?.model ?? modelParam;
    if (!activeModel) {
      setAllocatedDevices([]);
      return;
    }

    const fetchAllocations = () => {
      void getAllocations(activeModel)
        .then((response) => {
          setAllocatedDevices(
            response.devices.map((device) =>
              device.hardware_model
                ? `${device.hardware_model} (${device.node_id})`
                : device.label
            )
          );
        })
        .catch(() => undefined);
    };

    fetchAllocations();
    const id = setInterval(fetchAllocations, streaming ? 1500 : 5000);
    return () => clearInterval(id);
  }, [activeConv?.model, modelParam, streaming]);

  // Resolve active conversation on mount / when model or conv params change
  useEffect(() => {
    if (convParam) {
      const found = conversations.find((c) => c.id === convParam);
      if (found) {
        setActiveId(found.id);
        return;
      }
    }
    if (!modelParam) {
      navigate(buildChatPath(defaultModel), { replace: true });
      return;
    }
    const conv = createConversation(modelParam || defaultModel);
    setActiveId(conv.id);
    // Stamp the conv ID into the URL so re-renders don't create duplicate conversations
    navigate(buildChatPath(modelParam || defaultModel, conv.id), { replace: true });
    // Register the session server-side (best-effort)
    void startChatSession(conv.id, modelParam || defaultModel).catch(() => undefined);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convParam, modelParam, models.length, defaultModel]);

  const thinkingSupported = models.find((m) => m.model === model)?.supports_thinking ?? false;
  const maxTargetNodes = nodeCount;

  const submitParallelismTarget = async () => {
    const next = Number(parallelismDraft);
    if (!Number.isInteger(next)) {
      setParallelismError('Enter a whole number.');
      return;
    }
    if (maxTargetNodes < 1) {
      setParallelismError('No nodes connected.');
      return;
    }
    if (next < 1 || next > maxTargetNodes) {
      setParallelismError(`Enter a value between 1 and ${maxTargetNodes}.`);
      return;
    }

    setParallelismError('');
    try {
      const response = await setParallelismTarget(next);
      setParallelismTargetValue(response.parallelism_target);
      setParallelismDraft(String(response.parallelism_target));
    } catch (error) {
      setParallelismError(error instanceof Error ? error.message : 'Unable to update target.');
    }
  };

  const handleSend = async (content: string) => {
    if (!content.trim() || streaming) return;

    const convId = activeId;
    if (!convId) return;

    appendMessage(convId, { role: 'user', content });
    appendMessage(convId, { role: 'assistant', content: '' });

    void appendChatEvent(convId, {
      event_type: 'message_sent',
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    }).catch(() => undefined);

    const controller = new AbortController();
    abortRef.current = controller;
    setStreaming(true);
    setStreamingContent('');
    firstTokenTimeRef.current = null;
    tokenCountRef.current = 0;

    const history = buildRequestHistory(activeConv?.messages ?? [], content, thinkingEnabled);

    let assistantContent = '';

    const attemptStream = async (isRetry: boolean) => {
      if (isRetry) {
        await new Promise((r) => setTimeout(r, 2000));
        if (controller.signal.aborted) return false;
      }
      for await (const token of streamChat(history, model, controller.signal)) {
        if (firstTokenTimeRef.current === null) firstTokenTimeRef.current = Date.now();
        tokenCountRef.current += 1;
        assistantContent += token;
        setStreamingContent(assistantContent);
      }
      return true;
    };

    try {
      let succeeded = await attemptStream(false);
      if (!succeeded) throw new DOMException('Aborted', 'AbortError');

      // If no content was received the model likely wasn't ready yet — retry once
      if (assistantContent === '') {
        succeeded = await attemptStream(true);
        if (!succeeded) throw new DOMException('Aborted', 'AbortError');
      }

      const tps = (firstTokenTimeRef.current !== null && tokenCountRef.current > 0)
        ? tokenCountRef.current / ((Date.now() - firstTokenTimeRef.current) / 1000)
        : undefined;
      updateLastMessage(convId, () => assistantContent, tps);
      void appendChatEvent(convId, {
        event_type: 'message_completed',
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date().toISOString(),
      }).catch(() => undefined);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        // First attempt threw — retry once before surfacing the error
        try {
          await attemptStream(true);
          const tps = (firstTokenTimeRef.current !== null && tokenCountRef.current > 0)
            ? tokenCountRef.current / ((Date.now() - firstTokenTimeRef.current) / 1000)
            : undefined;
          updateLastMessage(convId, () => assistantContent, tps);
          void appendChatEvent(convId, {
            event_type: 'message_completed',
            role: 'assistant',
            content: assistantContent,
            timestamp: new Date().toISOString(),
          }).catch(() => undefined);
        } catch (retryErr) {
          if ((retryErr as Error).name !== 'AbortError') {
            updateLastMessage(convId, (prev) =>
              prev || '_(Error: could not reach model server)_'
            );
            void appendChatEvent(convId, {
              event_type: 'stream_error',
              error: (retryErr as Error).message,
              timestamp: new Date().toISOString(),
            }).catch(() => undefined);
          }
        }
      }
    } finally {
      setStreaming(false);
      setStreamingContent('');
      abortRef.current = null;
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
  };

  const title = activeConv?.title ?? 'New conversation';
  const modelLabel = model || defaultModel;

  return (
    <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
      {/* Topbar */}
      <div className="flex items-center justify-between px-6 min-h-14 py-2 border-b border-[var(--border)] flex-shrink-0 gap-4">
        <div className="min-w-0">
          <div className="font-[var(--font-heading)] text-sm font-semibold text-[var(--text-primary)] truncate">
            {title}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <div className="flex flex-col items-end gap-1">
            <label className="text-xs text-[var(--text-muted)] flex items-center gap-2">
              <span>Target nodes</span>
              <input
                type="number"
                min={maxTargetNodes > 0 ? 1 : undefined}
                max={maxTargetNodes > 0 ? maxTargetNodes : undefined}
                step={1}
                inputMode="numeric"
                className="w-16 px-2 py-1 bg-[var(--bg-elevated)] border border-[var(--border)] rounded text-[var(--text-primary)]"
                value={parallelismDraft}
                disabled={maxTargetNodes < 1}
                onChange={(e) => {
                  setParallelismDraft(e.target.value);
                  setParallelismError('');
                }}
                onBlur={() => { void submitParallelismTarget(); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void submitParallelismTarget();
                  }
                }}
              />
            </label>
            <div className="text-[8px] text-[var(--text-muted)] text-right">
              {parallelismError || (maxTargetNodes > 0
                ? `${maxTargetNodes} connected`
                : 'No nodes connected')}
            </div>
          </div>
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
          <div className="text-xs text-[var(--text-muted)] font-[var(--font-mono)] px-2 py-0.5 bg-[var(--bg-elevated)] border border-[var(--border)] rounded">
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
        layersOffloaded={layersOffloaded}
        allocatedDevices={allocatedDevices}
      />
      <ChatComposer
        onSend={(content) => void handleSend(content)}
        onStop={handleStop}
        disabled={streaming}
        streaming={streaming}
        nodeCount={nodeCount}
      />
    </div>
  );
}
