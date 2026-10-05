import type {
  PageQuery,
  PlaylistFilter,
  PlaylistId,
  PlaylistInput,
  PlaylistPatch,
  SongId,
} from '@koiro/shared';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  addPlaylistSongs,
  createPlaylist,
  deletePlaylist,
  fetchMyPlaylists,
  fetchPlaylist,
  fetchPlaylistOptions,
  fetchPlaylists,
  fetchRandomPlaylists,
  removePlaylistSong,
  reorderPlaylistSongs,
  updatePlaylist,
} from '@/api';
import { invalidateCatalog } from './invalidate';
import { queryKeys } from './keys';

export function usePlaylists(query: PageQuery & PlaylistFilter) {
  return useQuery({
    queryKey: queryKeys.playlistList(query),
    queryFn: ({ signal }) => fetchPlaylists(query, { signal }),
    placeholderData: keepPreviousData,
  });
}

/** 「我的」：非 ADMIN 只看自己创建的歌单，ADMIN 看全部 */
export function useMyPlaylists(query: PageQuery & PlaylistFilter) {
  return useQuery({
    queryKey: queryKeys.myPlaylistList(query),
    queryFn: ({ signal }) => fetchMyPlaylists(query, { signal }),
    placeholderData: keepPreviousData,
  });
}

export function useRandomPlaylists() {
  return useQuery({
    queryKey: queryKeys.randomPlaylists,
    queryFn: ({ signal }) => fetchRandomPlaylists({ signal }),
  });
}

export function usePlaylistOptions() {
  return useQuery({
    queryKey: queryKeys.playlistOptions,
    queryFn: ({ signal }) => fetchPlaylistOptions({ signal }),
  });
}

export function usePlaylist(id: PlaylistId) {
  return useQuery({
    queryKey: queryKeys.playlist(id),
    queryFn: ({ signal }) => fetchPlaylist(id, { signal }),
  });
}

export function useCreatePlaylist() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: PlaylistInput) => createPlaylist(input),
    onSuccess: () => invalidateCatalog(client),
  });
}

export function useUpdatePlaylist() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: PlaylistId; patch: PlaylistPatch }) =>
      updatePlaylist(id, patch),
    onSuccess: () => invalidateCatalog(client),
  });
}

export function useDeletePlaylist() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: PlaylistId) => deletePlaylist(id),
    onSuccess: () => invalidateCatalog(client),
  });
}

export function useAddPlaylistSongs(id: PlaylistId) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (songIds: SongId[]) => addPlaylistSongs(id, { songIds }),
    onSuccess: () => invalidateCatalog(client),
  });
}

export function useReorderPlaylistSongs(id: PlaylistId) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (songIds: SongId[]) => reorderPlaylistSongs(id, { songIds }),
    onSuccess: () => invalidateCatalog(client),
  });
}

export function useRemovePlaylistSong(id: PlaylistId) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (songId: SongId) => removePlaylistSong(id, songId),
    onSuccess: () => invalidateCatalog(client),
  });
}
