import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TokenCard } from '@/components/TokenCard';
import { useSettings } from '@/hooks/useSettings';
import { vocab } from '@/lib/vocab';

export default function SetupPage() {
  const { data, isLoading } = useSettings();
  const navigate = useNavigate();

  const anyConfigured = Boolean(data?.bale.configured || data?.rubika.configured);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header className="space-y-2 text-center md:text-start">
        <h1 className="text-2xl font-bold tracking-tight">{vocab.setup.title}</h1>
        <p className="text-sm leading-relaxed text-ink-muted">{vocab.setup.intro}</p>
      </header>

      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-56 w-full rounded-lg" />
          <Skeleton className="h-56 w-full rounded-lg" />
        </div>
      )}

      {!isLoading && data && (
        <div className="space-y-4">
          <TokenCard platform="bale" snapshot={data.bale} />
          <TokenCard platform="rubika" snapshot={data.rubika} />
        </div>
      )}

      <div className="rounded-lg border border-border bg-surface-2/40 px-4 py-3">
        <p className="mb-3 text-sm text-ink-2">
          {anyConfigured ? vocab.setup.readyHint : vocab.setup.enterHint}
        </p>
        <Button disabled={!anyConfigured} onClick={() => navigate('/')}>
          {vocab.setup.enter}
        </Button>
      </div>
    </div>
  );
}
