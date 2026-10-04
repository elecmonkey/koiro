import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from './keys';

/**
 * 歌曲或歌单变化后，凡是由它们派生的查询都要刷新：
 * 歌单的歌曲数、staff 和语种的统计、搜索结果都依赖歌曲内容
 */
export function invalidateCatalog(client: QueryClient) {
  return Promise.all(
    [
      queryKeys.songs,
      queryKeys.playlists,
      queryKeys.staff,
      queryKeys.languages,
      ['search'],
    ].map((queryKey) => client.invalidateQueries({ queryKey })),
  );
}
