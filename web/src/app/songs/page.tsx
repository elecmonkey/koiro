import { pageTitle } from '@/lib/site-config';
import SongsClient from './SongsClient';

export default function Page() {
  return (
    <>
      <title>{pageTitle('歌曲列表')}</title>
      <SongsClient />
    </>
  );
}
