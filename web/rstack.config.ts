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
                  '../installer/dist/koiro-installer.tgz',
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
      port: 3720,
      proxy: {
        '/api': 'http://127.0.0.1:3721',
      },
    },
  };
});

define.test({
  include: ['tests/**/*.test.ts'],
});
