import type { PageQuery, SearchQuery } from '@koiro/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  fetchLanguages,
  fetchStaff,
  fetchStaffMember,
  searchSongs,
} from '@/api';
import { queryKeys } from './keys';

export function useStaff() {
  return useQuery({
    queryKey: queryKeys.staff,
    queryFn: ({ signal }) => fetchStaff({ signal }),
  });
}

export function useStaffMember(name: string) {
  return useQuery({
    queryKey: queryKeys.staffMember(name),
    queryFn: ({ signal }) => fetchStaffMember(name, { signal }),
  });
}

export function useLanguages() {
  return useQuery({
    queryKey: queryKeys.languages,
    queryFn: ({ signal }) => fetchLanguages({ signal }),
  });
}

/** 关键字为空时不发请求 */
export function useSearch(query: PageQuery & SearchQuery) {
  return useQuery({
    queryKey: queryKeys.search(query),
    queryFn: ({ signal }) => searchSongs(query, { signal }),
    enabled: query.q.trim() !== '',
    placeholderData: keepPreviousData,
  });
}
