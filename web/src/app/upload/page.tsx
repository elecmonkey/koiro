import { pageTitle } from '@/lib/site-config';
import UploadForm from './UploadForm';

export default function Page() {
  return (
    <>
      <title>{pageTitle('上传歌曲')}</title>
      <UploadForm />
    </>
  );
}
