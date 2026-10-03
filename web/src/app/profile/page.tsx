import { pageTitle } from '@/lib/site-config';
import ProfileClient from './ProfileClient';

export default function Page() {
  return (
    <>
      <title>{pageTitle('个人信息')}</title>
      <ProfileClient />
    </>
  );
}
