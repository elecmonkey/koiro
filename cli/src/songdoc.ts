import { readFile, stat } from 'node:fs/promises';
import { basename, dirname, extname, resolve } from 'node:path';
import { usage } from './errors';
import type { ApiClient } from './http';
import { object, string, type Json, type JsonObject } from './json';
import { LANGUAGES, isLanguage } from '@koiro/shared';
import { languageList } from './languages';
import { parseLrc } from './lyrics';

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

/** 上传本地图片，或让服务端拉取远程图片；返回对象 ID */
export async function uploadImage(
  api: ApiClient,
  source: { file?: string; url?: string },
): Promise<string> {
  if (source.file) {
    const data = await readLocal(source.file, MAX_IMAGE_BYTES, 'Image');
    const stored = await api.upload(
      '/uploads/image',
      data,
      'application/octet-stream',
    );
    return string(stored.objectId);
  }
  if (source.url) {
    const stored = object(
      await api.request('/uploads/image-from-url', 'POST', { url: source.url }),
    );
    return string(stored.objectId);
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
  const presigned = object(
    await api.request('/uploads/audio', 'POST', {
      filename: basename(file),
      contentType,
    }),
  );
  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(object(presigned.headers)))
    headers[key] = string(value);
  await api.putPresigned(string(presigned.url), data, headers);
  return string(presigned.objectId);
}

function field(doc: JsonObject, key: string): string | undefined {
  const value = doc[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') usage(`"${key}" must be a string.`);
  return value;
}

function list(doc: JsonObject, key: string): JsonObject[] {
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
 * 读取歌曲文档，把其中引用的本地文件 / 远程图片先上传，整理成接口的 SongInput。
 * 文档字段与 `song export` 的输出一致，另外允许：
 * - coverFile / coverUrl 代替 coverObjectId
 * - versions[].audioFile 代替 objectId
 * - lyrics[].lrcFile 代替 lines
 * 相对路径以文档所在目录为基准（文档从 stdin 读入时以 cwd 为基准）。
 */
export async function songInput(
  api: ApiClient,
  cwd: string,
  documentPath: string,
  readText: (path: string) => Promise<string>,
): Promise<JsonObject> {
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

  // 语种写错时，在上传任何文件之前就报错
  for (const item of list(doc, 'lyrics')) {
    const languages = item.languages;
    if (
      languages !== undefined &&
      (!Array.isArray(languages) || !languages.every(isLanguage))
    )
      usage(`lyrics[].languages may only contain: ${languageList}.`, {
        languages: LANGUAGES,
      });
  }

  const coverFile = field(doc, 'coverFile');
  const coverUrl = field(doc, 'coverUrl');
  const coverObjectId =
    coverFile || coverUrl
      ? await uploadImage(api, {
          file: coverFile ? local(coverFile) : undefined,
          url: coverUrl,
        })
      : field(doc, 'coverObjectId');

  const lyrics: Json[] = [];
  for (const item of list(doc, 'lyrics')) {
    const { lrcFile, ...rest } = item;
    if (lrcFile !== undefined) {
      if (typeof lrcFile !== 'string') usage('"lrcFile" must be a string.');
      lyrics.push({
        ...rest,
        lines: parseLrc(await readText(local(lrcFile))),
      } as unknown as Json);
    } else {
      lyrics.push(rest);
    }
  }

  const versions: Json[] = [];
  for (const item of list(doc, 'versions')) {
    const { audioFile, ...rest } = item;
    if (audioFile !== undefined) {
      if (typeof audioFile !== 'string') usage('"audioFile" must be a string.');
      versions.push({
        ...rest,
        objectId: await uploadAudio(api, local(audioFile)),
      });
    } else {
      versions.push(rest);
    }
  }

  const { coverFile: _f, coverUrl: _u, ...fields } = doc;
  return {
    ...fields,
    coverObjectId: coverObjectId ?? null,
    versions,
    lyrics,
  };
}
