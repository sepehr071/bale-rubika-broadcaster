import { useCallback, useRef, useState, type DragEvent } from 'react';
import { ImageIcon, Upload, X, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { MEDIA_LIMITS } from '@/lib/constants';
import { formatBytes } from '@/lib/format';
import { vocab } from '@/lib/vocab';

interface MediaDropzoneProps {
  file: File | null;
  onChange: (file: File | null) => void;
  onError: (message: string) => void;
}

function validate(file: File): string | null {
  if (file.type.startsWith('video/')) {
    if (file.type !== 'video/mp4') return vocab.compose.videoWrongType;
    if (file.size > MEDIA_LIMITS.videoMax) return vocab.compose.videoTooBig;
    return null;
  }
  if (file.size > MEDIA_LIMITS.imageMax) return vocab.compose.imageTooBig;
  return null;
}

export function MediaDropzone({ file, onChange, onError }: MediaDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handle = useCallback(
    (f: File | undefined | null) => {
      if (!f) return;
      const err = validate(f);
      if (err) {
        onError(err);
        return;
      }
      onChange(f);
    },
    [onChange, onError],
  );

  function onDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragActive(false);
    handle(e.dataTransfer.files?.[0]);
  }

  const isVideo = file?.type.startsWith('video/');

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-ink-2">{vocab.compose.mediaLabel}</p>
      <p className="mb-3 text-xs text-ink-muted">{vocab.compose.mediaHint}</p>

      {file ? (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-2/40 px-4 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-card text-ink-2">
            {isVideo ? (
              <Video className="h-5 w-5" aria-hidden />
            ) : (
              <ImageIcon className="h-5 w-5" aria-hidden />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-ink" title={file.name}>
              {file.name}
            </p>
            <p className="font-mono text-xs text-ink-muted">{formatBytes(file.size)}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onChange(null);
              if (inputRef.current) inputRef.current.value = '';
            }}
            aria-label="حذف"
          >
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      ) : (
        <label
          onDragEnter={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDrop={onDrop}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed py-8 px-4 text-center transition',
            dragActive
              ? 'border-accent bg-accent-soft text-ink'
              : 'border-border bg-surface-2/30 text-ink-2 hover:bg-surface-2',
          )}
        >
          <Upload className="mb-2 h-6 w-6" aria-hidden />
          <p className="text-sm font-medium">{vocab.compose.dropzone}</p>
          <p className="mt-1 font-mono text-xs text-ink-muted">image / mp4</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/mp4"
            className="sr-only"
            onChange={(e) => handle(e.target.files?.[0])}
          />
        </label>
      )}
    </div>
  );
}
