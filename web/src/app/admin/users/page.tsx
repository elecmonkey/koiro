import { pageTitle } from '@/lib/site-config';
import AdminLayout from '../AdminLayout';
import UsersManager from '../UsersManager';

export default function Page() {
  return (
    <AdminLayout activeTab="users">
      <title>{pageTitle('用户管理')}</title>
      <UsersManager />
    </AdminLayout>
  );
}
