import { pageTitle } from '@/utils/page-title';
import { AdminLayout } from '@/components/layout/admin-layout';
import { SongsManager } from '@/components/song/song-manager';

export default function Page() {
  return (
    <AdminLayout activeTab="songs">
      <title>{pageTitle('歌曲管理')}</title>
      <SongsManager />
    </AdminLayout>
  );
}
