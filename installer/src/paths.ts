import { homedir } from 'node:os';
import { posix, win32 } from 'node:path';

export type AgentTarget = 'agents' | 'claude';

export interface InstallationTarget {
  id: AgentTarget;
  label: string;
  path: string;
}

export function installationTargets(
  userHome = homedir(),
  platform: NodeJS.Platform = process.platform,
): InstallationTarget[] {
  const path = platform === 'win32' ? win32 : posix;
  return [
    {
      id: 'agents',
      label: 'Codex',
      path: path.join(userHome, '.agents', 'skills', 'koiro-agent'),
    },
    {
      id: 'claude',
      label: 'Claude Code',
      path: path.join(userHome, '.claude', 'skills', 'koiro-agent'),
    },
  ];
}
