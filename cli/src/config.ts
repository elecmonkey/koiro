import {
  chmod,
  lstat,
  mkdir,
  readFile,
  rename,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { CliError, usage } from './errors';
import { object, parseJson, string } from './json';

export interface Session {
  token: string;
  expiresAt: string;
}

export interface Config {
  webUrl?: string;
  /** 按站点地址分别保存的登录 */
  sessions: Partial<Record<string, Session>>;
}

/** 站点地址：HTTPS，仅回环地址允许 HTTP；不带凭据、查询串和锚点 */
export function normalizeUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return usage('Invalid site URL.');
  }
  const local = ['127.0.0.1', '[::1]', 'localhost'].includes(url.hostname);
  if (
    !(url.protocol === 'https:' || (url.protocol === 'http:' && local)) ||
    url.username !== '' ||
    url.password !== '' ||
    url.search !== '' ||
    url.hash !== ''
  ) {
    usage(
      'Use HTTPS (HTTP is allowed only on loopback), without credentials, query or fragment.',
    );
  }
  return url.href.replace(/\/$/, '');
}

export function configDirectory() {
  return (
    process.env.KOIRO_CONFIG_DIR ??
    join(
      process.platform === 'win32'
        ? (process.env.APPDATA ?? join(homedir(), 'AppData', 'Roaming'))
        : (process.env.XDG_CONFIG_HOME ?? join(homedir(), '.config')),
      'koiro',
    )
  );
}

function missing(error: unknown) {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}

export async function readConfig(directory: string): Promise<Config> {
  const file = join(directory, 'config.json');
  try {
    const stat = await lstat(file);
    if (!stat.isFile() || stat.isSymbolicLink())
      throw new Error('Unsafe configuration file');
    if (process.platform !== 'win32' && (stat.mode & 0o077) !== 0)
      throw new Error('Configuration must be private');
    const value = object(parseJson(await readFile(file, 'utf8')));
    const sessions: Record<string, Session> = {};
    for (const [url, raw] of Object.entries(object(value.sessions ?? {}))) {
      const session = object(raw);
      sessions[normalizeUrl(url)] = {
        token: string(session.token),
        expiresAt: string(session.expiresAt),
      };
    }
    return {
      webUrl:
        value.webUrl === undefined
          ? undefined
          : normalizeUrl(string(value.webUrl)),
      sessions,
    };
  } catch (error) {
    if (missing(error)) return { sessions: {} };
    throw new CliError(
      'config',
      'Cannot read private config.json. Check its format and permissions (0600 on Unix).',
      1,
    );
  }
}

/** 先写同目录临时文件再 rename，权限 0600，目录 0700 */
export async function writeConfig(directory: string, config: Config) {
  const temporary = join(directory, `.config-${randomUUID()}.tmp`);
  try {
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const stat = await lstat(directory);
    if (!stat.isDirectory() || stat.isSymbolicLink())
      throw new Error('Unsafe configuration directory');
    if (process.platform !== 'win32') await chmod(directory, 0o700);
    await writeFile(temporary, JSON.stringify(config), {
      flag: 'wx',
      mode: 0o600,
    });
    await rename(temporary, join(directory, 'config.json'));
  } catch {
    throw new CliError(
      'config',
      'Cannot save Koiro configuration securely.',
      1,
    );
  } finally {
    await unlink(temporary).catch(() => undefined);
  }
}

/**
 * 安装器把来源网站写进 skill 目录的 site.json（与 scripts/ 同级），
 * 作为没有任何配置时的默认站点
 */
export async function bundledSite(
  scriptUrl: string,
): Promise<string | undefined> {
  try {
    const text = await readFile(new URL('../site.json', scriptUrl), 'utf8');
    return normalizeUrl(string(object(parseJson(text)).webUrl));
  } catch {
    return undefined;
  }
}
