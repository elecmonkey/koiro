import { parseArgs } from 'node:util';
import { usage } from './errors';

const globalOptions = ['json', 'help', 'web-url'];
const booleans = [
  'json',
  'help',
  'no-browser',
  'all',
  'force',
  'include-singles',
];
const strings = [
  'web-url',
  'page',
  'file',
  'out',
  'version',
  'name',
  'description',
  'description-file',
  'cover-file',
  'cover-url',
];

export function argumentsFor(argv: string[]) {
  const options: Record<string, { type: 'boolean' | 'string' }> = {};
  for (const name of booleans) options[name] = { type: 'boolean' };
  for (const name of strings) options[name] = { type: 'string' };
  let parsed: ReturnType<typeof parseArgs>;
  try {
    parsed = parseArgs({
      args: argv,
      options,
      allowPositionals: true,
      strict: true,
      tokens: true,
    });
  } catch {
    return usage(
      'Invalid arguments. Run koiro help for supported commands and options.',
    );
  }
  const values = parsed.values;
  const tokens = parsed.tokens ?? [];
  for (const name of [...booleans, ...strings]) {
    if (
      tokens.filter((token) => token.kind === 'option' && token.name === name)
        .length > 1
    )
      usage(`--${name} may only be passed once.`);
  }
  return {
    positionals: parsed.positionals,
    has: (key: string) => values[key] !== undefined,
    text: (key: string): string | undefined => {
      const value = values[key];
      if (value === undefined) return;
      if (typeof value !== 'string')
        return usage(`--${key} expects one value.`);
      return value;
    },
    /** 校验位置参数个数（min..max）与当前命令允许的选项 */
    allow: (allowed: string[], min: number, max = min) => {
      const count = parsed.positionals.length;
      if (count < min || count > max)
        usage('Wrong number of arguments. Run koiro help.');
      for (const name of Object.keys(values)) {
        if (![...globalOptions, ...allowed].includes(name))
          usage(`--${name} is not supported for this command.`);
      }
    },
  };
}

export type Arguments = ReturnType<typeof argumentsFor>;

export function required(value: string | undefined, name: string): string {
  if (value === undefined || value.trim() === '')
    return usage(`${name} is required.`);
  return value;
}

export function integer(value: string, max = Number.MAX_SAFE_INTEGER): number {
  if (
    !/^[1-9]\d*$/.test(value) ||
    !Number.isSafeInteger(Number(value)) ||
    Number(value) > max
  )
    usage(`Expected an integer between 1 and ${String(max)}.`);
  return Number(value);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 接受 UUID，或站点上的页面地址（如 https://站点/songs/<uuid>），取出其中的 ID。
 * 只看路径，地址里的域名不会被访问。
 */
export function idFrom(value: string, kind: 'songs' | 'playlists'): string {
  if (UUID.test(value)) return value.toLowerCase();
  try {
    const segments = new URL(value).pathname.split('/').filter(Boolean);
    const index = segments.indexOf(kind);
    const id = index >= 0 ? segments[index + 1] : undefined;
    if (id && UUID.test(id)) return id.toLowerCase();
  } catch {
    /* not a URL */
  }
  return usage(
    `Expected a ${kind === 'songs' ? 'song' : 'playlist'} UUID or a /${kind}/<uuid> link.`,
  );
}

/** staff 名或 /staff/<名字> 链接 */
export function nameFrom(value: string, kind: 'staff' | 'languages'): string {
  try {
    const segments = new URL(value).pathname.split('/').filter(Boolean);
    const index = segments.indexOf(kind);
    const name = index >= 0 ? segments[index + 1] : undefined;
    if (name) return decodeURIComponent(name);
  } catch {
    /* not a URL */
  }
  return required(value, kind === 'staff' ? 'NAME' : 'CODE').trim();
}
