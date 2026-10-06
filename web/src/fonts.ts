// 自托管字体：构建时打进 dist，CJK 字体按 unicode-range 分片，浏览器只下载页面上用到的字
// - Noto Sans SC / Noto Serif SC：正文与标题（本身覆盖假名）
// - Zen Kaku Gothic New：日文歌词（400 / 700，600 落到 700）
// - Noto Serif JP：首页标题「声の色」
// - Source Serif 4：英文歌词；思源宋体的拉丁字母就来自它，和中文衬线标题同源。带光学尺寸轴
import '@fontsource-variable/noto-sans-sc';
import '@fontsource-variable/noto-serif-sc';
import '@fontsource-variable/noto-serif-jp';
import '@fontsource-variable/source-serif-4/opsz.css';
import '@fontsource/zen-kaku-gothic-new/400.css';
import '@fontsource/zen-kaku-gothic-new/700.css';
