import type { CleanError } from './types';

export function cleanError(raw: unknown): CleanError {
  if (!raw) return { short: 'خطای ناشناخته', kind: 'unknown' };
  const s = String(raw);
  if (/502/.test(s) && /rubika/i.test(s)) {
    return { short: 'سرور آپلود روبیکا در دسترس نیست (۵۰۲)', kind: 'rubika_upload_down', raw: s };
  }
  if (/413/.test(s) || /entity too large/i.test(s) || /exceeds.*cap/i.test(s)) {
    return { short: 'حجم فایل بیش از سقف مجاز سرور است', kind: 'too_large', raw: s };
  }
  if (/non-json/i.test(s)) {
    return { short: 'پاسخ نامعتبر از سرور', kind: 'bad_response', raw: s };
  }
  if (/network/i.test(s) || /getaddrinfo/i.test(s)) {
    return { short: 'خطای شبکه — احتمالاً مسدودسازی منطقه‌ای', kind: 'network', raw: s };
  }
  if (/timeout/i.test(s)) {
    return { short: 'اتمام مهلت پاسخ', kind: 'timeout', raw: s };
  }
  if (/401|403|unauthorized|forbidden|invalid.?token/i.test(s)) {
    return { short: 'کلید دسترسی نامعتبر است', kind: 'auth', raw: s };
  }
  if (/429|rate.?limit|too.?many/i.test(s)) {
    return { short: 'تعداد درخواست زیاد — کمی بعد دوباره تلاش کنید', kind: 'ratelimit', raw: s };
  }
  const oneLine = s.replace(/\s+/g, ' ').trim();
  return {
    short: oneLine.length > 90 ? oneLine.slice(0, 90) + '…' : oneLine,
    kind: 'generic',
    raw: s,
  };
}
