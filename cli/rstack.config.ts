// 打包成单文件 koiro.mjs，直接输出到 skill 的 scripts/ 下，随 skill 分发
import { define } from 'rstack';

define.lib({
  autoExtension: true,
  output: {
    cleanDistPath: false,
    distPath: {
      root: '../skill/koiro-agent/scripts',
    },
    filename: {
      js: '[name].mjs',
    },
    minify: true,
  },
  source: {
    entry: {
      koiro: './src/index.ts',
    },
  },
});

define.test({
  testEnvironment: 'node',
  include: ['src/**/*.test.ts'],
});
