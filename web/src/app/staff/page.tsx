import { pageTitle } from '@/lib/site-config';
import StaffCloudClient from './StaffCloudClient';

export default function Page() {
  return (
    <>
      <title>{pageTitle('Staff 云')}</title>
      <StaffCloudClient />
    </>
  );
}
