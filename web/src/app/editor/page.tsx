import { pageTitle } from '@/lib/site-config';
import EditorShell from './EditorShell';

export default function Page() {
  return (
    <>
      <title>{pageTitle('歌词编辑器')}</title>
      <EditorShell />
    </>
  );
}
