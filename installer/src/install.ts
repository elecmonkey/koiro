import { randomUUID } from 'node:crypto';
import { cp, lstat, mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

function isMissing(error: unknown) {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}

export async function targetExists(target: string) {
  try {
    await lstat(target);
    return true;
  } catch (error) {
    if (isMissing(error)) return false;
    throw error;
  }
}

/** 站点地址：HTTPS，本机回环地址允许 HTTP；去掉末尾的 / */
export function normalizeSite(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`--site is not a valid URL: ${value}`);
  }
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) {
    throw new Error('--site must use HTTPS.');
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error('--site must be a plain site address.');
  }
  return url.href.replace(/\/+$/, '');
}

/**
 * 用新版本整体替换 skill 目录：先在旁边准备好，再改名切换，失败时恢复原目录。
 * site 写入 skill 目录的 site.json，作为脚本默认连接的站点。
 */
export async function replaceSkill(
  source: string,
  target: string,
  site?: string,
) {
  const parent = dirname(target);
  const staged = resolve(parent, `.koiro-agent-new-${randomUUID()}`);
  const backup = resolve(parent, `.koiro-agent-old-${randomUUID()}`);
  await mkdir(parent, { recursive: true });
  try {
    await cp(source, staged, { recursive: true });
    if (site) {
      await writeFile(
        join(staged, 'site.json'),
        `${JSON.stringify({ webUrl: site }, null, 2)}\n`,
      );
    }

    const exists = await targetExists(target);
    if (exists) {
      const stat = await lstat(target);
      if (stat.isSymbolicLink() || !stat.isDirectory()) {
        throw new Error(
          `Refusing to replace invalid skill directory: ${target}`,
        );
      }
      await rename(target, backup);
    }
    try {
      await rename(staged, target);
    } catch (error) {
      if (exists) await rename(backup, target).catch(() => undefined);
      throw error;
    }
    if (exists) await rm(backup, { recursive: true, force: true });
  } finally {
    await rm(staged, { recursive: true, force: true });
  }
}
