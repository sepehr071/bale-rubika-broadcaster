import { Inbox } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/EmptyState';
import { HistoryRow } from '@/components/HistoryRow';
import { useBroadcasts } from '@/hooks/useHistory';
import { vocab } from '@/lib/vocab';

export default function HistoryPage() {
  const { data, isLoading } = useBroadcasts();

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{vocab.history.title}</h1>
        <p className="text-sm text-ink-muted">پیام‌های ارسال‌شده پیشین و نتیجه هر کدام.</p>
      </header>

      {isLoading && (
        <ul className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </ul>
      )}

      {!isLoading && (data?.length ?? 0) === 0 && (
        <EmptyState icon={Inbox} title={vocab.history.empty} />
      )}

      {!isLoading && data && data.length > 0 && (
        <ul className="space-y-2">
          {data.map((row) => (
            <HistoryRow key={row.id} row={row} />
          ))}
        </ul>
      )}
    </div>
  );
}
