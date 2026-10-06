import {
  LANGUAGES,
  isLanguage,
  parseLrc,
  readableText,
  type AddedSongs,
  type LanguageStat,
  type Page,
  type Playlist,
  type PlaylistPatch,
  type SearchHit,
  type SongDetail,
  type SongInput,
  type SongSummary,
  type StaffMember,
  type TextSegment,
} from '@koiro/shared';
import { lstat, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  idFrom,
  integer,
  nameFrom,
  required,
  type Arguments,
} from './arguments';
import { CliError, usage } from './errors';
import type { ApiClient } from './http';
import { languageList } from './languages';
import { newSong, songInput, uploadImage } from './songdoc';
import type { Runtime } from './run';

/** `--all` 时每页取的条数（接口上限） */
const ALL_PAGE_SIZE = 100;
const MAX_PAGES = 1000;

type Query = Record<string, string | number | undefined>;

/** 分页列表：默认取一页；`--all` 依次取完所有页，返回 `{ items, total }` */
async function paged<T, U>(
  args: Arguments,
  api: ApiClient,
  path: string,
  query: Query,
  map: (item: T) => U,
): Promise<Page<U> | { items: U[]; total: number }> {
  if (args.has('all') && args.has('page')) usage('Use either --page or --all.');
  const fetchPage = async (page: number, pageSize?: number) => {
    const result = await api.request<Page<T>>(path, 'GET', undefined, {
      ...query,
      page,
      pageSize,
    });
    return { ...result, items: result.items.map(map) };
  };
  if (!args.has('all')) {
    return fetchPage(
      args.has('page') ? integer(required(args.text('page'), '--page')) : 1,
    );
  }
  const first = await fetchPage(1, ALL_PAGE_SIZE);
  const items = [...first.items];
  for (let page = 2; page <= Math.min(first.totalPages, MAX_PAGES); page++) {
    items.push(...(await fetchPage(page, ALL_PAGE_SIZE)).items);
  }
  return { items, total: first.total };
}

const songUrl = (api: ApiClient, id: string) => `${api.webUrl}/songs/${id}`;
const playlistUrl = (api: ApiClient, id: string) =>
  `${api.webUrl}/playlists/${id}`;

/** 列表里的歌曲：补上网页地址 */
const summary = (api: ApiClient) => (song: SongSummary) => ({
  ...song,
  url: songUrl(api, song.id),
});

const playlistItem = (api: ApiClient) => (playlist: Playlist) => ({
  ...playlist,
  url: playlistUrl(api, playlist.id),
});

const segmentsText = (segments: readonly TextSegment[]) =>
  segments.map((segment) => segment.text).join('');

async function textOption(args: Arguments, runtime: Runtime, key: string) {
  const fileKey = `${key}-file`;
  if (args.has(key) && args.has(fileKey))
    usage(`Use either --${key} or --${fileKey}.`);
  if (args.has(key)) return args.text(key) ?? '';
  if (!args.has(fileKey)) return undefined;
  const file = required(args.text(fileKey), `--${fileKey}`);
  return file === '-'
    ? runtime.stdin()
    : readFile(resolve(runtime.cwd, file), 'utf8');
}

async function coverOption(args: Arguments, runtime: Runtime, api: ApiClient) {
  if (args.has('cover-file') && args.has('cover-url'))
    usage('Use either --cover-file or --cover-url.');
  if (args.has('cover-file'))
    return uploadImage(api, {
      file: resolve(
        runtime.cwd,
        required(args.text('cover-file'), '--cover-file'),
      ),
    });
  if (args.has('cover-url'))
    return uploadImage(api, {
      url: required(args.text('cover-url'), '--cover-url'),
    });
  return undefined;
}

function readDocument(runtime: Runtime) {
  return (path: string) =>
    path === '-'
      ? runtime.stdin()
      : readFile(resolve(runtime.cwd, path), 'utf8');
}

