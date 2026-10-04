import { pageTitle } from '@/utils/page-title';
import { AdminLayout } from '@/components/layout/admin-layout';
import { UsersManager } from '@/components/user/user-manager';

export default function Page() {
  return (
    <AdminLayout activeTab="users">
      <title>{pageTitle('用户管理')}</title>
      <UsersManager />
    </AdminLayout>
  );
}
