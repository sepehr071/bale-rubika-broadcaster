import { useMemo, useRef, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/cn';
import { BROADCAST_TYPES, CHAT_TYPE_LABEL, PLATFORM_LABEL } from '@/lib/constants';
import { vocab, toFa } from '@/lib/vocab';
import { useSelection } from '@/store/selection';
import type { Chat, Platform } from '@/lib/types';

interface ChatTileProps {
  platform: Platform;
  chats: Chat[];
  loading?: boolean;
}

export function ChatTile({ platform, chats, loading }: ChatTileProps) {
  const selectionKeys = useSelection((s) => s.keys);
  const toggle = useSelection((s) => s.toggle);
  const toggleMany = useSelection((s) => s.toggleMany);

  const targets = useMemo(
    () => chats.filter((c) => c.type && BROADCAST_TYPES.has(c.type)),
    [chats],
  );

  const keys = useMemo(() => targets.map((c) => `${platform}:${c.chat_id}`), [targets, platform]);
  const selectedCount = useMemo(
    () => keys.filter((k) => selectionKeys.has(k)).length,
    [keys, selectionKeys],
  );

  const allSelected = keys.length > 0 && selectedCount === keys.length;
  const someSelected = selectedCount > 0 && selectedCount < keys.length;

  const headerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const el = headerRef.current?.querySelector('input[type=checkbox]') as HTMLInputElement | null;
    if (el) el.indeterminate = someSelected;
  }, [someSelected]);

  const platformAccent =
    platform === 'bale'
      ? 'bg-accent-soft text-accent-strong'
      : 'bg-ok/15 text-ok';

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card shadow-card">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-surface-2/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className={cn('rounded-md px-2 py-1 text-xs font-semibold', platformAccent)}>
            {PLATFORM_LABEL[platform]}
          </span>
          <span className="text-xs text-ink-muted">{vocab.chats.targets(targets.length)}</span>
        </div>
        <label
          className={cn(
            'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-xs text-ink-2 transition',
            targets.length > 0 && 'hover:bg-surface-3',
            targets.length === 0 && 'pointer-events-none opacity-50',
          )}
        >
          <Checkbox
            checked={allSelected}
            ref={(node) => {
              if (node) {
                const input = (node as unknown as HTMLElement).querySelector?.('input');
                if (input) (input as HTMLInputElement).indeterminate = someSelected;
              }
            }}
            onCheckedChange={(checked) => toggleMany(keys, checked === true)}
            aria-label={vocab.compose.selectAll}
          />
          <span>{vocab.compose.selectAll}</span>
        </label>
      </div>

      <ScrollArea className="flex-1">
        <ul className="divide-y divide-border">
          {loading &&
            Array.from({ length: 3 }).map((_, i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-3">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-12 rounded" />
                <Skeleton className="h-4 flex-1 rounded" />
              </li>
            ))}
          {!loading && targets.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-ink-muted">
              {vocab.chats.emptyTitle}
            </li>
          )}
          {!loading &&
            targets.map((c) => {
              const key = `${platform}:${c.chat_id}`;
              const checked = selectionKeys.has(key);
              const typeLabel = c.type ? CHAT_TYPE_LABEL[c.type] ?? c.type : '—';
              const title = c.title?.trim() || vocab.chats.untitled;
              return (
                <li key={key}>
                  <label
                    className={cn(
                      'flex cursor-pointer items-center gap-3 px-4 py-3 transition',
                      'hover:bg-surface-2/60',
                      checked && 'bg-accent-soft',
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggle(key)}
                      aria-label={title}
                    />
                    <Badge variant="secondary" className="shrink-0 bg-surface-3 text-ink-2">
                      {typeLabel}
                    </Badge>
                    <span className="flex-1 truncate text-sm text-ink" title={title}>
                      {title}
                    </span>
                    {checked && (
                      <span className="font-mono text-xs text-ink-muted">{toFa(selectedCount)}</span>
                    )}
                  </label>
                </li>
              );
            })}
        </ul>
      </ScrollArea>
    </div>
  );
}
