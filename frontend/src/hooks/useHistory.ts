import { useQuery } from '@tanstack/react-query';
import { getJSON } from '@/lib/api';
import type { BroadcastDetail, BroadcastSummary } from '@/lib/types';

export function useBroadcasts() {
  return useQuery<BroadcastSummary[]>({
    queryKey: ['broadcasts'],
    queryFn: () => getJSON<BroadcastSummary[]>('/api/broadcasts'),
    refetchOnWindowFocus: false,
  });
}

export function useBroadcastDetail(id: number | null) {
  return useQuery<BroadcastDetail>({
    queryKey: ['broadcasts', id],
    queryFn: () => getJSON<BroadcastDetail>(`/api/broadcasts/${id}`),
    enabled: id != null,
    staleTime: Infinity,
  });
}
