import { pageTitle } from '@/lib/site-config';
import HomeClient from './HomeClient';

export default function Page() {
  return (
    <>
      <title>{pageTitle()}</title>
      <HomeClient />
    </>
  );
}
