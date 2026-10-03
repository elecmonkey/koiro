import { argumentsFor } from './arguments';
import { businessCommand, localCommand } from './commands';
import { normalizeUrl, readConfig, writeConfig } from './config';
import { CliError, usage } from './errors';
import { help } from './help';
import { ApiClient } from './http';
import { object } from './json';
import { browserLogin } from './login';

export interface Runtime {
  cwd: string;
  configDir: string;
  env: Record<string, string | undefined>;
  /** 安装时写入的来源站点 */
  bundledSite?: string;
  stdin: () => Promise<string>;
  stdout: (text: string) => void;
  stderr: (text: string) => void;
}

export async function run(argv: string[], runtime: Runtime): Promise<number> {
  try {
    const args = argumentsFor(argv);
    const output = (value: unknown) =>
      runtime.stdout(
        JSON.stringify(value, undefined, args.has('json') ? undefined : 2),
      );
    if (
      args.has('help') ||
      args.positionals[0] === 'help' ||
      args.positionals.length === 0
    ) {
      runtime.stdout(args.has('json') ? JSON.stringify({ help }) : help);
      return 0;
    }
    const local = await localCommand(args, runtime);
    if (local !== undefined) {
      output(local);
      return 0;
    }

    const config = await readConfig(runtime.configDir);
    const configured =
      args.text('web-url') ??
      runtime.env.KOIRO_WEB_URL ??
      config.webUrl ??
      runtime.bundledSite;
    const [command, action] = args.positionals;

    if (command === 'config') {
      if (action === 'get') {
        args.allow([], 2);
        const webUrl = configured ? normalizeUrl(configured) : null;
        output({
          webUrl,
          apiUrl: webUrl ? `${webUrl}/api` : null,
          configDir: runtime.configDir,
          loggedIn: Boolean(
            runtime.env.KOIRO_TOKEN ??
            (webUrl ? config.sessions[webUrl]?.token : undefined),
          ),
        });
      } else if (action === 'set') {
        args.allow([], 2);
        if (!args.has('web-url')) usage('Pass --web-url.');
        config.webUrl = normalizeUrl(args.text('web-url') ?? '');
        await writeConfig(runtime.configDir, config);
        output({ webUrl: config.webUrl });
      } else usage('Use config get or config set.');
      return 0;
    }

    if (!configured)
      throw new CliError(
        'config',
        'No Koiro site is configured. Run koiro config set --web-url <site>.',
        2,
      );
    const webUrl = normalizeUrl(configured);

    if (command === 'login') {
      args.allow(['no-browser'], 1);
      const result = await browserLogin(
        new ApiClient(webUrl),
        webUrl,
        args.has('no-browser'),
        runtime.stderr,
      );
      // 浏览器授权可能耗时较长，重新读取再写，避免覆盖期间保存的其他登录
      const latest = await readConfig(runtime.configDir);
      latest.sessions[webUrl] = result.session;
      if (!latest.webUrl && !runtime.bundledSite) latest.webUrl = webUrl;
      await writeConfig(runtime.configDir, latest);
      output({
        webUrl,
        user: result.user,
        expiresAt: result.session.expiresAt,
      });
      return 0;
    }

    if (command === 'logout') {
      args.allow([], 1);
      config.sessions = Object.fromEntries(
        Object.entries(config.sessions).filter(([url]) => url !== webUrl),
      );
      await writeConfig(runtime.configDir, config);
      output({
        webUrl,
        loggedOut: true,
        ...(runtime.env.KOIRO_TOKEN
          ? {
              warning:
                'Unset KOIRO_TOKEN to stop using the environment credential.',
            }
          : {}),
      });
      return 0;
    }

    const saved = config.sessions[webUrl];
    if (
      !runtime.env.KOIRO_TOKEN &&
      saved &&
      (!Number.isFinite(Date.parse(saved.expiresAt)) ||
        Date.parse(saved.expiresAt) <= Date.now())
    ) {
      throw new CliError(
        'auth',
        'Saved login has expired. Run koiro login.',
        3,
      );
    }
    const api = new ApiClient(webUrl, runtime.env.KOIRO_TOKEN ?? saved?.token);

    if (command === 'auth' && action === 'status') {
      args.allow([], 2);
      const me = object(await api.request('/me'));
      if (me.user === null)
        throw new CliError(
          'auth',
          'Login is missing or expired. Run koiro login.',
          3,
        );
      output({ webUrl, user: me.user });
      return 0;
    }

    output(await businessCommand(args, api, runtime));
    return 0;
  } catch (error) {
    const failure =
      error instanceof CliError
        ? error
        : new CliError(
            'local',
            'Command failed. Check local files and configuration permissions.',
            1,
          );
    runtime.stderr(
      JSON.stringify({
        error: {
          code: failure.code,
          message: failure.message,
          details: failure.details,
        },
      }),
    );
    return failure.exitCode;
  }
}
