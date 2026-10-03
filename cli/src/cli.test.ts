import { createHash } from 'node:crypto';
import {
  chmod,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { createServer, type IncomingMessage } from 'node:http';
import { createConnection } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, test } from 'rstack/test';
import { idFrom, nameFrom } from './arguments';
import { normalizeUrl, readConfig, writeConfig } from './config';
import { ApiClient } from './http';
import { object, parseJson, string, type Json } from './json';
import { parseLrc, toLines, toReadableLines } from './lyrics';
import { browserLaunchers, browserLogin, listenForCode } from './login';
import { run, type Runtime } from './run';

const cleanup: (() => Promise<void>)[] = [];
const token = 'private-test-credential';
const songId = '0190a000-0000-7000-8000-000000000001';
const otherSong = '0190a000-0000-7000-8000-000000000002';
const playlistId = '0190a000-0000-7000-8000-000000000003';
const expiresAt = new Date(Date.now() + 86400_000).toISOString();

afterEach(async () => {
  for (const dispose of cleanup.splice(0).toReversed()) await dispose();
});

async function directory() {
  const path = await mkdtemp(join(tmpdir(), 'koiro-cli-test-'));
  cleanup.push(() => rm(path, { recursive: true, force: true }));
  return path;
}

interface Reply {
  status?: number;
  body?: Json;
  text?: string;
  location?: string;
  bytes?: Buffer;
}

interface Received {
  url: URL;
  method: string | undefined;
  body: Buffer;
  auth: string | undefined;
}

async function server(
  handler: (url: URL, request: IncomingMessage, body: Buffer) => Reply,
) {
  const received: Received[] = [];
  const instance = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on('data', (chunk: Buffer) => chunks.push(chunk));
    request.on('end', () => {
      const url = new URL(request.url ?? '/', 'http://test');
      const body = Buffer.concat(chunks);
      received.push({
        url,
        method: request.method,
        body,
        auth: request.headers.authorization,
      });
      const result = handler(url, request, body);
      const payload =
        result.bytes ??
        Buffer.from(
          result.text ??
            (result.body === undefined ? '' : JSON.stringify(result.body)),
        );
      response.writeHead(result.status ?? 200, {
        'content-type':
          result.text === undefined ? 'application/json' : 'text/plain',
        'content-length': String(payload.length),
        ...(result.location ? { location: result.location } : {}),
      });
      response.end(payload);
    });
  });
  await new Promise<void>((resolve) =>
    instance.listen(0, '127.0.0.1', resolve),
  );
  cleanup.push(async () => {
    instance.closeAllConnections();
    await new Promise<void>((resolve) => instance.close(() => resolve()));
  });
  const address = instance.address();
  if (!address || typeof address === 'string') throw new Error('Missing port');
  const origin = `http://127.0.0.1:${String(address.port)}`;
  const json = (index: number) =>
    object(parseJson(received[index]?.body.toString('utf8') ?? ''));
  return { origin, received, json };
}

async function runtime(
  webUrl: string | undefined,
  env: Record<string, string> = { KOIRO_TOKEN: token },
) {
  const configDir = await directory();
  const out: string[] = [];
  const err: string[] = [];
  const io: Runtime = {
    cwd: configDir,
    configDir,
    env: { ...(webUrl ? { KOIRO_WEB_URL: webUrl } : {}), ...env },
    stdin: () => Promise.resolve(''),
    stdout: (text) => out.push(text),
    stderr: (text) => err.push(text),
  };
  return {
    io,
    output: () => object(parseJson(out.join(''))),
    error: () => object(object(parseJson(err.join(''))).error),
    call: async (...args: string[]) => {
      out.length = 0;
      err.length = 0;
      return run([...args, '--json'], io);
    },
  };
}

