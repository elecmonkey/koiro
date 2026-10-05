import type {
  AddedSongs,
  Page,
  PageQuery,
  Playlist,
  PlaylistFilter,
  PlaylistId,
  PlaylistInput,
  PlaylistOption,
  PlaylistPatch,
  PlaylistSongs,
  SongId,
} from '@koiro/shared';
import { request } from '@/http';

type Signal = { signal?: AbortSignal };

export const fetchPlaylists = (
  query: PageQuery & PlaylistFilter,
  { signal }: Signal = {},
) => request<Page<Playlist>>('GET', '/playlists', { query, signal });

export const fetchRandomPlaylists = ({ signal }: Signal = {}) =>
  request<Playlist[]>('GET', '/playlists/random', { signal });

/** 「我的」：非 ADMIN 只返回自己创建的歌单，ADMIN 返回全部 */
export const fetchMyPlaylists = (
  query: PageQuery & PlaylistFilter,
  { signal }: Signal = {},
) => request<Page<Playlist>>('GET', '/playlists/mine', { query, signal });

/** 全部歌单的精简列表 */
export const fetchPlaylistOptions = ({ signal }: Signal = {}) =>
  request<PlaylistOption[]>('GET', '/playlists/options', { signal });

/** 歌单里的歌曲用 fetchSongs({ playlist }) 获取 */
export const fetchPlaylist = (id: PlaylistId, { signal }: Signal = {}) =>
  request<Playlist>('GET', `/playlists/${id}`, { signal });

export const createPlaylist = (input: PlaylistInput) =>
  request<Playlist>('POST', '/playlists', { body: input });

export const updatePlaylist = (id: PlaylistId, patch: PlaylistPatch) =>
  request<Playlist>('PATCH', `/playlists/${id}`, { body: patch });

export const deletePlaylist = (id: PlaylistId) =>
  request<void>('DELETE', `/playlists/${id}`);

/** 追加到末尾；已在歌单里、不存在或重复给出的跳过 */
export const addPlaylistSongs = (id: PlaylistId, body: PlaylistSongs) =>
  request<AddedSongs>('POST', `/playlists/${id}/songs`, { body });

/** 必须给出歌单里全部歌曲的新顺序 */
export const reorderPlaylistSongs = (id: PlaylistId, body: PlaylistSongs) =>
  request<void>('PUT', `/playlists/${id}/songs`, { body });

export const removePlaylistSong = (id: PlaylistId, songId: SongId) =>
  request<void>('DELETE', `/playlists/${id}/songs/${songId}`);
