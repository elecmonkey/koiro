#!/usr/bin/env node
import { realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { bundledSite, configDirectory } from './config';
import { run } from './run';

/**
 * import.meta.url 已经是解析过的真实路径，被调用的路径也要解析：
 * 否则经过符号链接（PATH 上的启动器、macOS 的临时目录）调用时比较失败，
 * 命令什么都不做却以 0 退出，看起来和成功一模一样。
 */
function invokedUrlFor(path: string) {
  try {
    return pathToFileURL(realpathSync(path)).href;
  } catch {
    return pathToFileURL(path).href;
  }
}

const invokedPath = process.argv[1];
const invokedUrl = invokedPath ? invokedUrlFor(invokedPath) : undefined;

if (import.meta.url === invokedUrl) {
  process.exitCode = await run(process.argv.slice(2), {
    cwd: process.cwd(),
    configDir: configDirectory(),
    env: process.env,
    bundledSite: await bundledSite(import.meta.url),
    stdin: async () => {
      const chunks: Buffer[] = [];
      let size = 0;
      for await (const chunk of process.stdin) {
        const value = Buffer.isBuffer(chunk)
          ? chunk
          : Buffer.from(String(chunk));
        size += value.length;
        if (size > 10 * 1024 * 1024) throw new Error('Input is too large');
        chunks.push(value);
      }
      return Buffer.concat(chunks).toString('utf8');
    },
    stdout: (text) => {
      process.stdout.write(`${text}\n`);
    },
    stderr: (text) => {
      process.stderr.write(`${text}\n`);
    },
  });
}
