import { pageTitle } from '@/lib/site-config';
import AdminLayout from '../AdminLayout';
import SongsManager from '../SongsManager';

export default function Page() {
  return (
    <AdminLayout activeTab="songs">
      <title>{pageTitle('歌曲管理')}</title>
      <SongsManager />
    </AdminLayout>
  );
}
