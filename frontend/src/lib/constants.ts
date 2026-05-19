import type { Platform } from './types';

export const BROADCAST_TYPES = new Set([
  'group',
  'supergroup',
  'channel',
  'Group',
  'Channel',
]);

export const MEDIA_LIMITS = {
  imageMax: 10 * 1024 * 1024,
  videoMax: 50 * 1024 * 1024,
  baleVideoMax: 20 * 1024 * 1024,
} as const;

export const TEXT_MAX = 4096;
export const PRESET_NAME_MAX = 64;

export const PLATFORM_LABEL: Record<Platform, string> = {
  bale: 'بله',
  rubika: 'روبیکا',
};

export const PLATFORMS: Platform[] = ['bale', 'rubika'];

export const CHAT_TYPE_LABEL: Record<string, string> = {
  group: 'گروه',
  supergroup: 'سوپرگروه',
  channel: 'کانال',
  Group: 'گروه',
  Channel: 'کانال',
};
