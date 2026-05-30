import type {
  ChatEventRequest,
  ChatSession,
  ParallelismTarget,
  StorageChunkSize,
} from '../types/ui';
import { chatCompletionsUrl, apiRoutes, chatEventsUrl } from './routes';

export async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(path, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(await response.text());
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
    throw new Error(await response.text());
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
    throw new Error(await response.text());
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

export async function getLoadingStatus(): Promise<{ model: string; phase: string; progress: number; layers_on_gpu: number; node_count: number }> {
  return getJson<{ model: string; phase: string; progress: number; layers_on_gpu: number; node_count: number }>('/api/ui/loading-status');
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


export async function* streamChat(
  messages: ChatMessage[],
  model: string,
  signal: AbortSignal
): AsyncGenerator<string> {
  const res = await fetch(chatCompletionsUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: true }),
    signal,
  });

  if (!res.ok) throw new Error(await res.text());
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
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') return;
      try {
        const parsed = JSON.parse(data) as {
          choices: Array<{ delta: { content?: string } }>;
        };
        const delta = parsed.choices[0]?.delta?.content;
        if (delta) yield delta;
      } catch {
        // skip malformed SSE line
      }
    }
  }
}
