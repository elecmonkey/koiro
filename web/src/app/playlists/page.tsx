import { pageTitle } from '@/lib/site-config';
import PlaylistsClient from './PlaylistsClient';

export default function Page() {
  return (
    <>
      <title>{pageTitle('播放列表')}</title>
      <PlaylistsClient />
    </>
  );
}
