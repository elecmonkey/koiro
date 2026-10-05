import { spawn } from 'node:child_process';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';
import { release } from 'node:os';
import { CliError } from './errors';
import type { CliToken, User } from '@koiro/shared';
import { normalizeUrl, type SavedLogin } from './config';
import { ApiClient } from './http';

/** 换来的凭据必须尚未过期，才值得保存 */
export function loginSession({ token, expiresAt, user }: CliToken): {
  session: SavedLogin;
  user: User;
} {
  if (
    !token ||
    !Number.isFinite(Date.parse(expiresAt)) ||
    Date.parse(expiresAt) <= Date.now()
  ) {
    throw new CliError(
      'invalid_response',
      'Koiro returned an invalid login.',
      8,
    );
  }
  return { session: { token, expiresAt }, user };
}

export async function listenForCode(
  state: string,
  timeoutMs = 180_000,
  signal?: AbortSignal,
) {
  let complete: (code: string) => void = () => undefined;
  let fail: (error: Error) => void = () => undefined;
  let accepted = false;
  const code = new Promise<string>((resolve, reject) => {
    complete = resolve;
    fail = reject;
  });
  // The browser launcher can still be starting when a timeout or signal arrives.
  void code.catch(() => undefined);
  const server = createServer(
    { requestTimeout: 5000, headersTimeout: 5000 },
    (request, response) => {
      response.setHeader('cache-control', 'no-store');
      response.setHeader('referrer-policy', 'no-referrer');
      response.setHeader('content-type', 'text/plain; charset=utf-8');
      const address = server.address();
      const host =
        typeof address === 'object' && address
          ? `127.0.0.1:${String(address.port)}`
          : '';
      let url: URL;
      try {
        url = new URL(request.url ?? '/', `http://${host}`);
      } catch {
        response.writeHead(400).end('Invalid callback URL.');
        return;
      }
      const receivedState = url.searchParams.get('state') ?? '';
      const receivedCode = url.searchParams.get('code') ?? '';
      if (
        request.method !== 'GET' ||
        request.headers.host !== host ||
        url.origin !== `http://${host}` ||
        url.pathname !== '/callback' ||
        accepted ||
        url.searchParams.getAll('state').length !== 1 ||
        url.searchParams.getAll('code').length !== 1 ||
        !/^[0-9a-f]{64}$/.test(receivedState) ||
        !/^[0-9a-f]{64}$/.test(receivedCode) ||
        !timingSafeEqual(Buffer.from(receivedState), Buffer.from(state))
      ) {
        response
          .writeHead(400)
          .end('Invalid login callback. Return to Koiro and try again.');
        return;
      }
      accepted = true;
      response.end(
        'Authorization received. Return to the terminal to check login completion. You may close this tab.',
      );
      complete(receivedCode);
    },
  );
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  }).catch(() => {
    throw new CliError(
      'login_listener',
      'Cannot start the local login callback.',
      7,
    );
  });
  server.on('error', () =>
    fail(new CliError('login_listener', 'Local login callback failed.', 7)),
  );
  const address = server.address();
  if (!address || typeof address === 'string')
    throw new CliError('login_listener', 'No local callback address.', 7);
  const timer = setTimeout(
    () =>
      fail(
        new CliError(
          'login_timeout',
          'Login timed out. Run koiro login again.',
          3,
        ),
      ),
    timeoutMs,
  );
  const abort = () => fail(new CliError('cancelled', 'Login cancelled.', 130));
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) abort();
  return {
    redirectUri: `http://127.0.0.1:${String(address.port)}/callback`,
    code,
    close: async () => {
      clearTimeout(timer);
      fail(new CliError('cancelled', 'Login callback closed.', 130));
      signal?.removeEventListener('abort', abort);
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}

interface Launcher {
  command: string;
  args: string[];
  /** Some launchers hand off to the browser and then exit non-zero anyway. */
  ignoreExitCode?: boolean;
}

/**
 * Desktop environments disagree on which launcher exists, so the URL is offered
 * to each candidate in turn until one takes it. The URL only ever travels as a
 * separate argv entry: no shell is involved, so its `&` and `?` stay literal.
 */
export function browserLaunchers(
  url: string,
  platform: NodeJS.Platform,
  env: Record<string, string | undefined> = {},
  release = '',
): Launcher[] {
  if (platform === 'darwin') return [{ command: 'open', args: [url] }];
  if (platform === 'win32') {
    return [
      { command: 'rundll32.exe', args: ['url.dll,FileProtocolHandler', url] },
      // explorer.exe opens the default browser but reports failure regardless.
      { command: 'explorer.exe', args: [url], ignoreExitCode: true },
    ];
  }
  const launchers: Launcher[] = [];
  // BROWSER is the long-standing Unix convention and the user's explicit choice.
  if (env.BROWSER) launchers.push({ command: env.BROWSER, args: [url] });
  // Under WSL the Linux launchers exist but open nothing the user can see.
  if (/microsoft/i.test(release)) {
    launchers.push(
      { command: 'wslview', args: [url] },
      {
        command: 'powershell.exe',
        args: ['-NoProfile', '-Command', 'start', url],
      },
    );
  }
  launchers.push(
    { command: 'xdg-open', args: [url] },
    { command: 'gio', args: ['open', url] },
    { command: 'gnome-open', args: [url] },
    { command: 'kde-open', args: [url] },
    { command: 'x-www-browser', args: [url] },
    { command: 'sensible-browser', args: [url] },
    { command: 'www-browser', args: [url] },
  );
  return launchers;
}

/** Resolves once a launcher starts without failing immediately. */
function launch(launcher: Launcher) {
  return new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (opened: boolean) => {
      if (!settled) {
        settled = true;
        resolve(opened);
      }
    };
    let child: ReturnType<typeof spawn>;
    try {
      child = spawn(launcher.command, launcher.args, {
        detached: true,
        stdio: 'ignore',
      });
    } catch {
      finish(false);
      return;
    }
    // A launcher that stays alive is the browser itself; one that exits quickly
    // has already handed off, and its code says whether the hand-off worked.
    const timer = setTimeout(() => {
      child.unref();
      finish(true);
    }, 500);
    timer.unref();
    child.on('error', () => {
      clearTimeout(timer);
      finish(false);
    });
    child.on('exit', (code) => {
      clearTimeout(timer);
      child.unref();
      finish(launcher.ignoreExitCode === true || code === 0 || code === null);
    });
  });
}

