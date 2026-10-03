import { define } from 'rstack';
import { resolve } from 'node:path';

define.lib({
  autoExtension: true,
  output: {
    copy: [
      {
        from: resolve(import.meta.dirname, '../skill/koiro-agent'),
        to: 'koiro-agent',
      },
    ],
    distPath: {
      root: 'dist',
    },
    filename: {
      js: '[name].mjs',
    },
    minify: true,
  },
  source: {
    entry: {
      install: './src/index.ts',
    },
  },
});

define.test({
  projects: [
    {
      name: 'unit',
      testEnvironment: 'node',
      include: ['src/**/*.test.ts'],
    },
    {
      // 构建并打包出真正发布的 tgz，再用 npx 安装到临时 HOME
      name: 'package',
      testEnvironment: 'node',
      include: ['tests/**/*.test.ts'],
      globalSetup: ['./tests/pack.ts'],
      testTimeout: 120_000,
    },
  ],
});
