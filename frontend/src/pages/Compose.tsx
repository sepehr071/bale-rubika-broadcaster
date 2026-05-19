import { useMemo, useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChatPicker } from '@/components/ChatPicker';
import { PresetBar } from '@/components/PresetBar';
import { MediaDropzone } from '@/components/MediaDropzone';
import { ProgressStream } from '@/components/ProgressStream';
import { MEDIA_LIMITS, TEXT_MAX } from '@/lib/constants';
import { vocab, toFa } from '@/lib/vocab';
import { cleanError } from '@/lib/cleanError';
import { postForm } from '@/lib/api';
import { useBroadcastStream } from '@/hooks/useBroadcastStream';
import { useSelection } from '@/store/selection';

export default function ComposePage() {
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const selectionKeys = useSelection((s) => s.keys);
  const stream = useBroadcastStream();

  const targets = useMemo(() => Array.from(selectionKeys), [selectionKeys]);

  const buttonLabel =
    targets.length === 0
      ? vocab.compose.submitDisabled
      : vocab.compose.selectedCount(targets.length);

  function validateBaleVideo(): string | null {
    if (!file || !file.type.startsWith('video/')) return null;
    const hasBale = targets.some((k) => k.startsWith('bale:'));
    if (hasBale && file.size > MEDIA_LIMITS.baleVideoMax) {
      return vocab.compose.baleVideoTooBig;
    }
    return null;
  }

  async function handleSubmit() {
    if (targets.length === 0) {
      toast.error(vocab.compose.needTarget);
      return;
    }
    if (!text.trim() && !file) {
      toast.error(vocab.compose.needContent);
      return;
    }
    const baleErr = validateBaleVideo();
    if (baleErr) {
      toast.error(baleErr);
      return;
    }

    setSubmitting(true);
    stream.reset();
    try {
      const fd = new FormData();
      fd.append('text', text);
      if (file) fd.append('media', file);
      targets.forEach((t) => fd.append('targets', t));

      const { broadcast_id, total } = await postForm<{ broadcast_id: number; total: number }>(
        '/api/broadcast',
        fd,
      );
      stream.start(broadcast_id, total);
      setText('');
      setFile(null);
    } catch (e) {
      toast.error(cleanError(String(e)).short);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{vocab.appTitle}</h1>
        <p className="text-sm text-ink-muted">
          یک پیام بنویسید، گیرنده‌ها را انتخاب کنید و ارسال را بزنید.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{vocab.compose.cardTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <label
              htmlFor="msg-text"
              className="mb-2 block text-sm font-medium text-ink-2"
            >
              {vocab.compose.messageLabel}
            </label>
            <Textarea
              id="msg-text"
              dir="rtl"
              rows={5}
              maxLength={TEXT_MAX}
              placeholder={vocab.compose.messagePlaceholder}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="min-h-32 resize-y"
            />
            <div className="mt-1 text-end font-mono text-xs text-ink-muted">
              {toFa(text.length)} / {toFa(TEXT_MAX)}
            </div>
          </div>

          <MediaDropzone
            file={file}
            onChange={setFile}
            onError={(msg) => toast.error(msg)}
          />

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-4">
            <span className="text-sm text-ink-muted">
              {vocab.compose.targetsLabel}: <span className="font-mono">{toFa(targets.length)}</span>
            </span>
            <Button
              onClick={handleSubmit}
              disabled={submitting || targets.length === 0}
              size="lg"
              className="min-w-44"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Send className="h-4 w-4" aria-hidden />
              )}
              <span className="ms-2">{buttonLabel}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <PresetBar />
        <ChatPicker />
      </section>

      <ProgressStream state={stream} />
    </div>
  );
}

