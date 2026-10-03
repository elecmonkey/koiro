// Configuration guide: https://rstack.rs/config
import { define } from 'rstack';

define.app(async () => {
  const { pluginReact } = await import('@rsbuild/plugin-react');
  return {
    plugins: [pluginReact({ reactCompiler: true })],
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
