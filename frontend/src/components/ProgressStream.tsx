import { useEffect, useRef } from 'react';
import { Check, Info, RotateCcw, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/cn';
import { PLATFORM_LABEL } from '@/lib/constants';
import { vocab, toFa } from '@/lib/vocab';
import type { StreamState } from '@/hooks/useBroadcastStream';

const STATUS_META = {
  ok: {
    Icon: Check,
    label: vocab.results.okBadge,
    ring: 'bg-ok/15 text-ok',
  },
  fallback: {
    Icon: RotateCcw,
    label: vocab.results.fallbackBadge,
    ring: 'bg-warn/15 text-warn',
  },
  error: {
    Icon: X,
    label: vocab.results.errorBadge,
    ring: 'bg-danger/12 text-danger',
  },
} as const;

interface ProgressStreamProps {
  state: StreamState;
}

export function ProgressStream({ state }: ProgressStreamProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (el) el.scrollTop = el.scrollHeight;
  }, [state.rows.length]);

  if (state.status === 'idle') return null;

  const summary = summarize(state);

  return (
    <section className="rounded-lg border border-border bg-card shadow-card">
      <header className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border bg-surface-2/50 px-4 py-3">
        <h3 className="text-base font-semibold text-ink">{vocab.results.title}</h3>
        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-2">
          <Badge className="bg-ok/15 text-ok hover:bg-ok/15">
            {vocab.results.okCount(state.ok)}
          </Badge>
          {state.fallback > 0 && (
            <Badge className="bg-warn/15 text-warn hover:bg-warn/15">
              {vocab.results.fallbackCount(state.fallback)}
            </Badge>
          )}
          {state.fail > 0 && (
            <Badge className="bg-danger/12 text-danger hover:bg-danger/12">
              {vocab.results.failCount(state.fail)}
            </Badge>
          )}
          <span className="text-ink-muted">{vocab.results.totalLabel(state.total)}</span>
        </div>
      </header>

      <ScrollArea ref={scrollRef} className="h-72">
        <ul className="divide-y divide-border">
          {state.rows.map((row) => {
            const meta = STATUS_META[row.status];
            return (
              <li
                key={row.id}
                className="flex items-center gap-3 px-4 py-3"
              >
                <span
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                    meta.ring,
                  )}
                  aria-label={meta.label}
                >
                  <meta.Icon className="h-3.5 w-3.5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink" title={row.title}>
                    {row.title}
                  </p>
                  <p className="text-xs text-ink-muted">
                    <span>{PLATFORM_LABEL[row.platform]}</span>
                    <span className="mx-2 text-ink-muted">·</span>
                    <span>{row.short}</span>
                  </p>
                </div>
                {row.raw && row.status === 'error' && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        aria-label={vocab.results.showRaw}
                        className="rounded-full p-1.5 text-ink-muted transition hover:bg-surface-2 hover:text-ink-2"
                      >
                        <Info className="h-4 w-4" aria-hidden />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="end"
                      dir="ltr"
                      className="max-w-sm font-mono text-xs"
                    >
                      <p className="mb-1 text-end font-sans text-xs text-ink-2" dir="rtl">
                        {vocab.results.showRaw}
                      </p>
                      <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words text-ink">
                        {row.raw}
                      </pre>
                    </PopoverContent>
                  </Popover>
                )}
              </li>
            );
          })}
          {state.status === 'running' && (
            <li className="flex items-center gap-3 px-4 py-3 text-sm text-ink-muted">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-accent" />
              <span>{state.startedMessage ?? vocab.compose.sending}</span>
              <span className="ms-auto font-mono text-xs">
                {toFa(state.rows.length)} / {toFa(state.total)}
              </span>
            </li>
          )}
        </ul>
      </ScrollArea>

      {summary && (
        <div
          className={cn(
            'border-t border-border px-4 py-3 text-sm',
            summary.tone === 'ok' && 'bg-ok/10 text-ok',
            summary.tone === 'partial' && 'bg-warn/10 text-warn',
            summary.tone === 'fail' && 'bg-danger/10 text-danger',
          )}
        >
          {summary.label}
        </div>
      )}
    </section>
  );
}

function summarize(state: StreamState) {
  if (state.status !== 'done' || !state.done) return null;
  if (state.fail === 0 && state.fallback === 0) {
    return { tone: 'ok' as const, label: vocab.results.allOk };
  }
  if (state.fail === state.total) {
    return { tone: 'fail' as const, label: vocab.results.allFailed };
  }
  return { tone: 'partial' as const, label: vocab.results.partial };
}
