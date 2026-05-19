import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Users } from 'lucide-react';
import { useChats } from '@/hooks/useChats';
import { ChatTile } from './ChatTile';
import { EmptyState } from './EmptyState';
import { vocab } from '@/lib/vocab';

export function ChatPicker() {
  const { data, isLoading, refetch, isFetching } = useChats();
  const [forceSpin, setForceSpin] = useState(false);

  const totalTargets = data?.counts.broadcast_targets ?? 0;
  const spinning = forceSpin || isFetching;

  async function handleRefresh() {
    setForceSpin(true);
    try {
      await refetch();
    } finally {
      setTimeout(() => setForceSpin(false), 600);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">{vocab.compose.targetsLabel}</h2>
          <p className="mt-1 text-sm text-ink-muted">{vocab.compose.targetsHint}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={spinning}
          aria-label={vocab.compose.refresh}
        >
          <RefreshCw className={spinning ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} aria-hidden />
          <span className="ms-2">{vocab.compose.refresh}</span>
        </Button>
      </div>

      {!isLoading && totalTargets === 0 ? (
        <EmptyState
          icon={Users}
          title={vocab.chats.emptyTitle}
          description={vocab.chats.emptyHint}
          action={
            <Button variant="outline" onClick={handleRefresh} disabled={spinning}>
              <RefreshCw className={spinning ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} aria-hidden />
              <span className="ms-2">{vocab.chats.refresh}</span>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <ChatTile platform="bale" chats={data?.chats.bale ?? []} loading={isLoading} />
          <ChatTile platform="rubika" chats={data?.chats.rubika ?? []} loading={isLoading} />
        </div>
      )}
    </section>
  );
}