test('songs and playlists can be named by UUID or by a site link', () => {
  expect(idFrom(songId, 'songs')).toBe(songId);
  expect(idFrom(`https://music.example.com/songs/${songId}?t=1`, 'songs')).toBe(
    songId,
  );
  expect(
    idFrom(`https://music.example.com/playlists/${playlistId}`, 'playlists'),
  ).toBe(playlistId);
  expect(() =>
    idFrom(`https://music.example.com/playlists/${playlistId}`, 'songs'),
  ).toThrow();
  expect(() => idFrom('not-an-id', 'songs')).toThrow();
  expect(nameFrom('https://music.example.com/staff/%E7%94%B2', 'staff')).toBe(
    '甲',
  );
  expect(nameFrom('ja', 'languages')).toBe('ja');
});

test('LRC becomes editable lines, and stored lyrics round-trip with ruby', () => {
  expect(
    parseLrc('[ti:Title]\n[00:01.2][00:05.00]la la\n[00:03.456]next\nuntimed'),
  ).toEqual([
    { startMs: 0, text: 'untimed' },
    { startMs: 1200, text: 'la la' },
    { startMs: 3456, text: 'next' },
    { startMs: 5000, text: 'la la' },
  ]);
  const content: Json = {
    type: 'doc',
    blocks: [
      {
        type: 'line',
        time: { startMs: 10, endMs: 20 },
        children: [
          { type: 'ruby', base: '君', ruby: 'きみ' },
          { type: 'text', text: 'の' },
          { type: 'ruby', base: '声', ruby: 'こえ' },
        ],
      },
      {
        type: 'line',
        time: { startMs: 30 },
        children: [{ type: 'text', text: '' }],
      },
    ],
  };
  expect(toLines(content)).toEqual([
    {
      startMs: 10,
      endMs: 20,
      text: '君/の/声',
      rubyByIndex: { '0': 'きみ', '2': 'こえ' },
    },
    { startMs: 30, text: '' },
  ]);
  expect(toReadableLines(content)[0]).toEqual({
    startMs: 10,
    endMs: 20,
    text: '君(きみ)の声(こえ)',
  });
});

test('configuration rejects public cleartext sites and unsafe files, and keeps other logins', async () => {
  expect(normalizeUrl('https://music.example.com/')).toBe(
    'https://music.example.com',
  );
  expect(normalizeUrl('http://127.0.0.1:3720')).toBe('http://127.0.0.1:3720');
  expect(() => normalizeUrl('http://music.example.com')).toThrow();

  const dir = await directory();
  await writeConfig(dir, {
    sessions: { 'https://a.example.com': { token: 'a', expiresAt } },
  });
  expect((await stat(join(dir, 'config.json'))).mode & 0o777).toBe(0o600);
  expect((await readConfig(dir)).sessions['https://a.example.com']?.token).toBe(
    'a',
  );

  await chmod(join(dir, 'config.json'), 0o644);
  await expect(readConfig(dir)).rejects.toMatchObject({ exitCode: 1 });
});

test('the installed site is the default and every override takes precedence', async () => {
  const fixture = await server(() => ({
    body: { user: { id: 'u', permissions: 1 }, allowAnonymous: false },
  }));
  const io = await runtime(undefined, { KOIRO_TOKEN: token });

  expect(await io.call('auth', 'status')).toBe(2);
  expect(io.error().code).toBe('config');

  io.io.bundledSite = fixture.origin;
  expect(await io.call('config', 'get')).toBe(0);
  expect(io.output().webUrl).toBe(fixture.origin);

  io.io.env.KOIRO_WEB_URL = 'https://env.example.com';
  expect(await io.call('config', 'get')).toBe(0);
  expect(io.output().webUrl).toBe('https://env.example.com');
  expect(
    await io.call('config', 'get', '--web-url', 'https://flag.example.com'),
  ).toBe(0);
  expect(io.output().webUrl).toBe('https://flag.example.com');
});

