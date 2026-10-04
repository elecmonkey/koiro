import type { Playlist } from '@koiro/shared';
import {
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Typography,
} from '@mui/material';
import { Link } from 'react-router';

/** 歌单封面卡片，点击进入歌单 */
export function PlaylistCard({
  playlist,
  showSongCount = false,
}: {
  playlist: Playlist;
  showSongCount?: boolean;
}) {
  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        transition: 'border-color 0.2s',
        '&:hover': { borderColor: 'primary.main' },
      }}
    >
      <CardActionArea
        component={Link}
        to={`/playlists/${playlist.id}`}
        sx={{ height: '100%' }}
      >
        <CardMedia
          component="img"
          image={playlist.coverUrl}
          alt={playlist.name}
          sx={{ aspectRatio: '1', objectFit: 'cover' }}
        />
        <CardContent sx={{ p: 1.5 }}>
          <Typography variant="subtitle2" noWrap title={playlist.name}>
            {playlist.name}
          </Typography>
          {showSongCount && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {playlist.songCount} 首歌曲
            </Typography>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
