import { useState } from 'react';
import { ChevronDown, Image as ImageIcon, Video } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/cn';
import { PLATFORM_LABEL } from '@/lib/constants';
import { formatDate } from '@/lib/format';
import { vocab, toFa } from '@/lib/vocab';
import { cleanError } from '@/lib/cleanError';
import { useBroadcastDetail } from '@/hooks/useHistory';
import type { BroadcastSummary } from '@/lib/types';

interface HistoryRowProps {
  row: BroadcastSummary;
}

export function HistoryRow({ row }: HistoryRowProps) {
  const [open, setOpen] = useState(false);
  const { data: detail, isLoading } = useBroadcastDetail(open ? row.id : null);

  const mediaLabel =
    row.media_kind === 'video'
      ? vocab.history.media.video
      : row.media_kind === 'image'
        ? vocab.history.media.image
        : vocab.history.media.none;

  const MediaIcon = row.media_kind === 'video' ? Video : row.media_kind === 'image' ? ImageIcon : null;

  return (
    <li className="overflow-hidden rounded-lg border border-border bg-card shadow-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex w-full items-center gap-4 px-4 py-3 text-end transition',
          'hover:bg-surface-2/60',
        )}
      >
        <div className="flex-1 min-w-0 space-y-1">
          <p className="line-clamp-1 text-sm text-ink">
            {row.text?.trim() || vocab.history.empty}
          </p>
          <p className="text-xs text-ink-muted">{formatDate(row.created_at)}</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {row.media_kind && MediaIcon && (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-surface-2 px-2 py-1 text-xs text-ink-2">
              <MediaIcon className="h-3.5 w-3.5" aria-hidden />
              <span>{mediaLabel}</span>
            </span>
          )}
          <span className="hidden text-xs text-ink-muted md:inline">
            {vocab.history.cols.total}: <span className="font-mono">{toFa(row.total)}</span>
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-ok/12 px-2 py-1 text-xs text-ok">
            {vocab.results.okCount(row.sent)}
          </span>
          {row.failed > 0 && (
            <span className="inline-flex items-center gap-1 rounded-md bg-danger/12 px-2 py-1 text-xs text-danger">
              {vocab.results.failCount(row.failed)}
            </span>
          )}
          <ChevronDown
            className={cn('h-4 w-4 text-ink-muted transition', open && 'rotate-180')}
            aria-hidden
          />
        </div>
      </button>
      {open && (
        <div className="border-t border-border bg-surface-2/30 px-4 py-3">
          {isLoading && (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full rounded" />
              ))}
            </div>
          )}
          {!isLoading && detail?.results.length === 0 && (
            <p className="text-sm text-ink-muted">{vocab.history.noResults}</p>
          )}
          {!isLoading && detail && detail.results.length > 0 && (
            <ul className="divide-y divide-border">
              {detail.results.map((r, idx) => {
                const ok = r.status === 'ok';
                const cleaned = !ok && r.error ? cleanError(r.error) : null;
                return (
                  <li
                    key={`${r.platform}:${r.chat_id}:${idx}`}
                    className="flex items-center gap-3 py-2 text-sm"
                  >
                    <Badge
                      className={
                        ok
                          ? 'bg-ok/15 text-ok hover:bg-ok/15'
                          : 'bg-danger/12 text-danger hover:bg-danger/12'
                      }
                    >
                      {ok ? vocab.results.okBadge : vocab.results.errorBadge}
                    </Badge>
                    <span className="text-ink-2">{PLATFORM_LABEL[r.platform]}</span>
                    <span className="flex-1 truncate text-ink-muted">
                      {cleaned?.short ?? (ok ? '' : (r.error ?? ''))}
                    </span>
                    {cleaned?.raw && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            aria-label={vocab.results.showRaw}
                            className="rounded-full p-1.5 text-ink-muted transition hover:bg-surface-3 hover:text-ink-2"
                          >
                            <Info className="h-4 w-4" aria-hidden />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent dir="ltr" align="end" className="max-w-sm font-mono text-xs">
                          <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words text-ink">
                            {cleaned.raw}
                          </pre>
                        </PopoverContent>
                      </Popover>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}
