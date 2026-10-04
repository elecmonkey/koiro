import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import { Link } from 'react-router';
import type { MatchField, SearchHit, TextSegment } from '@koiro/shared';

type SearchResultCardProps = {
  hit: SearchHit;
};

const matchLabels: Record<MatchField, string> = {
  title: '标题',
  staff: 'Staff',
  lyrics: '歌词',
};

/** 显示的 staff 条数，多出的折叠为「+N」 */
const STAFF_SHOWN = 3;

/** 窄屏时 staff 叠在封面上，加一层半透明底 */
const staffChipSx = {
  bgcolor: {
    xs: 'rgba(255,255,255,0.8)',
    sm: 'transparent',
  },
  backdropFilter: { xs: 'blur(4px)', sm: 'none' },
};

function HighlightText({ parts }: { parts: readonly TextSegment[] }) {
  return (
    <>
      {parts.map((part, idx) =>
        part.highlight ? (
          <Box
            key={idx}
            component="span"
            sx={{
              bgcolor: 'warning.light',
              color: 'text.primary',
              borderRadius: 0.5,
              px: 0.2,
            }}
          >
            {part.text}
          </Box>
        ) : (
          <Box key={idx} component="span">
            {part.text}
          </Box>
        ),
      )}
    </>
  );
}

export function SearchResultCard({ hit }: SearchResultCardProps) {
  const { song } = hit;

  return (
    <Card
      variant="outlined"
      sx={{
        position: 'relative',
        transition: 'border-color 0.2s',
        overflow: 'hidden',
        '&:hover': {
          borderColor: 'primary.main',
        },
      }}
    >
      <Box
        sx={{
          display: { xs: 'block', sm: 'none' },
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '45%',
          background: `url(${song.coverUrl}) center/cover no-repeat`,
          '&::after': {
            content: '""',
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: '60%',
            background: (theme) =>
              `linear-gradient(to right, transparent, ${theme.palette.background.paper})`,
          },
        }}
      />

      <CardActionArea
        component={Link}
        to={`/songs/${song.id}`}
        sx={{ height: { xs: 'auto', sm: 92 } }}
      >
        <CardContent
          sx={{
            py: { xs: 2, sm: 0 },
            pl: { xs: 2, sm: 0 },
            height: '100%',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Stack
            direction="row"
            spacing={2}
            sx={{
              alignItems: { xs: 'flex-start', sm: 'center' },
              width: '100%',
            }}
          >
            <Box
              sx={{
                display: { xs: 'none', sm: 'flex' },
                width: 92,
                height: 92,
                flexShrink: 0,
                background: `url(${song.coverUrl}) center/cover no-repeat`,
              }}
            />

            <Box sx={{ flex: 1, minWidth: 0, pl: { xs: '30%', sm: 0 } }}>
              <Stack spacing={0.75}>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{
                    alignItems: 'center',
                    flexWrap: 'wrap',
                  }}
                >
                  <Typography
                    variant="subtitle1"
                    noWrap
                    sx={{
                      fontWeight: 500,
                      color: 'text.primary',
                    }}
                  >
                    <HighlightText parts={hit.title} />
                  </Typography>
                  {hit.matched.map((type) => (
                    <Chip
                      key={type}
                      size="small"
                      label={matchLabels[type]}
                      color={
                        type === 'title'
                          ? 'primary'
                          : type === 'staff'
                            ? 'secondary'
                            : 'default'
                      }
                      variant="outlined"
                      sx={{ height: 20, fontSize: 11 }}
                    />
                  ))}
                </Stack>

                {hit.lyricsExcerpt && (
                  <Typography
                    variant="body2"
                    noWrap
                    sx={{
                      color: 'text.secondary',
                    }}
                  >
                    <HighlightText parts={hit.lyricsExcerpt} />
                  </Typography>
                )}

                {hit.staff.length > 0 && (
                  <Stack
                    direction="row"
                    spacing={0.5}
                    useFlexGap
                    sx={{
                      flexWrap: 'wrap',
                    }}
                  >
                    {hit.staff.slice(0, STAFF_SHOWN).map((credit, idx) => (
                      <Chip
                        key={idx}
                        label={
                          <Box component="span">
                            {credit.role} ·{' '}
                            {credit.names.map((name, nameIdx) => (
                              <Box component="span" key={nameIdx}>
                                {nameIdx > 0 && '、'}
                                <HighlightText parts={name} />
                              </Box>
                            ))}
                          </Box>
                        }
                        size="small"
                        variant="outlined"
                        sx={staffChipSx}
                      />
                    ))}
                    {hit.staff.length > STAFF_SHOWN && (
                      <Chip
                        label={`+${hit.staff.length - STAFF_SHOWN}`}
                        size="small"
                        variant="outlined"
                        sx={staffChipSx}
                      />
                    )}
                  </Stack>
                )}
              </Stack>
            </Box>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
