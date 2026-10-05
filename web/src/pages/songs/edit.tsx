import { useParams } from 'react-router';
import { SongForm } from '@/components/song-form/song-form';
import { toFormData } from '@/components/song-form/to-form-data';
import { PageState } from '@/components/ui/page-state';
import { useSong, useSongInput } from '@/query';
import { pageTitle } from '@/utils/page-title';

export default function EditSongPage() {
  const { id = '' } = useParams();
  const input = useSongInput(id);
  const song = useSong(id);

  return (
    <>
      <title>
        {pageTitle(song.data ? `编辑 ${song.data.title}` : '编辑歌曲')}
      </title>
      <PageState
        loading={input.isPending || song.isPending}
        error={input.error ?? song.error}
      >
        {input.data && song.data && (
          <SongForm
            key={id}
            mode="edit"
            songId={id}
            initialData={toFormData(input.data, song.data.coverUrl)}
          />
        )}
      </PageState>
    </>
  );
}
