import type {
  NewSong,
  PageQuery,
  SongFilter,
  SongId,
  SongInput,
  SongSummary,
} from '@koiro/shared';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  createSong,
  deleteSong,
  fetchMySongs,
  fetchRandomSongs,
  fetchSong,
  fetchSongInput,
  fetchSongOptions,
  fetchSongs,
  replaceSong,
} from '@/api';
import { invalidateCatalog } from './invalidate';
import { queryKeys } from './keys';

/** 接口允许的最大每页条数 */
const MAX_PAGE_SIZE = 100;

/** 一页歌曲；翻页时保留上一页直到新数据到达 */
export function useSongs(
  query: PageQuery & SongFilter,
  { enabled = true }: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: queryKeys.songList(query),
    queryFn: ({ signal }) => fetchSongs(query, { signal }),
    placeholderData: keepPreviousData,
    enabled,
  });
}

/** 符合条件的全部歌曲（依次取完所有页），如歌单的完整曲目 */
export function useAllSongs(filter: SongFilter) {
  return useQuery({
    queryKey: queryKeys.allSongs(filter),
    queryFn: async ({ signal }) => {
      const items: SongSummary[] = [];
      for (let page = 1; ; page++) {
        const result = await fetchSongs(
          { ...filter, page, pageSize: MAX_PAGE_SIZE },
          { signal },
        );
        items.push(...result.items);
        if (page >= result.totalPages) return items;
      }
    },
  });
}

/** 「我的」：非 ADMIN 只看自己创建的歌曲，ADMIN 看全部；标题可搜索 */
export function useMySongs({ q, page }: { q: string; page: number }) {
  return useQuery({
    queryKey: queryKeys.mySongList({ q: q || undefined, page }),
    queryFn: ({ signal }) =>
      fetchMySongs({ q: q || undefined, page }, { signal }),
    placeholderData: keepPreviousData,
  });
}

export function useRandomSongs() {
  return useQuery({
    queryKey: queryKeys.randomSongs,
    queryFn: ({ signal }) => fetchRandomSongs({ signal }),
  });
}

export function useSongOptions() {
  return useQuery({
    queryKey: queryKeys.songOptions,
    queryFn: ({ signal }) => fetchSongOptions({ signal }),
  });
}

export function useSong(id: SongId) {
  return useQuery({
    queryKey: queryKeys.song(id),
    queryFn: ({ signal }) => fetchSong(id, { signal }),
  });
}

export function useSongInput(id: SongId) {
  return useQuery({
    queryKey: queryKeys.songInput(id),
    queryFn: ({ signal }) => fetchSongInput(id, { signal }),
    // 编辑表单以它为初值，打开时总是取最新的
    staleTime: 0,
  });
}

export function useCreateSong() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: NewSong) => createSong(input),
    onSuccess: () => invalidateCatalog(client),
  });
}

export function useReplaceSong(id: SongId) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: SongInput) => replaceSong(id, input),
    onSuccess: (song) => {
      client.setQueryData(queryKeys.song(id), song);
      return invalidateCatalog(client);
    },
  });
}

export function useDeleteSong() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: SongId) => deleteSong(id),
    onSuccess: () => invalidateCatalog(client),
  });
}
