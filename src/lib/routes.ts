export const apiRoutes = {
  uiModels: '/api/ui/models',
  uiModelsSearch: '/api/ui/models/search',
  uiModelsHF: '/api/ui/models/hf',
  uiModelsLocal: '/api/ui/models/local',
  uiDashboard: '/api/ui/dashboard',
  uiConnectInfo: '/api/ui/connect-info',
  uiChats: '/api/ui/chats',
  devicesRegister: '/api/v1/devices/register',
} as const;

const devBackendBaseUrl = 'http://127.0.0.1:4917';

export function buildChatPath(model: string, convId?: string): string {
  const params = new URLSearchParams({ model });
  if (convId) {
    params.set('conv', convId);
  }
  return `/chat?${params.toString()}`;
}

export function chatCompletionsUrl(): string {
  return import.meta.env.DEV
    ? `${devBackendBaseUrl}/v1/chat/completions`
    : '/v1/chat/completions';
}

export function chatEventsUrl(chatId: string): string {
  return `/api/ui/chats/${chatId}/events`;
}

export function chatSessionUrl(chatId: string): string {
  return `/api/ui/chats/${chatId}`;
}
