export type Model = {
  model: string;
  display_name: string;
  parameters?: string;
  architecture?: string;
  quantization?: string;
  source: string;
  link_href: string;
  link_label: string;
};

export type SearchResult = {
  model: string;
  display_name: string;
  downloads: number;
  link_href: string;
};

export type DashboardServer = {
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

export type LeaderboardEntry = {
  rank: number;
  username: string;
  device_count: number;
  compute_hours: number;
  tokens_generated: number;
};