async function openBrowser(url: string) {
  for (const launcher of browserLaunchers(
    url,
    process.platform,
    process.env,
    release(),
  )) {
    if (await launch(launcher)) return true;
  }
  return false;
}

export async function browserLogin(
  api: ApiClient,
  webUrl: string,
  noBrowser: boolean,
  notify: (message: string) => void,
) {
  const verifier = randomBytes(32).toString('hex');
  const state = randomBytes(32).toString('hex');
  const controller = new AbortController();
  const abort = () => controller.abort();
  process.once('SIGINT', abort);
  process.once('SIGTERM', abort);
  let listener: Awaited<ReturnType<typeof listenForCode>> | undefined;
  try {
    listener = await listenForCode(state, 180_000, controller.signal);
    const url = new URL(`${normalizeUrl(webUrl)}/auth/cli`);
    url.searchParams.set('redirectUri', listener.redirectUri);
    url.searchParams.set('state', state);
    url.searchParams.set(
      'codeChallenge',
      createHash('sha256').update(verifier).digest('base64url'),
    );
    notify(
      `Open this URL on the same computer as the CLI and approve login:\n${url.href}`,
    );
    if (!noBrowser && !(await openBrowser(url.href))) {
      notify(
        'No browser could be opened here. Open the URL above manually; this command keeps waiting.',
      );
    }
    const code = await listener.code;
    return loginSession(
      await api.request<CliToken>(
        '/auth/cli/exchange',
        'POST',
        {
          code,
          codeVerifier: verifier,
          redirectUri: listener.redirectUri,
        },
        {},
        false,
      ),
    );
  } finally {
    process.off('SIGINT', abort);
    process.off('SIGTERM', abort);
    await listener?.close();
  }
}
