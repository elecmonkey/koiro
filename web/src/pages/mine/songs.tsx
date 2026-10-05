import { pageTitle } from '@/utils/page-title';
import { MineLayout } from '@/components/layout/mine-layout';
import { SongsManager } from '@/components/song/song-manager';

export default function Page() {
  return (
    <MineLayout activeTab="songs">
      <title>{pageTitle('我的歌曲')}</title>
      <SongsManager />
    </MineLayout>
  );
}
