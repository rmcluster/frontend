export type Model = {
  model: string;
  display_name: string;
  parameters?: string;
  architecture?: string;
  quantization?: string;
  source: string;
  link_href: string;
  link_label: string;
  supports_thinking: boolean;
};

export type SearchResult = {
  model: string;
  display_name: string;
  downloads: number;
  link_href: string;
};

export type DashboardServer = {
  id: string;
  ip: string;
  port: number;
  nickname?: string;
  hardware_model: string;
  max_size?: number;
  battery?: number;
  temperature?: number;
};

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
  tokensPerSec?: number;
};

export type Device = {
  id: string;
  name: string;
  ip: string;
  port: number;
  hardware_model: string;
  max_size?: number;
  battery?: number;
  temperature?: number;
  is_online: boolean;
  is_public: boolean;
  compute_hours: number;
  owner?: string;
};

export type Conversation = {
  id: string;
  title: string;
  model: string;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
  status?: string;
};

export type ConnectInfo = {
  host: string;
  port: number;
  token: string;
  connect_uri: string;
  token_expires_in_seconds: number;
};

export type ChatSession = {
  chat_id: string;
  model: string;
  started_at: string;
  status: 'active' | 'closed';
};

export type ChatEventType =
  | 'message_sent'
  | 'token_received'
  | 'message_completed'
  | 'stream_error'
  | 'chat_closed'
  | 'message_stopped';

export type ChatEventRequest = {
  event_type: ChatEventType;
  message_id?: string;
  role?: 'user' | 'assistant';
  content?: string;
  token?: string;
  error?: string;
  timestamp: string;
};

export type ChatEvent = ChatEventRequest & {
  sequence: number;
};

export type ChatSessionDetail = ChatSession & {
  events: ChatEvent[];
};

export type ChatRunStatus =
  | 'starting'
  | 'streaming'
  | 'stopped'
  | 'completed'
  | 'error';

export type ChatRunSnapshot = {
  chat_id: string;
  model: string;
  status: ChatRunStatus;
  assistant_content: string;
  loading_phase: string;
  loading_progress: number;
  layers_on_rpc: number;
  started_at: string;
  updated_at: string;
  error?: string;
  sequence: number;
};

export type ChatRunStreamEvent = {
  type: 'snapshot' | 'delta' | 'completed' | 'stopped' | 'error';
  snapshot: ChatRunSnapshot;
  delta?: string;
};

export type LoadingStatus = {
  model: string;
  phase: string;
  progress: number;
  layers_on_rpc: number;
  layers_offloaded: number;
  node_count: number;
};

export type ParallelismTarget = {
  parallelism_target: number;
};

export type StorageChunkSize = {
  chunk_size_bytes: number;
};
