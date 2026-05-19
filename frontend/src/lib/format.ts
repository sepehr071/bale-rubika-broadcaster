import { toFa } from './vocab';

export function formatDate(ts: string): string {
  const iso = ts.includes('T') ? ts : ts.replace(' ', 'T') + 'Z';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return ts;
  return new Intl.DateTimeFormat('fa-IR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d);
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${toFa(n)} بایت`;
  const kb = n / 1024;
  if (kb < 1024) return `${toFa(kb.toFixed(0))} کیلوبایت`;
  const mb = kb / 1024;
  return `${toFa(mb.toFixed(1))} مگابایت`;
}
