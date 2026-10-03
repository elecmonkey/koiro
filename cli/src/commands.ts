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
import {
  array,
  number,
  object,
  string,
  type Json,
  type JsonObject,
} from './json';
import { parseLrc, toLines, toReadableLines } from './lyrics';
import { songInput, uploadImage } from './songdoc';
import type { Runtime } from './run';

const MAX_PAGES = 1000;

/** 分页列表：默认取一页；--all 取全部页 */
async function paged(
  args: Arguments,
  fetchPage: (page: number) => Promise<{
    items: Json[];
    page: number;
    totalPages: number;
    total: number;
  }>,
) {
  if (args.has('all') && args.has('page')) usage('Use either --page or --all.');
  const first = args.has('page')
    ? integer(required(args.text('page'), '--page'))
    : 1;
  const result = await fetchPage(first);
  if (!args.has('all')) return result;
  const items = [...result.items];
  for (let page = 2; page <= Math.min(result.totalPages, MAX_PAGES); page++) {
    items.push(...(await fetchPage(page)).items);
  }
  return { items, total: result.total };
}

function pagination(value: Json | undefined) {
  const p = object(value);
  return {
    page: number(p.page),
    totalPages: number(p.totalPages),
    total: number(p.total),
  };
}

/** 列表里的歌曲摘要：去掉体积大的歌词 AST，补上网页地址 */
function summary(api: ApiClient, value: Json): JsonObject {
  const song = object(value);
  const version = song.defaultVersion;
  return {
    ...song,
    url: `${api.webUrl}/songs/${string(song.id)}`,
    defaultVersion:
      version && typeof version === 'object' && !Array.isArray(version)
        ? {
            id: version.id ?? null,
            name: version.name ?? null,
            hasLyrics: Boolean(version.lyrics),
          }
        : null,
  };
}

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

