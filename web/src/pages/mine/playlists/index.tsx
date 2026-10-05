import { pageTitle } from '@/utils/page-title';
import { MineLayout } from '@/components/layout/mine-layout';
import { PlaylistsManager } from '@/components/playlist/playlist-manager';

export default function Page() {
  return (
    <MineLayout activeTab="playlists">
      <title>{pageTitle('我的歌单')}</title>
      <PlaylistsManager />
    </MineLayout>
  );
}
