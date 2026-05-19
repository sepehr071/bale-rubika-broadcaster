import { useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, Eye, EyeOff, Loader2, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { cn } from '@/lib/cn';
import { PLATFORM_LABEL } from '@/lib/constants';
import { vocab, toFa } from '@/lib/vocab';
import { cleanError } from '@/lib/cleanError';
import { useSaveToken } from '@/hooks/useSettings';
import type { Platform, SettingsSnapshot } from '@/lib/types';

interface TokenCardProps {
  platform: Platform;
  snapshot: SettingsSnapshot[Platform];
}

const GUIDES: Record<Platform, string[]> = {
  bale: vocab.setup.baleGuide as unknown as string[],
  rubika: vocab.setup.rubikaGuide as unknown as string[],
};

export function TokenCard({ platform, snapshot }: TokenCardProps) {
  const [value, setValue] = useState('');
  const [reveal, setReveal] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const saveMut = useSaveToken();

  async function handleSave() {
    const trimmed = value.trim();
    if (!trimmed) return;
    try {
      await saveMut.mutateAsync({ platform, value: trimmed });
      toast.success(vocab.setup.saved);
      setValue('');
    } catch (e) {
      toast.error(cleanError(String(e)).short || vocab.setup.invalid);
    }
  }

  async function handleClear() {
    try {
      await saveMut.mutateAsync({ platform, value: '' });
      toast.success(vocab.setup.cleared);
      setConfirmClear(false);
    } catch (e) {
      toast.error(cleanError(String(e)).short);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{vocab.setup.cardTitle(platform)}</CardTitle>
          {snapshot.configured ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-ok/12 px-2.5 py-1 text-xs text-ok">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
              <span>{vocab.setup.set}</span>
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-surface-2 px-2.5 py-1 text-xs text-ink-muted">
              {vocab.setup.unset}
            </span>
          )}
        </div>
        <CardDescription>
          {platform === 'bale'
            ? 'این کلید را از @BotFather در اپ بله دریافت کنید.'
            : 'این کلید را از BotFather در اپ روبیکا دریافت کنید.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Input
            type={reveal ? 'text' : 'password'}
            dir="ltr"
            autoComplete="off"
            spellCheck={false}
            placeholder={snapshot.masked ?? vocab.setup.placeholder}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="pe-10 font-mono"
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />
          <button
            type="button"
            onClick={() => setReveal((r) => !r)}
            aria-label={reveal ? vocab.setup.hide : vocab.setup.reveal}
            className={cn(
              'absolute inset-y-0 end-2 my-auto flex h-7 w-7 items-center justify-center rounded-md text-ink-muted transition',
              'hover:bg-surface-2 hover:text-ink-2',
            )}
          >
            {reveal ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleSave} disabled={!value.trim() || saveMut.isPending}>
            {saveMut.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            <span className={saveMut.isPending ? 'ms-2' : ''}>{vocab.setup.test}</span>
          </Button>
          {snapshot.configured && (
            <Button
              variant="ghost"
              onClick={() => setConfirmClear(true)}
              className="text-danger hover:bg-danger/10 hover:text-danger"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              <span className="ms-2">{vocab.setup.clear}</span>
            </Button>
          )}
        </div>

        <Accordion type="single" collapsible>
          <AccordionItem value="guide" className="border-none">
            <AccordionTrigger className="text-sm text-ink-2 hover:no-underline">
              {vocab.setup.guideTitle} — {PLATFORM_LABEL[platform]}
            </AccordionTrigger>
            <AccordionContent>
              <ol className="list-inside list-decimal space-y-2 text-sm text-ink-2">
                {GUIDES[platform].map((step, i) => (
                  <li key={i} className="leading-relaxed">
                    <span className="ms-1 font-mono text-xs text-ink-muted">{toFa(i + 1)}.</span>{' '}
                    {step}
                  </li>
                ))}
              </ol>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>{vocab.setup.confirmClear}</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{vocab.presets.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClear}
              className="bg-danger text-white hover:bg-danger/90"
            >
              {vocab.setup.clear}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
