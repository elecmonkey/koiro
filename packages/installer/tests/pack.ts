import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

const packageRoot = resolve(import.meta.dirname, '..');

/** 用发布时同一条构建命令打出安装包，把路径交给测试 */
export async function setup() {
  await promisify(execFile)('pnpm', ['run', 'build'], {
    cwd: packageRoot,
    shell: process.platform === 'win32',
  });
  process.env.KOIRO_INSTALLER_TARBALL = resolve(
    packageRoot,
    'dist/koiro-installer.tgz',
  );
}
