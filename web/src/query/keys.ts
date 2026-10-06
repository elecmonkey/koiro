import type {
  PageQuery,
  PlaylistFilter,
  PlaylistId,
  SearchQuery,
  SongFilter,
  SongId,
  UserFilter,
} from '@koiro/shared';

/**
 * 所有 query key 集中在这里，失效时与查询不会对不上。
 * key 按资源嵌套：让 `songs` 失效，会一并刷新歌曲的列表、详情和各种筛选。
 */
export const queryKeys = {
  session: ['session'] as const,
  profile: ['profile'] as const,

  songs: ['songs'] as const,
  songList: (query: PageQuery & SongFilter) =>
    ['songs', 'list', query] as const,
  mySongList: (query: PageQuery & SongFilter) =>
    ['songs', 'mine', query] as const,
  allSongs: (filter: SongFilter) => ['songs', 'all', filter] as const,
  randomSongs: ['songs', 'random'] as const,
  songOptions: ['songs', 'options'] as const,
  song: (id: SongId) => ['songs', 'detail', id] as const,
  songInput: (id: SongId) => ['songs', 'input', id] as const,

  playlists: ['playlists'] as const,
  playlistList: (query: PageQuery & PlaylistFilter) =>
    ['playlists', 'list', query] as const,
  myPlaylistList: (query: PageQuery & PlaylistFilter) =>
    ['playlists', 'mine', query] as const,
  randomPlaylists: ['playlists', 'random'] as const,
  myPlaylistOptions: ['playlists', 'mine', 'options'] as const,
  playlist: (id: PlaylistId) => ['playlists', 'detail', id] as const,

  staff: ['staff'] as const,
  staffMember: (name: string) => ['staff', name] as const,
  languages: ['languages'] as const,
  search: (query: PageQuery & SearchQuery) => ['search', query] as const,

  users: ['users'] as const,
  userList: (query: PageQuery & UserFilter) =>
    ['users', 'list', query] as const,
};