async function songCommand(
  action: string | undefined,
  args: Arguments,
  api: ApiClient,
  runtime: Runtime,
): Promise<unknown> {
  const ref = () => idFrom(required(args.positionals[2], 'SONG'), 'songs');
  switch (action) {
    case 'list':
      args.allow(['page', 'all'], 2);
      return paged(args, api, '/songs', {}, summary(api));
    case 'random':
      args.allow([], 2);
      return {
        items: (await api.request<SongSummary[]>('/songs/random')).map(
          summary(api),
        ),
      };
    case 'search': {
      args.allow(['page', 'all'], 3);
      const q = required(args.positionals[2], 'QUERY');
      return paged(args, api, '/search', { q }, (hit: SearchHit) => ({
        ...summary(api)(hit.song),
        matched: hit.matched,
        lyricsExcerpt: hit.lyricsExcerpt && segmentsText(hit.lyricsExcerpt),
      }));
    }
    case 'view': {
      args.allow([], 3);
      const song = await api.request<SongDetail>(`/songs/${ref()}`);
      return {
        ...song,
        url: songUrl(api, song.id),
        lyrics: song.lyrics.map((lyrics) => ({
          ...lyrics,
          lines: lyrics.lines.map(({ spans, ...line }) => ({
            ...line,
            text: readableText(spans),
          })),
        })),
      };
    }
    case 'export':
      args.allow([], 3);
      return api.request<SongInput>(`/songs/${ref()}/input`);
    case 'update': {
      args.allow(['file'], 3);
      const id = ref();
      const input = await songInput(
        api,
        runtime.cwd,
        required(args.text('file'), '--file'),
        readDocument(runtime),
      );
      await api.request<SongDetail>(`/songs/${id}`, 'PUT', input);
      return { ok: true, id, url: songUrl(api, id) };
    }
    case 'create': {
      args.allow(['file'], 2);
      const input = await newSong(
        api,
        runtime.cwd,
        required(args.text('file'), '--file'),
        readDocument(runtime),
      );
      const song = await api.request<SongDetail>('/songs', 'POST', input);
      return { ok: true, id: song.id, url: songUrl(api, song.id) };
    }
    case 'delete': {
      args.allow([], 3);
      const id = ref();
      await api.request(`/songs/${id}`, 'DELETE');
      return { ok: true, id };
    }
    case 'download': {
      args.allow(['version', 'out', 'force'], 3);
      const song = await api.request<SongDetail>(`/songs/${ref()}`);
      const wanted = args.text('version');
      const version = wanted
        ? song.versions.find((item) => item.name === wanted)
        : song.versions.find((item) => item.isDefault);
      if (!version)
        throw new CliError(
          'not_found',
          `No audio version named "${wanted ?? ''}".`,
          5,
          {
            versions: song.versions.map((item) => item.name),
          },
        );
      const out = resolve(runtime.cwd, required(args.text('out'), '--out'));
      if (!args.has('force')) {
        const exists = await lstat(out).then(
          () => true,
          () => false,
        );
        if (exists)
          usage(`${out} already exists. Pass --force to overwrite it.`);
      }
      const { sizeBytes } = await api.download(
        `/audio/${version.id}/download`,
        out,
      );
      return { ok: true, path: out, version: version.name, sizeBytes };
    }
    default:
      return usage('Unknown song command. Run koiro help.');
  }
}

