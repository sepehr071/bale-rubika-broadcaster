import { useState } from 'react';
import { Bookmark, Pencil, Plus, RotateCcw, Trash2, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/cn';
import { PRESET_NAME_MAX } from '@/lib/constants';
import { vocab, toFa } from '@/lib/vocab';
import { cleanError } from '@/lib/cleanError';
import { ApiError } from '@/lib/api';
import {
  useCreatePreset,
  useDeletePreset,
  useOverwritePreset,
  usePresets,
  useRenamePreset,
} from '@/hooks/usePresets';
import { useSelection } from '@/store/selection';
import type { Preset } from '@/lib/types';

type DialogKind =
  | { kind: 'create' }
  | { kind: 'rename'; preset: Preset }
  | { kind: 'overwrite'; preset: Preset }
  | { kind: 'delete'; preset: Preset }
  | null;

export function PresetBar() {
  const { data, isLoading } = usePresets();
  const selectionKeys = useSelection((s) => s.keys);
  const activePreset = useSelection((s) => s.activePreset);
  const setMany = useSelection((s) => s.setMany);

  const createMut = useCreatePreset();
  const renameMut = useRenamePreset();
  const overwriteMut = useOverwritePreset();
  const deleteMut = useDeletePreset();

  const [dialog, setDialog] = useState<DialogKind>(null);
  const [nameInput, setNameInput] = useState('');

  const presets = data?.presets ?? [];
  const selectedSize = selectionKeys.size;

  function applyPreset(p: Preset) {
    setMany(p.keys, { preset: p.name });
    toast.success(vocab.presets.loaded);
  }

  function handleCreate() {
    if (selectedSize === 0) {
      toast.error(vocab.presets.nothingToSave);
      return;
    }
    setNameInput('');
    setDialog({ kind: 'create' });
  }

  async function confirmCreate() {
    const name = nameInput.trim();
    if (!name) return;
    try {
      await createMut.mutateAsync({ name, keys: Array.from(selectionKeys) });
      setMany(Array.from(selectionKeys), { preset: name });
      toast.success(vocab.presets.saved);
      setDialog(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        toast.error(vocab.presets.duplicate);
      } else {
        toast.error(cleanError(String(e)).short);
      }
    }
  }

  async function confirmRename() {
    if (!dialog || dialog.kind !== 'rename') return;
    const newName = nameInput.trim();
    if (!newName || newName === dialog.preset.name) {
      setDialog(null);
      return;
    }
    try {
      await renameMut.mutateAsync({ from: dialog.preset.name, to: newName });
      toast.success(vocab.presets.saved);
      setDialog(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        toast.error(vocab.presets.duplicate);
      } else {
        toast.error(cleanError(String(e)).short);
      }
    }
  }

  async function confirmOverwrite() {
    if (!dialog || dialog.kind !== 'overwrite') return;
    if (selectedSize === 0) {
      toast.error(vocab.presets.nothingToSave);
      setDialog(null);
      return;
    }
    try {
      await overwriteMut.mutateAsync({
        name: dialog.preset.name,
        keys: Array.from(selectionKeys),
      });
      setMany(Array.from(selectionKeys), { preset: dialog.preset.name });
      toast.success(vocab.presets.saved);
      setDialog(null);
    } catch (e) {
      toast.error(cleanError(String(e)).short);
    }
  }

  async function confirmDelete() {
    if (!dialog || dialog.kind !== 'delete') return;
    try {
      await deleteMut.mutateAsync(dialog.preset.name);
      toast.success(vocab.presets.deleted);
      setDialog(null);
    } catch (e) {
      toast.error(cleanError(String(e)).short);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className="me-1 inline-flex items-center gap-2 text-sm text-ink-2">
          <Bookmark className="h-4 w-4" aria-hidden />
          <span>{vocab.presets.label}</span>
        </span>

        {isLoading && (
          <>
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-8 w-32 rounded-full" />
          </>
        )}

        {!isLoading && presets.length === 0 && (
          <span className="text-sm text-ink-muted">{vocab.presets.empty}</span>
        )}

        {!isLoading &&
          presets.map((p) => (
            <div
              key={p.id}
              className={cn(
                'group inline-flex items-stretch overflow-hidden rounded-full border transition',
                activePreset === p.name
                  ? 'border-accent bg-accent-soft text-accent-strong'
                  : 'border-border bg-card text-ink-2 hover:border-border-strong hover:bg-surface-2',
              )}
            >
              <button
                type="button"
                onClick={() => applyPreset(p)}
                className="flex items-center gap-2 ps-3 pe-2 py-1.5 text-sm font-medium"
              >
                <span>{p.name}</span>
                <span className="font-mono text-xs opacity-70">{toFa(p.keys.length)}</span>
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label={p.name}
                    className="border-s border-border/80 px-2 transition hover:bg-surface-2"
                  >
                    <MoreHorizontal className="h-4 w-4" aria-hidden />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onSelect={() => {
                      setNameInput(p.name);
                      setDialog({ kind: 'rename', preset: p });
                    }}
                  >
                    <Pencil className="h-4 w-4" aria-hidden />
                    <span>{vocab.presets.rename}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => setDialog({ kind: 'overwrite', preset: p })}
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden />
                    <span>{vocab.presets.overwrite}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-danger focus:text-danger"
                    onSelect={() => setDialog({ kind: 'delete', preset: p })}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                    <span>{vocab.presets.delete}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}

        {selectedSize > 0 && (
          <Button variant="outline" size="sm" onClick={handleCreate}>
            <Plus className="h-4 w-4" aria-hidden />
            <span className="ms-1">{vocab.presets.create}</span>
          </Button>
        )}
      </div>

      <Dialog
        open={dialog?.kind === 'create' || dialog?.kind === 'rename'}
        onOpenChange={(o) => !o && setDialog(null)}
      >
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {dialog?.kind === 'rename' ? vocab.presets.rename : vocab.presets.create}
            </DialogTitle>
            {dialog?.kind === 'create' && (
              <DialogDescription>
                {vocab.presets.empty.includes('فعلی')
                  ? `با ${toFa(selectedSize)} گیرنده فعلی ذخیره می‌شود.`
                  : null}
              </DialogDescription>
            )}
          </DialogHeader>
          <Input
            autoFocus
            dir="rtl"
            placeholder={vocab.presets.namePlaceholder}
            maxLength={PRESET_NAME_MAX}
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (dialog?.kind === 'rename') confirmRename();
                else confirmCreate();
              }
            }}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialog(null)}>
              {vocab.presets.cancel}
            </Button>
            <Button
              onClick={dialog?.kind === 'rename' ? confirmRename : confirmCreate}
              disabled={!nameInput.trim() || createMut.isPending || renameMut.isPending}
            >
              {vocab.presets.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={dialog?.kind === 'overwrite' || dialog?.kind === 'delete'}
        onOpenChange={(o) => !o && setDialog(null)}
      >
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {dialog?.kind === 'delete'
                ? vocab.presets.confirmDelete
                : vocab.presets.confirmOverwrite}
            </AlertDialogTitle>
            {dialog?.kind === 'overwrite' && (
              <AlertDialogDescription>
                {`"${dialog.preset.name}" با ${toFa(selectedSize)} گیرنده فعلی جایگزین می‌شود.`}
              </AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{vocab.presets.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={dialog?.kind === 'delete' ? confirmDelete : confirmOverwrite}
              className={
                dialog?.kind === 'delete'
                  ? 'bg-danger text-white hover:bg-danger/90'
                  : undefined
              }
            >
              {dialog?.kind === 'delete' ? vocab.presets.delete : vocab.presets.save}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