const songPage =
  (api: ApiClient, path: string, key: string) => async (page: number) => {
    const data = object(await api.request(path, 'GET', undefined, { page }));
    return {
      items: array(data[key]).map((item) => summary(api, item)),
      ...pagination(data.pagination),
    };
  };

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
      return paged(args, songPage(api, '/songs', 'songs'));
    case 'random': {
      args.allow([], 2);
      const data = object(await api.request('/songs/random'));
      return { items: array(data.songs).map((item) => summary(api, item)) };
    }
    case 'search': {
      args.allow(['page', 'all'], 3);
      const q = required(args.positionals[2], 'QUERY');
      return paged(args, async (page) => {
        const data = object(
          await api.request('/search', 'GET', undefined, {
            q,
            page,
            pageSize: 50,
          }),
        );
        const items = array(data.results).map((item) => {
          const result = object(item);
          const {
            titleHighlights: _t,
            staffHighlights: _s,
            matchSnippetHighlights: _m,
            ...rest
          } = result;
          return { ...rest, url: `${api.webUrl}/songs/${string(result.id)}` };
        });
        return {
          items,
          page: number(data.page),
          totalPages: number(data.totalPages),
          total: number(data.total),
        };
      });
    }
    case 'view': {
      args.allow([], 3);
      const song = object(object(await api.request(`/songs/${ref()}`)).song);
      return {
        ...song,
        url: `${api.webUrl}/songs/${string(song.id)}`,
        lyrics: array(song.lyrics).map((item) => {
          // 与 export 的歌词版本名保持同一个字段名
          const { content, versionKey, ...rest } = object(item);
          const meta = object(content).meta;
          return {
            ...rest,
            key: versionKey ?? null,
            languages:
              meta && typeof meta === 'object' && !Array.isArray(meta)
                ? (meta.languages ?? [])
                : [],
            lines: toReadableLines(content),
          };
        }),
      };
    }
    case 'export': {
      args.allow([], 3);
      const data = object(await api.request(`/songs/${ref()}/edit`));
      const lyricsKeyById = new Map<string, string>();
      const lyrics = array(data.lyrics).map((item) => {
        const lyr = object(item);
        lyricsKeyById.set(string(lyr.id), string(lyr.key));
        const meta = object(lyr.content).meta;
        return {
          key: lyr.key,
          isDefault: lyr.isDefault,
          languages:
            meta && typeof meta === 'object' && !Array.isArray(meta)
              ? (meta.languages ?? [])
              : [],
          lines: toLines(lyr.content),
        };
      });
      return {
        title: data.title,
        description: data.description,
        coverObjectId: data.coverObjectId,
        staff: data.staff,
        versions: array(data.versions).map((item) => {
          const version = object(item);
          return {
            name: version.name,
            objectId: version.objectId,
            isDefault: version.isDefault,
            lyricsKey:
              typeof version.lyricsId === 'string'
                ? (lyricsKeyById.get(version.lyricsId) ?? null)
                : null,
          };
        }),
        lyrics,
        playlistIds: data.playlistIds,
      };
    }
    case 'update': {
      args.allow(['file'], 3);
      const id = ref();
      const input = await songInput(
        api,
        runtime.cwd,
        required(args.text('file'), '--file'),
        readDocument(runtime),
      );
      await api.request(`/songs/${id}`, 'PUT', input);
      return { ok: true, id, url: `${api.webUrl}/songs/${id}` };
    }
    case 'create': {
      args.allow(['file'], 2);
      const input = await songInput(
        api,
        runtime.cwd,
        required(args.text('file'), '--file'),
        readDocument(runtime),
      );
      const id = string(object(await api.request('/songs', 'POST', input)).id);
      return { ok: true, id, url: `${api.webUrl}/songs/${id}` };
    }
    case 'delete': {
      args.allow([], 3);
      const id = ref();
      await api.request(`/songs/${id}`, 'DELETE');
      return { ok: true, id };
    }
    case 'download': {
      args.allow(['version', 'out', 'force'], 3);
      const song = object(object(await api.request(`/songs/${ref()}`)).song);
      const versions = array(song.versions).map((item) => object(item));
      const wanted = args.text('version');
      const version = wanted
        ? versions.find((item) => item.name === wanted)
        : (versions.find((item) => item.isDefault === true) ?? versions[0]);
      if (!version)
        throw new CliError(
          'not_found',
          wanted
            ? `No audio version named "${wanted}".`
            : 'This song has no audio.',
          5,
          {
            versions: versions.map((item) => item.name ?? null),
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
        `/audio/${string(version.id)}/download`,
        out,
      );
      return { ok: true, path: out, version: version.name ?? null, sizeBytes };
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
  switch (action) {
    case 'list':
      args.allow(['page', 'all'], 2);
      return paged(args, async (page) => {
        const data = object(
          await api.request('/playlists', 'GET', undefined, { page }),
        );
        const items = array(data.playlists).map((item) => {
          const playlist = object(item);
          return {
            ...playlist,
            url: `${api.webUrl}/playlists/${string(playlist.id)}`,
          };
        });
        return { items, ...pagination(data.pagination) };
      });
    case 'view': {
      args.allow(['page', 'all'], 3);
      const id = ref();
      let playlist: Json = null;
      const result = await paged(args, async (page) => {
        const data = object(
          await api.request(`/playlists/${id}`, 'GET', undefined, { page }),
        );
        playlist = data.playlist ?? null;
        return {
          items: array(data.songs).map((item) => summary(api, item)),
          ...pagination(data.pagination),
        };
      });
      return {
        playlist: { ...object(playlist), url: `${api.webUrl}/playlists/${id}` },
        songs: result,
      };
    }
    case 'create': {
      args.allow(
        ['name', 'description', 'description-file', 'cover-file', 'cover-url'],
        2,
      );
      const name = required(args.text('name'), '--name');
      const coverObjectId = await coverOption(args, runtime, api);
      if (!coverObjectId)
        usage('A cover is required: pass --cover-file or --cover-url.');
      const description =
        (await textOption(args, runtime, 'description')) ?? '';
      const id = string(
        object(
          await api.request('/playlists', 'POST', {
            name,
            description,
            coverObjectId,
          }),
        ).id,
      );
      return { ok: true, id, url: `${api.webUrl}/playlists/${id}` };
    }
    case 'edit': {
      args.allow(
        ['name', 'description', 'description-file', 'cover-file', 'cover-url'],
        3,
      );
      const id = ref();
      const body: JsonObject = {};
      if (args.has('name')) body.name = required(args.text('name'), '--name');
      const description = await textOption(args, runtime, 'description');
      if (description !== undefined) body.description = description;
      const coverObjectId = await coverOption(args, runtime, api);
      if (coverObjectId) body.coverObjectId = coverObjectId;
      if (Object.keys(body).length === 0) usage('Nothing to change.');
      await api.request(`/playlists/${id}`, 'PUT', body);
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
      return api.request(`/playlists/${ref()}/songs`, 'POST', {
        songIds: songs(3),
      });
    }
    case 'remove': {
      args.allow([], 4);
      const [song] = songs(3);
      return api.request(`/playlists/${ref()}/songs/${song}`, 'DELETE');
    }
    case 'reorder': {
      args.allow([], 4, Number.MAX_SAFE_INTEGER);
      const id = ref();
      const order = songs(3);
      // 服务端只移动列出的歌曲；要求传入完整列表，避免与未列出的歌曲位置重叠
      const current = new Set<string>();
      for (
        let page = 1, totalPages = 1;
        page <= Math.min(totalPages, MAX_PAGES);
        page++
      ) {
        const data = object(
          await api.request(`/playlists/${id}`, 'GET', undefined, { page }),
        );
        for (const item of array(data.songs))
          current.add(string(object(item).id));
        totalPages = number(object(data.pagination).totalPages);
      }
      const given = new Set(order);
      const missing = [...current].filter((song) => !given.has(song));
      const unknown = [...given].filter((song) => !current.has(song));
      if (
        given.size !== order.length ||
        missing.length > 0 ||
        unknown.length > 0
      )
        usage('reorder needs every song in the playlist exactly once.', {
          missing,
          unknown,
        });
      return api.request(`/playlists/${id}/songs`, 'PUT', { songIds: order });
    }
    default:
      return usage('Unknown playlist command. Run koiro help.');
  }
}

async function browseCommand(
  command: string,
  action: string | undefined,
  args: Arguments,
  api: ApiClient,
): Promise<unknown> {
  if (command === 'staff' && action === 'list') {
    args.allow(['include-singles'], 2);
    return api.request('/staff', 'GET', undefined, {
      includeSingles: args.has('include-singles') ? '1' : undefined,
    });
  }
  if (command === 'language' && action === 'list') {
    args.allow([], 2);
    return api.request('/languages');
  }
  if (action === 'view') {
    args.allow(['page', 'all'], 3);
    const kind = command === 'staff' ? 'staff' : 'languages';
    const key = nameFrom(
      required(args.positionals[2], command === 'staff' ? 'NAME' : 'CODE'),
      kind,
    );
    const path = `/${kind}/${encodeURIComponent(key)}`;
    let info: Json = null;
    const result = await paged(args, async (page) => {
      const data = object(await api.request(path, 'GET', undefined, { page }));
      info = (command === 'staff' ? data.staff : data.language) ?? null;
      return {
        items: array(data.songs).map((item) => summary(api, item)),
        ...pagination(data.pagination),
      };
    });
    return {
      [command === 'staff' ? 'staff' : 'language']: info,
      songs: result,
    };
  }
  return usage(`Unknown ${command} command. Run koiro help.`);
}

/** 需要登录状态之外的业务命令 */
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
    case 'language':
      return browseCommand(command, action, args, api);
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
