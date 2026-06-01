import type {
  ChatEventRequest,
  ChatRunSnapshot,
  ChatRunStreamEvent,
  ChatSession,
  ChatMessage,
  Conversation,
  LoadingStatus,
  ParallelismTarget,
  StorageChunkSize,
} from '../types/ui';
import {
  apiRoutes,
  chatEventsUrl,
  chatRunsUrl,
  currentChatRunStreamUrl,
  currentChatRunUrl,
  deleteChatSessionUrl,
  stopCurrentChatRunUrl,
} from './routes';

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
    // Ignore JSON parse errors and fall back to the raw response text.
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

export async function deleteJson<TResponse>(path: string): Promise<TResponse> {
  const response = await fetch(path, {
    method: 'DELETE',
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

export async function listConversations(): Promise<Conversation[]> {
  const payload = await getJson<{ conversations: Conversation[] }>(apiRoutes.uiChats);
  return payload.conversations;
}

export async function deleteConversation(chatId: string): Promise<{ status: string }> {
  return deleteJson<{ status: string }>(deleteChatSessionUrl(chatId));
}

export async function appendChatEvent(
  chatId: string,
  event: ChatEventRequest
): Promise<void> {
  await postJson(chatEventsUrl(chatId), event);
}

export async function startChatRun(
  chatId: string,
  body: {
    model: string;
    messages: Array<Pick<ChatMessage, 'role' | 'content'>>;
    thinking_enabled: boolean;
  }
): Promise<ChatRunSnapshot> {
  return postJson<ChatRunSnapshot>(chatRunsUrl(chatId), body);
}

export async function getCurrentChatRun(chatId: string): Promise<ChatRunSnapshot> {
  return getJson<ChatRunSnapshot>(currentChatRunUrl(chatId));
}

export async function stopCurrentChatRun(chatId: string): Promise<{ status: string }> {
  return postJson<{ status: string }>(stopCurrentChatRunUrl(chatId), {});
}

export function subscribeToChatRun(
  chatId: string,
  onEvent: (event: ChatRunStreamEvent) => void,
  onError?: () => void
): EventSource {
  const source = new EventSource(currentChatRunStreamUrl(chatId));
  source.onmessage = (message) => {
    try {
      onEvent(JSON.parse(message.data) as ChatRunStreamEvent);
    } catch {
      // ignore malformed stream event
    }
  };
  source.onerror = () => {
    onError?.();
  };
  return source;
}

export async function getLoadingStatus(): Promise<LoadingStatus> {
  return getJson<LoadingStatus>('/api/ui/loading-status');
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
