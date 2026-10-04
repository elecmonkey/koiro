import { Outlet, ScrollRestoration } from 'react-router';
import { PlayerProvider, FloatingPlayer } from '@/components/player';
import Navbar from './navbar';
import Footer from './footer';

/** 所有页面共享的外壳：导航栏、页脚与全局播放器 */
export default function Layout() {
  return (
    <PlayerProvider>
      <Navbar />
      <div
        style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}
      >
        <div style={{ flex: 1 }}>
          <Outlet />
        </div>
        <Footer />
      </div>
      <FloatingPlayer />
      <ScrollRestoration />
    </PlayerProvider>
  );
}
