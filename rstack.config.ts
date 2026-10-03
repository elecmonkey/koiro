// Configuration guide: https://rstack.rs/config
// 根配置只负责全仓的 lint / fmt / staged；构建与测试配置在各自项目里
import { define } from 'rstack';

define.lint(
  ({
    js,
    ts,
    globals,
    reactPlugin,
    reactHooksPlugin,
    jsxA11yPlugin,
    importPlugin,
    promisePlugin,
    rstestPlugin,
  }) => [
    { ignores: ['server/**', 'target/**', '**/dist/**'] },
    js.configs.recommended,
    ts.configs.recommendedTypeChecked,
    {
      languageOptions: {
        parserOptions: {
          projectService: true,
        },
      },
    },
    {
      files: ['web/**/*.{ts,tsx}'],
      languageOptions: {
        globals: globals.browser,
      },
    },
    reactPlugin.configs.recommended,
    reactHooksPlugin.configs.recommended,
    jsxA11yPlugin.configs.recommended,
    importPlugin.configs.recommended,
    {
      // TypeScript 已经检查这些，import 插件对 CJS 包（如 react）会误报
      files: ['**/*.{ts,tsx}'],
      rules: {
        'import/default': 'off',
        'import/named': 'off',
        'import/namespace': 'off',
        'import/no-named-as-default-member': 'off',
        // props 类型由 TypeScript 检查
        'react/prop-types': 'off',
      },
    },
    {
      rules: {
        // React 会忽略事件处理函数的返回值，允许直接传 async 函数给 onClick 等属性
        '@typescript-eslint/no-misused-promises': [
          'error',
          { checksVoidReturn: { attributes: false } },
        ],
      },
    },
    promisePlugin.configs.recommended,
    {
      files: ['**/*.{test,spec}.?(c|m)[jt]s?(x)'],
      ...rstestPlugin.configs.recommended,
    },
  ],
);

define.fmt({
  singleQuote: true,
  ignorePatterns: [
    'server/**',
    'target/**',
    '.sqlx/**',
    'packages/shared/src/generated/**',
    '**/dist/**',
    'pnpm-lock.yaml',
  ],
});

define.staged({
  '*.{js,jsx,ts,tsx,mjs,cjs}': ['rs lint', 'rs fmt'],
  '*.{json,md,css,html,yml,yaml}': 'rs fmt',
  'server/**/*.rs': () => 'cargo fmt --manifest-path server/Cargo.toml',
});
