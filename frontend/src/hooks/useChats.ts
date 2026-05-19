import { useQuery } from '@tanstack/react-query';
import { getJSON } from '@/lib/api';
import type { ChatsResponse } from '@/lib/types';

export function useChats() {
  return useQuery<ChatsResponse>({
    queryKey: ['chats'],
    queryFn: () => getJSON<ChatsResponse>('/api/chats'),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}
