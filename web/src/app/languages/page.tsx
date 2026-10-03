import { pageTitle } from '@/lib/site-config';
import LanguageCloudClient from './LanguageCloudClient';

export default function Page() {
  return (
    <>
      <title>{pageTitle('语种云')}</title>
      <LanguageCloudClient />
    </>
  );
}
