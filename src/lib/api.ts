import type {
  ChatEventRequest,
  ChatMessage,
  ChatSession,
  LoadedDevice,
  LoadingStatus,
  ParallelismTarget,
  StorageChunkSize,
} from '../types/ui';
import { customChatCompletionsUrl, apiRoutes, chatEventsUrl } from './routes';

export type StreamNode = {
  ip: string;
  port: number;
  storage_port: number;
  max_size: number;
  nickname?: string;
  hardware_model: string;
  battery: number;
  temperature: number;
};

export type ChatStreamEvent =
  | { type: 'nodes'; nodes: StreamNode[] }
  | { type: 'status'; phase: string; percentage: number }
  | { type: 'token'; token: string };

export function streamNodesToLoadedDevices(nodes: StreamNode[]): LoadedDevice[] {
  return nodes.map((node) => ({
    id: `${node.ip}:${node.port}`,
    nickname: node.nickname,
    hardware_model: node.hardware_model,
  }));
}

async function readErrorMessage(response: Response): Promise<string> {
  const text = await response.text();
  if (!text) {
    return `Request failed with status ${response.status}`;
  }
  try {
    const parsed = JSON.parse(text) as { error?: unknown; message?: unknown };
    if (typeof parsed.error === 'string' && parsed.error.trim()) {
      return parsed.error;
    }
    if (typeof parsed.message === 'string' && parsed.message.trim()) {
      return parsed.message;
    }
  } catch {
  }
  return text;
}

export async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(path, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
  return response.json() as Promise<T>;
}

export async function postJson<TResponse>(
  path: string,
  body: unknown
): Promise<TResponse> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
  return response.json() as Promise<TResponse>;
}

export async function postForm<TResponse>(
  path: string,
  body: FormData
): Promise<TResponse> {
  const response = await fetch(path, {
    method: 'POST',
    body,
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
  return response.json() as Promise<TResponse>;
}

export async function startChatSession(
  chatId: string,
  model: string
): Promise<ChatSession> {
  return postJson<ChatSession>(apiRoutes.uiChats, {
    chat_id: chatId,
    model,
    started_at: new Date().toISOString(),
  });
}

export async function appendChatEvent(
  chatId: string,
  event: ChatEventRequest
): Promise<void> {
  await postJson(chatEventsUrl(chatId), event);
}

export async function getLoadingStatus(model?: string): Promise<LoadingStatus> {
  const query = model ? `?model=${encodeURIComponent(model)}` : '';
  return getJson<LoadingStatus>(`/api/ui/loading-status${query}`);
}

export async function getParallelismTarget(): Promise<ParallelismTarget> {
  return getJson<ParallelismTarget>(apiRoutes.uiParallelismTarget);
}

export async function setParallelismTarget(parallelismTarget: number): Promise<ParallelismTarget> {
  return postJson<ParallelismTarget>(apiRoutes.uiParallelismTarget, {
    parallelism_target: parallelismTarget,
  });
}

export async function getStorageChunkSize(): Promise<StorageChunkSize> {
  return getJson<StorageChunkSize>(apiRoutes.uiStorageChunkSize);
}

export async function setStorageChunkSize(chunkSizeBytes: number): Promise<StorageChunkSize> {
  return postJson<StorageChunkSize>(apiRoutes.uiStorageChunkSize, {
    chunk_size_bytes: chunkSizeBytes,
  });
}


function parseChatStreamEvent(raw: unknown): ChatStreamEvent | null {
  if (!raw || typeof raw !== 'object' || !('type' in raw)) return null;
  const event = raw as { type: string };
  switch (event.type) {
    case 'nodes': {
      const nodes = (event as { nodes?: unknown }).nodes;
      if (!Array.isArray(nodes)) return null;
      return { type: 'nodes', nodes: nodes as StreamNode[] };
    }
    case 'status': {
      const phase = (event as { phase?: unknown }).phase;
      const percentage = (event as { percentage?: unknown }).percentage;
      if (typeof phase !== 'string' || typeof percentage !== 'number') return null;
      return { type: 'status', phase, percentage };
    }
    case 'token': {
      const token = (event as { token?: unknown }).token;
      if (typeof token !== 'string' || token === '') return null;
      return { type: 'token', token };
    }
    default:
      return null;
  }
}

export async function* streamChat(
  messages: ChatMessage[],
  model: string,
  signal: AbortSignal
): AsyncGenerator<ChatStreamEvent> {
  const res = await fetch(customChatCompletionsUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages }),
    signal,
  });

  if (!res.ok) throw new Error(await readErrorMessage(res));
  if (!res.body) return;

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const event = parseChatStreamEvent(JSON.parse(trimmed));
        if (event) yield event;
      } catch {
        // skip malformed JSONL line
      }
    }
  }

  const tail = buf.trim();
  if (tail) {
    try {
      const event = parseChatStreamEvent(JSON.parse(tail));
      if (event) yield event;
    } catch {
      // ignore trailing partial line
    }
  }
}
