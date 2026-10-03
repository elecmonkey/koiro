#!/usr/bin/env node
import {
  CANCEL_SYMBOL,
  cancel,
  confirm,
  isCancel,
  multiselect,
} from '@clack/prompts';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { normalizeSite, replaceSkill, targetExists } from './install';
import {
  installationTargets,
  type AgentTarget,
  type InstallationTarget,
} from './paths';

function unwrapCancel<T>(value: T | typeof CANCEL_SYMBOL): T {
  if (isCancel(value)) {
    cancel('已取消安装。');
    process.exit(0);
  }
  return value;
}

function parseSelectedTarget(
  value: string | undefined,
): AgentTarget[] | undefined {
  if (value === undefined) return undefined;
  if (value === 'all') return ['agents', 'claude'];
  if (value === 'agents' || value === 'claude') return [value];
  throw new Error('--target must be agents, claude, or all.');
}

async function chooseTargets(targets: InstallationTarget[]) {
  const existing = new Map(
    await Promise.all(
      targets.map(
        async (target) => [target.id, await targetExists(target.path)] as const,
      ),
    ),
  );
  return unwrapCancel(
    await multiselect<AgentTarget>({
      message: '请选择要安装的 Agent',
      options: targets.map((target) => ({
        value: target.id,
        label: `${target.label}  ${target.path}${existing.get(target.id) ? '（已安装，将更新）' : ''}`,
      })),
      required: true,
    }),
  );
}

async function confirmUpdates(
  targets: InstallationTarget[],
  confirmed: boolean,
) {
  const checked = await Promise.all(
    targets.map(async (target) =>
      (await targetExists(target.path)) ? target : undefined,
    ),
  );
  const updates = checked.filter(
    (target): target is InstallationTarget => target !== undefined,
  );
  if (updates.length === 0 || confirmed) return;
  const answer = unwrapCancel(
    await confirm({
      message: `${updates.map((target) => target.label).join('、')} 已安装。更新会删除原 koiro-agent 目录中的全部内容，再安装新版本。继续？`,
      initialValue: false,
    }),
  );
  if (!answer) {
    cancel('已取消安装。');
    process.exit(0);
  }
}

async function main() {
  const { values } = parseArgs({
    options: {
      site: { type: 'string' },
      target: { type: 'string' },
      yes: { type: 'boolean', default: false },
    },
    strict: true,
  });
  const site =
    values.site === undefined ? undefined : normalizeSite(values.site);
  const targets = installationTargets();
  let selected = parseSelectedTarget(values.target);
  if (!selected) {
    if (!process.stdin.isTTY || !process.stdout.isTTY) {
      throw new Error(
        'Interactive selection requires a terminal. Pass --target agents, claude, or all.',
      );
    }
    selected = await chooseTargets(targets);
  }
  const chosen = targets.filter((target) => selected.includes(target.id));
  await confirmUpdates(chosen, values.yes);

  const skillSource = resolve(import.meta.dirname, 'koiro-agent');
  for (const target of chosen) {
    await replaceSkill(skillSource, target.path, site);
    console.log(`已安装 ${target.label}: ${target.path}`);
  }
  if (site) console.log(`默认站点：${site}`);
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : '安装失败。');
  process.exitCode = 1;
}
