import { execFile } from 'node:child_process';
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { expect, onTestFinished, test } from 'rstack/test';

const site = 'https://music.example.com';

async function temporaryHome() {
  const home = await mkdtemp(join(tmpdir(), 'koiro-installer-package-'));
  onTestFinished(() => rm(home, { recursive: true, force: true }));
  return home;
}

/** 与个人中心给出的安装命令相同，只是不弹出交互选择 */
async function install(home: string) {
  const tarball = process.env.KOIRO_INSTALLER_TARBALL;
  if (!tarball)
    throw new Error('KOIRO_INSTALLER_TARBALL is not set by global setup.');
  await promisify(execFile)(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    [
      '-y',
      '--package',
      tarball,
      '--',
      'koiro-installer',
      '--target',
      'all',
      '--yes',
      '--site',
      site,
    ],
    {
      env: { ...process.env, HOME: home, USERPROFILE: home },
      shell: process.platform === 'win32',
    },
  );
}

const targets = (home: string) =>
  ['.agents', '.claude'].map((directory) =>
    join(home, directory, 'skills', 'koiro-agent'),
  );

test('npx installs the skill, the bundled CLI and the site into every agent', async () => {
  const home = await temporaryHome();
  await install(home);

  for (const target of targets(home)) {
    expect(await readFile(join(target, 'SKILL.md'), 'utf8')).toContain(
      'name: koiro-agent',
    );
    await access(join(target, 'scripts', 'koiro.mjs'));
    await access(join(target, 'reference', 'workflows.md'));
    expect(
      JSON.parse(await readFile(join(target, 'site.json'), 'utf8')),
    ).toEqual({ webUrl: site });
  }
});

test('installing again replaces the whole skill directory', async () => {
  const home = await temporaryHome();
  await install(home);
  for (const target of targets(home)) {
    await mkdir(join(target, 'obsolete'), { recursive: true });
    await writeFile(join(target, 'obsolete', 'old.txt'), 'old');
  }

  await install(home);

  for (const target of targets(home)) {
    await access(join(target, 'SKILL.md'));
    await expect(
      access(join(target, 'obsolete', 'old.txt')),
    ).rejects.toMatchObject({ code: 'ENOENT' });
  }
});
