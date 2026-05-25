import type { ChatMessage, Model } from '../types/ui';

export const FALLBACK_MODEL = 'hf:unsloth/Qwen3-0.6B-GGUF:UD-Q4_K_XL';

export function chooseDefaultModel(models: Model[]): string {
  if (models.length === 0) {
    return FALLBACK_MODEL;
  }
  return models[0]?.model || FALLBACK_MODEL;
}

export function buildRequestHistory(
  existingMessages: ChatMessage[],
  content: string,
  thinkingEnabled: boolean
): Array<ChatMessage | { role: 'system'; content: string }> {
  return [
    ...(!thinkingEnabled
      ? [{ role: 'system' as const, content: '/no_think' }]
      : []),
    ...existingMessages.filter((message) => message.role !== 'assistant' || message.content !== ''),
    { role: 'user' as const, content },
  ];
}
