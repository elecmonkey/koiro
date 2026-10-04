import type {
  LanguageStat,
  Page,
  PageQuery,
  SearchHit,
  SearchQuery,
  StaffMember,
} from '@koiro/shared';
import { request } from '@/http';

type Signal = { signal?: AbortSignal };

/** 所有参与者，按参与的歌曲数从多到少；他们的歌曲用 fetchSongs({ staff }) 获取 */
export const fetchStaff = ({ signal }: Signal = {}) =>
  request<StaffMember[]>('GET', '/staff', { signal });

export const fetchStaffMember = (name: string, { signal }: Signal = {}) =>
  request<StaffMember>('GET', `/staff/${encodeURIComponent(name)}`, { signal });

/** 歌词用到的语种；某个语种的歌曲用 fetchSongs({ language }) 获取 */
export const fetchLanguages = ({ signal }: Signal = {}) =>
  request<LanguageStat[]>('GET', '/languages', { signal });

export const searchSongs = (
  query: PageQuery & SearchQuery,
  { signal }: Signal = {},
) => request<Page<SearchHit>>('GET', '/search', { query, signal });
