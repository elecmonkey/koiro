import { pageTitle } from '@/utils/page-title';
import AdminLayout from '@/components/layout/admin-layout';
import PlaylistsManager from '@/components/playlist/playlist-manager';

export default function Page() {
  return (
    <AdminLayout activeTab="playlists">
      <title>{pageTitle('歌单管理')}</title>
      <PlaylistsManager />
    </AdminLayout>
  );
}
