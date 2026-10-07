// Configuration guide: https://rstack.rs/config
import { define } from 'rstack';
import { resolve } from 'node:path';

define.app(async ({ command }) => {
  const { pluginReact } = await import('@rsbuild/plugin-react');
  return {
    plugins: [pluginReact({ reactCompiler: true })],
    // 构建时附带 Agent Skill 安装包，个人中心里的安装命令从本站下载它
    ...(command === 'build'
      ? {
          output: {
            copy: [
              {
                from: resolve(
                  import.meta.dirname,
                  '../packages/installer/dist/koiro-installer.tgz',
                ),
                to: 'downloads/koiro-installer.tgz',
              },
            ],
          },
        }
      : {}),
    html: {
      title: 'Koiro',
      favicon: './public/icon.svg',
    },
    server: {
      // 默认 3720 代理到 3721，和 AGENTS.md 文档一致；只有 packages/e2e 需要在
      // 不打断这组默认端口的前提下另起一份指向别的后端时，才会覆盖这两个变量
      port: Number(process.env.KOIRO_WEB_PORT ?? 3720),
      proxy: {
        '/api': process.env.KOIRO_API_PROXY ?? 'http://127.0.0.1:3721',
      },
    },
  };
});

define.test({
  include: ['tests/**/*.test.ts'],
});