test('HTTP failures map to stable exit codes and readable messages', async () => {
  const replies: Record<string, Reply> = {
    '/api/songs': { status: 401, body: { error: 'x' } },
    '/api/playlists': { status: 403, body: { error: 'x' } },
    [`/api/songs/${songId}`]: { status: 404, body: { error: 'x' } },
    '/api/staff': { status: 422, text: 'missing field `title`' },
    '/api/languages': { status: 400, body: { error: '歌曲名不能为空' } },
    '/api/search': { status: 502, text: '<html>bad gateway</html>' },
  };
  const fixture = await server(
    (url) => replies[url.pathname] ?? { status: 500 },
  );
  const io = await runtime(fixture.origin);

  expect(await io.call('song', 'list')).toBe(3);
  expect(await io.call('playlist', 'list')).toBe(4);
  expect(await io.call('song', 'view', songId)).toBe(5);
  expect(await io.call('staff', 'list')).toBe(8);
  expect(io.error().message).toBe('missing field `title`');
  expect(await io.call('language', 'list')).toBe(8);
  expect(io.error().message).toBe('歌曲名不能为空');
  expect(await io.call('song', 'search', 'x')).toBe(8);
  expect(io.error().message).toBe('Koiro returned HTTP 502.');
  expect(
    fixture.received.every((entry) => entry.auth === `Bearer ${token}`),
  ).toBe(true);

  const closed = await runtime('http://127.0.0.1:1');
  expect(await closed.call('song', 'list')).toBe(7);
});

test('without a login, reads go out anonymously and an expired saved login stops before any request', async () => {
  const fixture = await server(() => ({
    body: { songs: [], pagination: { page: 1, totalPages: 1, total: 0 } },
  }));
  const anonymous = await runtime(fixture.origin, {});
  expect(await anonymous.call('song', 'list')).toBe(0);
  expect(fixture.received[0]?.auth).toBeUndefined();

  const expired = await runtime(fixture.origin, {});
  await writeConfig(expired.io.configDir, {
    sessions: {
      [fixture.origin]: {
        token,
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      },
    },
  });
  expect(await expired.call('song', 'list')).toBe(3);
  expect(fixture.received).toHaveLength(1);
});

test('export maps lyrics bindings to keys, and update uploads local files then replaces the song', async () => {
  const edit: Json = {
    title: 'Song',
    description: 'd',
    coverObjectId: 'img/old.webp',
    staff: [{ role: '作曲', name: ['甲'] }],
    versions: [
      {
        id: 'v1',
        name: '主版本',
        objectId: 'music/a.flac',
        isDefault: true,
        lyricsId: 'l1',
      },
      {
        id: 'v2',
        name: '伴奏',
        objectId: 'music/b.flac',
        isDefault: false,
        lyricsId: null,
      },
    ],
    lyrics: [
      {
        id: 'l1',
        key: '原文',
        isDefault: true,
        content: { type: 'doc', meta: { languages: ['ja'] }, blocks: [] },
      },
    ],
    playlistIds: [playlistId],
  };
  let storage = '';
  const fixture = await server((url): Reply => {
    if (url.pathname === `/api/songs/${songId}/edit`) return { body: edit };
    if (url.pathname === '/api/uploads/image')
      return { body: { objectId: 'img/new.webp' } };
    if (url.pathname === '/api/uploads/audio')
      return {
        body: {
          url: `${storage}/put`,
          objectId: 'music/new.flac',
          headers: { 'content-type': 'audio/flac' },
        },
      };
    if (url.pathname === '/put') return { body: null };
    if (url.pathname === `/api/songs/${songId}`) return { body: { ok: true } };
    return { status: 500 };
  });
  storage = fixture.origin;
  const io = await runtime(fixture.origin);

  expect(await io.call('song', 'export', songId)).toBe(0);
  const doc = io.output();
  expect(doc.versions).toEqual([
    {
      name: '主版本',
      objectId: 'music/a.flac',
      isDefault: true,
      lyricsKey: '原文',
    },
    {
      name: '伴奏',
      objectId: 'music/b.flac',
      isDefault: false,
      lyricsKey: null,
    },
  ]);
  expect(doc.lyrics).toEqual([
    { key: '原文', isDefault: true, languages: ['ja'], lines: [] },
  ]);

  const dir = io.io.cwd;
  await writeFile(join(dir, 'cover.png'), 'png');
  await writeFile(join(dir, 'inst.flac'), 'flac');
  await writeFile(join(dir, 'tr.lrc'), '[00:01.00]hello');
  const { coverObjectId: _cover, ...rest } = doc;
  const versions = (doc.versions as Json[]).map((item) =>
    object(item).name === '伴奏'
      ? { name: '伴奏', audioFile: 'inst.flac' }
      : item,
  );
  const lyrics = [
    ...(doc.lyrics as Json[]),
    { key: '翻译', languages: ['zh'], lrcFile: 'tr.lrc' },
  ];
  await writeFile(
    join(dir, 'song.json'),
    JSON.stringify({ ...rest, coverFile: 'cover.png', versions, lyrics }),
  );

  expect(await io.call('song', 'update', songId, '--file', 'song.json')).toBe(
    0,
  );
  const put = fixture.received.findIndex(
    (entry) => entry.method === 'PUT' && entry.url.pathname.startsWith('/api'),
  );
  const body = fixture.json(put);
  expect(body.coverObjectId).toBe('img/new.webp');
  expect(body.versions).toEqual([
    {
      name: '主版本',
      objectId: 'music/a.flac',
      isDefault: true,
      lyricsKey: '原文',
    },
    { name: '伴奏', objectId: 'music/new.flac' },
  ]);
  expect(object((body.lyrics as Json[])[1])).toEqual({
    key: '翻译',
    languages: ['zh'],
    lines: [{ startMs: 1000, text: 'hello' }],
  });
  expect(body.playlistIds).toEqual([playlistId]);
  expect(body.coverFile).toBeUndefined();
  const storagePut = fixture.received.find(
    (entry) => entry.url.pathname === '/put',
  );
  expect(storagePut?.auth).toBeUndefined();
  expect(storagePut?.body.toString()).toBe('flac');
});

