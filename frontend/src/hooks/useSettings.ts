import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getJSON, postJSON } from '@/lib/api';
import type { SettingsSnapshot } from '@/lib/types';

type Platform = 'bale' | 'rubika';

export function useSettings() {
  return useQuery<SettingsSnapshot>({
    queryKey: ['settings'],
    queryFn: () => getJSON<SettingsSnapshot>('/api/settings'),
    staleTime: 5_000,
    refetchOnWindowFocus: true,
  });
}

export function useSaveToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ platform, value }: { platform: Platform; value: string }) => {
      const body =
        platform === 'bale' ? { bale_token: value } : { rubika_token: value };
      return postJSON<SettingsSnapshot>('/api/settings', body);
    },
    onSuccess: (snap) => qc.setQueryData(['settings'], snap),
  });
}
