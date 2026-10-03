import { pageTitle } from '@/lib/site-config';
import AdminLayout from './AdminLayout';
import PlaylistsManager from './PlaylistsManager';

export default function Page() {
  return (
    <AdminLayout activeTab="playlists">
      <title>{pageTitle('歌单管理')}</title>
      <PlaylistsManager />
    </AdminLayout>
  );
}