test('reorder must name every song in the playlist exactly once', async () => {
  const fixture = await server((url, request): Reply => {
    if (request.method === 'GET')
      return {
        body: {
          playlist: { id: playlistId },
          songs: [
            { id: url.searchParams.get('page') === '1' ? songId : otherSong },
          ],
          pagination: { page: 1, totalPages: 2, total: 2 },
        },
      };
    return { body: { ok: true } };
  });
  const io = await runtime(fixture.origin);

  expect(await io.call('playlist', 'reorder', playlistId, songId)).toBe(2);
  expect(io.error().details).toEqual({ missing: [otherSong], unknown: [] });
  expect(await io.call('playlist', 'reorder', playlistId, songId, songId)).toBe(
    2,
  );
  expect(fixture.received.some((entry) => entry.method === 'PUT')).toBe(false);

  expect(
    await io.call('playlist', 'reorder', playlistId, otherSong, songId),
  ).toBe(0);
  const put = fixture.received.findIndex((entry) => entry.method === 'PUT');
  expect(fixture.json(put)).toEqual({ songIds: [otherSong, songId] });
});

test('download follows the signed address without credentials and refuses to overwrite', async () => {
  let origin = '';
  const fixture = await server((url) => {
    if (url.pathname === `/api/songs/${songId}`)
      return {
        body: {
          song: {
            id: songId,
            versions: [
              { id: 'v1', name: '主版本', isDefault: true },
              { id: 'v2', name: '伴奏', isDefault: false },
            ],
          },
        },
      };
    if (url.pathname === '/api/audio/v2/download')
      return { status: 302, location: `${origin}/object` };
    if (url.pathname === '/object') return { bytes: Buffer.from('audio') };
    return { status: 500 };
  });
  origin = fixture.origin;
  const io = await runtime(fixture.origin);

  expect(
    await io.call(
      'song',
      'download',
      songId,
      '--version',
      '人声',
      '--out',
      'a.flac',
    ),
  ).toBe(5);
  expect(io.error().details).toEqual({ versions: ['主版本', '伴奏'] });

  expect(
    await io.call(
      'song',
      'download',
      songId,
      '--version',
      '伴奏',
      '--out',
      'a.flac',
    ),
  ).toBe(0);
  expect(io.output().sizeBytes).toBe(5);
  expect(await readFile(join(io.io.cwd, 'a.flac'), 'utf8')).toBe('audio');
  expect(
    fixture.received.find((entry) => entry.url.pathname === '/object')?.auth,
  ).toBeUndefined();

  expect(
    await io.call(
      'song',
      'download',
      songId,
      '--version',
      '伴奏',
      '--out',
      'a.flac',
    ),
  ).toBe(2);
});

