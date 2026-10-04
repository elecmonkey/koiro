import {
  LANGUAGES,
  isLanguage,
  parseLrc,
  type AudioUpload,
  type SongInput,
  type UploadedImage,
} from '@koiro/shared';
import { readFile, stat } from 'node:fs/promises';
import { basename, dirname, extname, resolve } from 'node:path';
import { usage } from './errors';
import type { ApiClient } from './http';
import type { JsonObject } from './json';
import { languageList } from './languages';

const MAX_IMAGE_BYTES = 30 * 1024 * 1024;
const MAX_AUDIO_BYTES = 500 * 1024 * 1024;

const audioTypes: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.flac': 'audio/flac',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.oga': 'audio/ogg',
  '.opus': 'audio/ogg',
};

async function readLocal(path: string, max: number, label: string) {
  const info = await stat(path).catch(() =>
    usage(`${label} not found: ${path}`),
  );
  if (!info.isFile()) usage(`${label} is not a file: ${path}`);
  if (info.size > max)
    usage(
      `${label} is too large (max ${String(max / 1024 / 1024)} MB): ${path}`,
    );
  return readFile(path);
}

/** 上传本地图片，或让服务端下载网络图片；返回对象 ID */
export async function uploadImage(
  api: ApiClient,
  source: { file?: string; url?: string },
): Promise<string> {
  if (source.file) {
    const data = await readLocal(source.file, MAX_IMAGE_BYTES, 'Image');
    return (
      await api.upload<UploadedImage>(
        '/uploads/images',
        data,
        'application/octet-stream',
      )
    ).objectId;
  }
  if (source.url) {
    return (
      await api.request<UploadedImage>('/uploads/images/from-url', 'POST', {
        url: source.url,
      })
    ).objectId;
  }
  return usage('An image file or URL is required.');
}

/** 申请预签名地址并直传音频；返回对象 ID */
export async function uploadAudio(
  api: ApiClient,
  file: string,
): Promise<string> {
  const contentType = audioTypes[extname(file).toLowerCase()];
  if (!contentType)
    usage(
      `Unsupported audio type: ${file} (use ${Object.keys(audioTypes).join(', ')}).`,
    );
  const data = await readLocal(file, MAX_AUDIO_BYTES, 'Audio file');
  const ticket = await api.request<AudioUpload>('/uploads/audio', 'POST', {
    filename: basename(file),
    contentType,
  });
  await api.putPresigned(ticket.url, data, ticket.headers);
  return ticket.objectId;
}

/**
 * SongInput 的每个字段，以及文档里可以代替它的本地输入。
 * `satisfies` 要求覆盖接口定义的全部字段：服务端增减字段时这里会编译报错。
 */
const SONG_FIELDS = {
  title: [],
  description: [],
  coverObjectId: ['coverFile', 'coverUrl'],
  staff: [],
  versions: [],
  lyrics: [],
  playlistIds: [],
} as const satisfies Record<keyof SongInput, readonly string[]>;

/** 上传任何文件之前，先确认文档没有缺字段（字段都必填，缺了服务端会拒绝） */
function checkFields(doc: JsonObject) {
  const missing = Object.entries(SONG_FIELDS)
    .filter(
      ([field, locals]) =>
        ![field, ...locals].some((key) => doc[key] !== undefined),
    )
    .map(([field]) => field);
  if (missing.length > 0)
    usage(`The song document is missing: ${missing.join(', ')}.`, { missing });
}

function text(doc: JsonObject, key: string): string | undefined {
  const value = doc[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') usage(`"${key}" must be a string.`);
  return value;
}

function objects(doc: JsonObject, key: string): JsonObject[] {
  const value = doc[key];
  if (value === undefined) return [];
  if (!Array.isArray(value)) usage(`"${key}" must be an array.`);
  return value.map((item) => {
    if (item === null || typeof item !== 'object' || Array.isArray(item))
      usage(`Every item in "${key}" must be an object.`);
    return item;
  });
}

/**
 * 读取歌曲文档，把其中引用的本地文件、网络图片先上传，得到接口的 SongInput。
 * 文档与 `song export` 的输出（即 SongInput）相同，另外允许：
 * - coverFile / coverUrl 代替 coverObjectId
 * - versions[].audioFile 代替 objectId
 * - lyrics[].lrcFile 代替 lines
 * 相对路径以文档所在目录为基准（文档从 stdin 读入时以 cwd 为基准）。
 * 其余字段原样提交，由服务端校验。
 */
export async function songInput(
  api: ApiClient,
  cwd: string,
  documentPath: string,
  readText: (path: string) => Promise<string>,
): Promise<SongInput> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readText(documentPath));
  } catch {
    return usage(`Cannot read song document as JSON: ${documentPath}`);
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed))
    usage('The song document must be a JSON object.');
  const doc = parsed as JsonObject;
  const base = documentPath === '-' ? cwd : dirname(resolve(cwd, documentPath));
  const local = (path: string) => resolve(base, path);

  // 缺字段、语种写错时，在上传任何文件之前就报错
  checkFields(doc);
  for (const item of objects(doc, 'lyrics')) {
    const languages = item.languages;
    if (
      languages !== undefined &&
      (!Array.isArray(languages) || !languages.every(isLanguage))
    )
      usage(`lyrics[].languages may only contain: ${languageList}.`, {
        languages: LANGUAGES,
      });
  }

  const { coverFile: _file, coverUrl: _url, ...fields } = doc;
  const coverFile = text(doc, 'coverFile');
  const coverUrl = text(doc, 'coverUrl');
  if (coverFile || coverUrl)
    fields.coverObjectId = await uploadImage(api, {
      file: coverFile && local(coverFile),
      url: coverUrl,
    });

  if (doc.lyrics !== undefined) {
    fields.lyrics = [];
    for (const { lrcFile, ...rest } of objects(doc, 'lyrics')) {
      if (lrcFile === undefined) fields.lyrics.push(rest);
      else if (typeof lrcFile !== 'string')
        usage('"lrcFile" must be a string.');
      else
        fields.lyrics.push({
          ...rest,
          lines: parseLrc(await readText(local(lrcFile))),
        });
    }
  }

  if (doc.versions !== undefined) {
    fields.versions = [];
    for (const { audioFile, ...rest } of objects(doc, 'versions')) {
      if (audioFile === undefined) fields.versions.push(rest);
      else if (typeof audioFile !== 'string')
        usage('"audioFile" must be a string.');
      else
        fields.versions.push({
          ...rest,
          objectId: await uploadAudio(api, local(audioFile)),
        });
    }
  }

  return fields as unknown as SongInput;
}
