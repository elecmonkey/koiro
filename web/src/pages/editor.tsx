import { pageTitle } from '@/utils/page-title';
import EditorShell from '@/components/lyrics-editor/editor-shell';

export default function Page() {
  return (
    <>
      <title>{pageTitle('歌词编辑器')}</title>
      <EditorShell />
    </>
  );
}
