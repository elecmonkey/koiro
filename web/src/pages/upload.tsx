import { pageTitle } from '@/utils/page-title';
import { SongForm } from '@/components/song-form/song-form';

export default function Page() {
  return (
    <>
      <title>{pageTitle('上传歌曲')}</title>
      <SongForm mode="create" />
    </>
  );
}