test('browser login binds state and PKCE and exchanges without credentials', async () => {
  let challenge = '';
  const fixture = await server((_url, _request, body) => {
    const data = object(parseJson(body.toString('utf8')));
    expect(
      createHash('sha256')
        .update(string(data.codeVerifier))
        .digest('base64url'),
    ).toBe(challenge);
    return { body: { token, expiresAt, user: { id: 'u' } } };
  });
  let callback: Promise<Response> | undefined;
  const result = await browserLogin(
    new ApiClient(fixture.origin),
    fixture.origin,
    true,
    (message) => {
      const line = message.split('\n')[1];
      if (!line) return;
      const url = new URL(line);
      expect(url.pathname).toBe('/auth/cli');
      challenge = url.searchParams.get('codeChallenge') ?? '';
      const redirect = new URL(url.searchParams.get('redirectUri') ?? '');
      redirect.searchParams.set('state', url.searchParams.get('state') ?? '');
      redirect.searchParams.set('code', 'c'.repeat(64));
      callback = fetch(redirect);
    },
  );
  expect(result.session.token).toBe(token);
  expect((await callback)?.status).toBe(200);
  expect(fixture.received[0]?.url.pathname).toBe('/api/auth/cli/exchange');
  expect(fixture.received[0]?.auth).toBeUndefined();
});

test('the loopback listener rejects bad callbacks without consuming the valid attempt', async () => {
  const state = 'a'.repeat(64);
  const listener = await listenForCode(state, 5000);
  try {
    const url = new URL(listener.redirectUri);
    url.searchParams.set('code', 'b'.repeat(64));
    url.searchParams.set('state', 'c'.repeat(64));
    expect((await fetch(url)).status).toBe(400);
    url.searchParams.set('state', state);
    const wrongHost = await new Promise<number>((resolve, reject) => {
      const socket = createConnection(
        { host: url.hostname, port: Number(url.port) },
        () => {
          socket.write(
            `GET ${url.pathname}${url.search} HTTP/1.1\r\nHost: evil.test\r\nConnection: close\r\n\r\n`,
          );
        },
      );
      socket.once('data', (chunk) => {
        const match = /^HTTP\/1\.1 (\d{3})/.exec(chunk.toString());
        socket.destroy();
        if (match?.[1]) resolve(Number(match[1]));
        else reject(new Error('Invalid response'));
      });
      socket.on('error', reject);
    });
    expect(wrongHost).toBe(400);
    expect((await fetch(url)).status).toBe(200);
    expect(await listener.code).toBe('b'.repeat(64));
    expect((await fetch(url)).status).toBe(400);
  } finally {
    await listener.close();
  }
  const timeout = await listenForCode(state, 20);
  try {
    await expect(timeout.code).rejects.toMatchObject({ code: 'login_timeout' });
  } finally {
    await timeout.close();
  }
});

test('browser launchers never hand the URL to a shell', () => {
  const url = 'https://music.example.com/auth/cli?state=a&codeChallenge=b';
  for (const platform of ['darwin', 'win32', 'linux'] as const) {
    for (const launcher of browserLaunchers(url, platform)) {
      expect(launcher.args).toContain(url);
      expect(launcher.command).not.toMatch(/[\s&|;]/);
    }
  }
});
