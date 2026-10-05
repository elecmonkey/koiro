import { useParams } from 'react-router';
import { hasPermission } from '@koiro/shared';
import { Box, Container } from '@mui/material';
import { LyricsCard } from '@/components/song/lyrics-card';
import { SongHeader } from '@/components/song/song-header';
import { SongNotFound } from '@/components/song/song-not-found';
import { OwnerFooter } from '@/components/ui/owner-footer';
import { PageState } from '@/components/ui/page-state';
import { ApiError } from '@/http';
import { useCurrentUser, useSong } from '@/query';
import { pageTitle } from '@/utils/page-title';

export default function SongDetailPage() {
  const { id = '' } = useParams();
  const user = useCurrentUser();
  const { data: song, isPending, error } = useSong(id);
  const notFound = error instanceof ApiError && error.status === 404;
  const canEdit =
    user !== null &&
    !!song?.owner &&
    (hasPermission(user, 'admin') || user.id === song.owner.id);

  return (
    <Box component="main" sx={{ pb: 8 }}>
      <title>
        {pageTitle(song?.title ?? (notFound ? '未找到歌曲' : '歌曲详情'))}
      </title>
      {song && (
        <meta
          name="description"
          content={song.description || `收听 ${song.title}`}
        />
      )}
      <Container sx={{ pt: 6 }}>
        {notFound ? (
          <SongNotFound id={id} />
        ) : (
          <PageState loading={isPending} error={error}>
            {song && (
              <SongHeader
                song={song}
                canDownload={user !== null && hasPermission(user, 'download')}
              />
            )}
          </PageState>
        )}
      </Container>
      {song && (
        <Container sx={{ pt: 4 }}>
          <LyricsCard key={song.id} lyrics={song.lyrics} />
        </Container>
      )}
      {song && (
        <Container sx={{ pt: 4 }}>
          <OwnerFooter
            owner={song.owner}
            label="上传者"
            canEdit={canEdit}
            editHref={`/songs/${song.id}/edit`}
          />
        </Container>
      )}
    </Box>
  );
}
