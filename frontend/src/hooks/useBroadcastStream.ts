import { useCallback, useEffect, useRef, useState } from 'react';
import { cleanError } from '@/lib/cleanError';
import type { DoneEvent, ProgressEvent, StreamRow } from '@/lib/types';
import { vocab } from '@/lib/vocab';

export type StreamStatus = 'idle' | 'running' | 'done' | 'error';

export interface StreamState {
  status: StreamStatus;
  rows: StreamRow[];
  total: number;
  ok: number;
  fail: number;
  fallback: number;
  done?: DoneEvent;
  startedMessage?: string;
}

const empty: StreamState = {
  status: 'idle',
  rows: [],
  total: 0,
  ok: 0,
  fail: 0,
  fallback: 0,
};

export function useBroadcastStream() {
  const [state, setState] = useState<StreamState>(empty);
  const esRef = useRef<EventSource | null>(null);

  const close = useCallback(() => {
    esRef.current?.close();
    esRef.current = null;
  }, []);

  const reset = useCallback(() => {
    close();
    setState(empty);
  }, [close]);

  const start = useCallback(
    (broadcastId: number | string, total: number) => {
      close();
      setState({
        ...empty,
        status: 'running',
        total,
        startedMessage: vocab.compose.started(total),
      });

      const es = new EventSource(`/api/broadcast/${broadcastId}/stream`);
      esRef.current = es;

      es.addEventListener('progress', (evt) => {
        try {
          const data = JSON.parse((evt as MessageEvent).data) as ProgressEvent;
          const isOk = data.status === 'ok';
          const isFallback = Boolean(data.fallback);
          const rowStatus = isOk
            ? isFallback
              ? 'fallback'
              : 'ok'
            : 'error';
          const cleaned = !isOk
            ? cleanError(data.error || '')
            : { short: vocab.results.okBadge, raw: undefined };
          setState((s) => {
            const row: StreamRow = {
              id: `${data.platform}:${data.chat_id}:${s.rows.length}`,
              platform: data.platform,
              chat_id: data.chat_id,
              title: data.title || vocab.chats.untitled,
              status: rowStatus,
              short: isOk
                ? isFallback
                  ? vocab.results.fallbackNote
                  : vocab.results.okBadge
                : cleaned.short,
              raw: 'raw' in cleaned ? cleaned.raw : undefined,
              mediaKind: data.media_kind,
            };
            return {
              ...s,
              rows: [...s.rows, row],
              ok: s.ok + (isOk && !isFallback ? 1 : 0),
              fallback: s.fallback + (isOk && isFallback ? 1 : 0),
              fail: s.fail + (isOk ? 0 : 1),
            };
          });
        } catch {
          /* ignore malformed event */
        }
      });

      es.addEventListener('done', (evt) => {
        try {
          const data = JSON.parse((evt as MessageEvent).data) as DoneEvent;
          setState((s) => ({ ...s, status: 'done', done: data }));
        } catch {
          setState((s) => ({ ...s, status: 'done' }));
        }
        close();
      });

      es.onerror = () => {
        setState((s) => (s.status === 'done' ? s : { ...s, status: 'error' }));
        close();
      };
    },
    [close],
  );

  useEffect(() => () => close(), [close]);

  return { ...state, start, reset };
}
