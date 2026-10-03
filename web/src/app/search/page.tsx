import { pageTitle } from '@/lib/site-config';
import SearchClient from './SearchClient';

export default function Page() {
  return (
    <>
      <title>{pageTitle('搜索')}</title>
      <SearchClient />
    </>
  );
}
