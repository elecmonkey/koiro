import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, test } from 'rstack/test';
import { normalizeSite, replaceSkill } from './install';
import { installationTargets } from './paths';

const directories: string[] = [];

afterEach(async () => {
  for (const directory of directories.splice(0)) {
    await rm(directory, { recursive: true, force: true });
  }
});

test('uses the conventional Codex and Claude skill directories', () => {
  expect(installationTargets('/Users/alice', 'darwin')).toEqual([
    {
      id: 'agents',
      label: 'Codex',
      path: '/Users/alice/.agents/skills/koiro-agent',
    },
    {
      id: 'claude',
      label: 'Claude Code',
      path: '/Users/alice/.claude/skills/koiro-agent',
    },
  ]);
  expect(installationTargets('C:\\Users\\Alice', 'win32')[0]?.path).toBe(
    'C:\\Users\\Alice\\.agents\\skills\\koiro-agent',
  );
});

test('accepts only plain HTTPS sites, or HTTP on loopback', () => {
  expect(normalizeSite('https://music.example.com/')).toBe(
    'https://music.example.com',
  );
  expect(normalizeSite('http://127.0.0.1:3720')).toBe('http://127.0.0.1:3720');
  expect(() => normalizeSite('http://music.example.com')).toThrow('HTTPS');
  expect(() => normalizeSite('https://music.example.com/?a=1')).toThrow(
    'plain',
  );
  expect(() => normalizeSite('not a url')).toThrow('valid URL');
});

test('replaces every file in an existing skill directory and records the site', async () => {
  const root = await mkdtemp(join(tmpdir(), 'koiro-installer-test-'));
  directories.push(root);
  const source = join(root, 'source');
  const target = join(root, '.agents', 'skills', 'koiro-agent');
  await mkdir(join(source, 'scripts'), { recursive: true });
  await mkdir(join(source, 'reference'), { recursive: true });
  await mkdir(join(target, 'scripts'), { recursive: true });
  await writeFile(join(source, 'SKILL.md'), 'new');
  await writeFile(join(source, 'scripts', 'koiro.mjs'), 'new cli');
  await writeFile(join(source, 'reference', 'workflows.md'), 'workflows');
  await writeFile(join(target, 'old-file'), 'removed');

  await replaceSkill(source, target, 'https://music.example.com');

  expect(await readFile(join(target, 'SKILL.md'), 'utf8')).toBe('new');
  expect(
    await readFile(join(target, 'reference', 'workflows.md'), 'utf8'),
  ).toBe('workflows');
  expect(JSON.parse(await readFile(join(target, 'site.json'), 'utf8'))).toEqual(
    {
      webUrl: 'https://music.example.com',
    },
  );
  await expect(readFile(join(target, 'old-file'))).rejects.toMatchObject({
    code: 'ENOENT',
  });
  await expect(readFile(join(source, 'site.json'))).rejects.toMatchObject({
    code: 'ENOENT',
  });
});
