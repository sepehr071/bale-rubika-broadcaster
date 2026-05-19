export type Platform = 'bale' | 'rubika';

export interface Chat {
  chat_id: string;
  type: string | null;
  title: string | null;
}

export interface ChatsResponse {
  chats: { bale: Chat[]; rubika: Chat[] };
  counts: { bale_total: number; rubika_total: number; broadcast_targets: number };
}

export interface Preset {
  id: number;
  name: string;
  keys: string[];
  created_at: string;
  updated_at: string;
}

export interface PresetsResponse {
  presets: Preset[];
}

export interface SettingsSnapshot {
  bale: { configured: boolean; masked: string | null };
  rubika: { configured: boolean; masked: string | null };
}

export interface BroadcastSummary {
  id: number;
  text: string | null;
  image_path: string | null;
  media_kind: 'image' | 'video' | null;
  created_at: string;
  total: number;
  sent: number;
  failed: number;
}

export interface BroadcastResult {
  platform: Platform;
  chat_id: string;
  status: 'ok' | string;
  error: string | null;
}

export interface BroadcastDetail extends BroadcastSummary {
  results: BroadcastResult[];
}

export type BroadcastEventKind = 'progress' | 'done';

export interface ProgressEvent {
  event: 'progress';
  platform: Platform;
  chat_id: string;
  title?: string | null;
  status: 'ok' | string;
  fallback?: boolean;
  media_kind?: 'image' | 'video';
  error?: string | null;
}

export interface DoneEvent {
  event: 'done';
  sent: number;
  failed: number;
  total: number;
}

export type StreamEvent = ProgressEvent | DoneEvent;

export interface CleanError {
  short: string;
  kind:
    | 'rubika_upload_down'
    | 'too_large'
    | 'bad_response'
    | 'network'
    | 'timeout'
    | 'auth'
    | 'ratelimit'
    | 'unknown'
    | 'generic';
  raw?: string;
}

export type RowStatus = 'ok' | 'fallback' | 'error';

export interface StreamRow {
  id: string;
  platform: Platform;
  chat_id: string;
  title: string;
  status: RowStatus;
  short: string;
  raw?: string;
  mediaKind?: 'image' | 'video';
}
