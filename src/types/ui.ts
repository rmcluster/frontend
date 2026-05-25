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
  hardware_model: string;
  max_size?: number;
  battery?: number;
  temperature?: number;
};

export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  tokensPerSec?: number;
};

export type RequestChatMessage = ChatMessage | {
  role: 'system';
  content: string;
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
  | 'chat_closed';

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

export type LoadingStatus = {
  model: string;
  phase: string;
  progress: number;
  layers_on_gpu: number;
  layers_offloaded: number;
  node_count: number;
};

export type ParallelismTarget = {
  parallelism_target: number;
};

export type AllocationDevice = {
  node_id: string;
  ip: string;
  port: number;
  hardware_model: string;
  label: string;
};

export type AllocationsResponse = {
  model: string;
  devices: AllocationDevice[];
};

export type MetricsRequest = {
  id: number;
  model: string;
  path: string;
  started_at: string;
  completed_at: string;
  duration_ms: number;
  response_bytes: number;
  streamed_text_bytes: number;
  tokens_streamed: number;
  tokens_per_second: number;
  allocated_node_count: number;
  allocated_node_ids: string[];
};

export type MetricsSnapshot = {
  summary: {
    request_count: number;
    avg_duration_ms: number;
    avg_tokens_per_second: number;
    total_response_bytes: number;
    total_tokens_streamed: number;
  };
  requests: MetricsRequest[];
};
