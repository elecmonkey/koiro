import type {
  Page,
  PageQuery,
  SongDetail,
  SongFilter,
  SongId,
  SongInput,
  SongOption,
  SongSummary,
} from '@koiro/shared';
import { request } from '@/http';

type Signal = { signal?: AbortSignal };

/** 歌曲列表；筛选条件可以组合 */
export const fetchSongs = (
  query: PageQuery & SongFilter,
  { signal }: Signal = {},
) => request<Page<SongSummary>>('GET', '/songs', { query, signal });

export const fetchRandomSongs = ({ signal }: Signal = {}) =>
  request<SongSummary[]>('GET', '/songs/random', { signal });

/** 「我的」：非 ADMIN 只返回自己创建的歌曲，ADMIN 返回全部 */
export const fetchMySongs = (
  query: PageQuery & SongFilter,
  { signal }: Signal = {},
) => request<Page<SongSummary>>('GET', '/songs/mine', { query, signal });

/** 全部歌曲的精简列表 */
export const fetchSongOptions = ({ signal }: Signal = {}) =>
  request<SongOption[]>('GET', '/songs/options', { signal });

export const fetchSong = (id: SongId, { signal }: Signal = {}) =>
  request<SongDetail>('GET', `/songs/${id}`, { signal });

/** 现有歌曲的可编辑形式，原样修改后交给 replaceSong */
export const fetchSongInput = (id: SongId, { signal }: Signal = {}) =>
  request<SongInput>('GET', `/songs/${id}/input`, { signal });

export const createSong = (input: SongInput) =>
  request<SongDetail>('POST', '/songs', { body: input });

export const replaceSong = (id: SongId, input: SongInput) =>
  request<SongDetail>('PUT', `/songs/${id}`, { body: input });

export const deleteSong = (id: SongId) =>
  request<void>('DELETE', `/songs/${id}`);