async function playlistCommand(
  action: string | undefined,
  args: Arguments,
  api: ApiClient,
  runtime: Runtime,
): Promise<unknown> {
  const ref = () =>
    idFrom(required(args.positionals[2], 'PLAYLIST'), 'playlists');
  const songs = (from: number) => {
    const ids = args.positionals
      .slice(from)
      .map((value) => idFrom(value, 'songs'));
    if (ids.length === 0) usage('At least one SONG is required.');
    return ids;
  };
  const editOptions = [
    'name',
    'description',
    'description-file',
    'cover-file',
    'cover-url',
  ];
  switch (action) {
    case 'list':
      args.allow(['page', 'all'], 2);
      return paged(args, api, '/playlists', {}, playlistItem(api));
    case 'view': {
      args.allow(['page', 'all'], 3);
      const id = ref();
      const playlist = await api.request<Playlist>(`/playlists/${id}`);
      return {
        playlist: playlistItem(api)(playlist),
        songs: await paged(args, api, '/songs', { playlist: id }, summary(api)),
      };
    }
    case 'create': {
      args.allow(editOptions, 2);
      const name = required(args.text('name'), '--name');
      const coverObjectId = await coverOption(args, runtime, api);
      if (!coverObjectId)
        usage('A cover is required: pass --cover-file or --cover-url.');
      const description =
        (await textOption(args, runtime, 'description')) ?? '';
      const playlist = await api.request<Playlist>('/playlists', 'POST', {
        name,
        description,
        coverObjectId,
      });
      return { ok: true, id: playlist.id, url: playlistUrl(api, playlist.id) };
    }
    case 'edit': {
      args.allow(editOptions, 3);
      const id = ref();
      const patch: PlaylistPatch = {};
      if (args.has('name')) patch.name = required(args.text('name'), '--name');
      const description = await textOption(args, runtime, 'description');
      if (description !== undefined) patch.description = description;
      const coverObjectId = await coverOption(args, runtime, api);
      if (coverObjectId) patch.coverObjectId = coverObjectId;
      if (Object.keys(patch).length === 0) usage('Nothing to change.');
      await api.request<Playlist>(`/playlists/${id}`, 'PATCH', patch);
      return { ok: true, id };
    }
    case 'delete': {
      args.allow([], 3);
      const id = ref();
      await api.request(`/playlists/${id}`, 'DELETE');
      return { ok: true, id };
    }
    case 'add': {
      args.allow([], 4, Number.MAX_SAFE_INTEGER);
      const result = await api.request<AddedSongs>(
        `/playlists/${ref()}/songs`,
        'POST',
        { songIds: songs(3) },
      );
      return { ok: true, ...result };
    }
    case 'remove': {
      args.allow([], 4);
      const [song] = songs(3);
      await api.request(`/playlists/${ref()}/songs/${song}`, 'DELETE');
      return { ok: true };
    }
    case 'reorder': {
      args.allow([], 4, Number.MAX_SAFE_INTEGER);
      await api.request(`/playlists/${ref()}/songs`, 'PUT', {
        songIds: songs(3),
      });
      return { ok: true };
    }
    default:
      return usage('Unknown playlist command. Run koiro help.');
  }
}

async function staffCommand(
  action: string | undefined,
  args: Arguments,
  api: ApiClient,
): Promise<unknown> {
  if (action === 'list') {
    args.allow([], 2);
    return { items: await api.request<StaffMember[]>('/staff') };
  }
  if (action === 'view') {
    args.allow(['page', 'all'], 3);
    const name = nameFrom(required(args.positionals[2], 'NAME'), 'staff');
    return {
      staff: await api.request<StaffMember>(
        `/staff/${encodeURIComponent(name)}`,
      ),
      songs: await paged(args, api, '/songs', { staff: name }, summary(api)),
    };
  }
  return usage('Unknown staff command. Run koiro help.');
}

async function languageCommand(
  action: string | undefined,
  args: Arguments,
  api: ApiClient,
): Promise<unknown> {
  if (action === 'list') {
    args.allow([], 2);
    return { items: await api.request<LanguageStat[]>('/languages') };
  }
  if (action === 'view') {
    args.allow(['page', 'all'], 3);
    const code = nameFrom(required(args.positionals[2], 'CODE'), 'languages');
    if (!isLanguage(code))
      usage(`Unknown language code. Use one of: ${languageList}.`, {
        languages: LANGUAGES,
      });
    return {
      language: code,
      songs: await paged(args, api, '/songs', { language: code }, summary(api)),
    };
  }
  return usage('Unknown language command. Run koiro help.');
}

/** 需要访问站点的业务命令 */
export async function businessCommand(
  args: Arguments,
  api: ApiClient,
  runtime: Runtime,
): Promise<unknown> {
  const [command, action] = args.positionals;
  switch (command) {
    case 'song':
      return songCommand(action, args, api, runtime);
    case 'playlist':
      return playlistCommand(action, args, api, runtime);
    case 'staff':
      return staffCommand(action, args, api);
    case 'language':
      return languageCommand(action, args, api);
    default:
      return usage('Unknown command. Run koiro help.');
  }
}

/** 纯本地的命令：不联网 */
export async function localCommand(
  args: Arguments,
  runtime: Runtime,
): Promise<unknown> {
  const [command, action] = args.positionals;
  if (command === 'lyrics' && action === 'from-lrc') {
    args.allow([], 3);
    const file = required(args.positionals[2], 'FILE');
    const text =
      file === '-'
        ? await runtime.stdin()
        : await readFile(resolve(runtime.cwd, file), 'utf8');
    return { lines: parseLrc(text) };
  }
  return undefined;
}
