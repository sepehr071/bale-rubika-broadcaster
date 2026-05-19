import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { del, getJSON, patchJSON, postJSON } from '@/lib/api';
import type { Preset, PresetsResponse } from '@/lib/types';

export function usePresets() {
  return useQuery<PresetsResponse>({
    queryKey: ['presets'],
    queryFn: () => getJSON<PresetsResponse>('/api/presets'),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useCreatePreset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; keys: string[] }) =>
      postJSON<Preset>('/api/presets', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['presets'] }),
  });
}

export function useRenamePreset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ from, to }: { from: string; to: string }) =>
      patchJSON<Preset>(`/api/presets/${encodeURIComponent(from)}`, { name: to }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['presets'] }),
  });
}

export function useOverwritePreset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, keys }: { name: string; keys: string[] }) =>
      postJSON<Preset>('/api/presets', { name, keys }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['presets'] }),
  });
}

export function useDeletePreset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => del(`/api/presets/${encodeURIComponent(name)}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['presets'] }),
  });
}
