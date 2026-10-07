import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  // 真实调用 AI 的 aiAssert/aiQuery 每次有好几秒延迟，步骤多的 spec（比如涉及两轮
  // 登出登入、好几个弹窗）累计下来很容易超过 2 分钟，给够余量
  timeout: 180_000,
  fullyParallel: false, // 每条 spec 对应各自的种子数据，但同一个库只跑一条更不容易互相干扰
  retries: 0,
  reporter: [
    ['list'],
    ['@midscene/web/playwright-reporter', { type: 'merged' }],
  ],
  use: {
    // 默认假设你的正常 dev server 占着 3720/3721，所以 E2E 另起一组端口；
    // 见 README：KOIRO_WEB_PORT + KOIRO_API_PROXY 起第二个 web dev，再把这个指过去
    baseURL: process.env.KOIRO_E2E_BASE_URL ?? 'http://localhost:3722',
    trace: 'retain-on-failure',
    ...devices['Desktop Chrome'],
    // 只手动本地跑，默认开着真实窗口，方便盯着 Midscene 怎么操作；
    // slowMo 让原生的 fill/click 也肉眼可见，不然这些步骤比 AI 那几步快太多，一眨眼就过去了
    headless: false,
    // 全套依赖都在 localhost 上，浏览器不该走任何系统代理（有些机器全局配了代理，
    // 连 localhost 的请求也会被转发出去，音频直传 S3 那种浏览器发起的请求就会失败）
    launchOptions: { slowMo: 150, args: ['--no-proxy-server'] },
  },
});
