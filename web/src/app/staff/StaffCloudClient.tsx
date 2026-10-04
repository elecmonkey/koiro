import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  ButtonBase,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import { Link } from 'react-router';
import type { StaffMember } from '@koiro/shared';
import { api } from '@/lib/api';

/** 默认只显示参与歌曲数不少于这个数的人 */
const MIN_SONGS = 3;

function hashString(input: string) {
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return hash >>> 0;
}

function scaleSize(
  count: number,
  min: number,
  max: number,
  minSize: number,
  maxSize: number,
) {
  if (max === min) return (minSize + maxSize) / 2;
  const ratio = (count - min) / (max - min);
  return minSize + ratio * (maxSize - minSize);
}

export default function StaffCloudClient() {
  const [members, setMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSingles, setShowSingles] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchStaff = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api<StaffMember[]>('/api/staff');
        if (active) setMembers(data);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : '未知错误');
      } finally {
        if (active) setLoading(false);
      }
    };
    void fetchStaff();
    return () => {
      active = false;
    };
  }, []);

  const staff = useMemo(
    () =>
      showSingles
        ? members
        : members.filter((member) => member.songCount >= MIN_SONGS),
    [members, showSingles],
  );

  const counts = useMemo(() => staff.map((s) => s.songCount), [staff]);
  const minCount = counts.length ? Math.min(...counts) : 0;
  const maxCount = counts.length ? Math.max(...counts) : 0;
  const sortedStaff = useMemo(() => {
    const items = [...staff];
    items.sort((a, b) => {
      const aKey = `${a.name}|${a.songCount}|${a.roles.map((r) => `${r.role}:${r.songCount}`).join(',')}`;
      const bKey = `${b.name}|${b.songCount}|${b.roles.map((r) => `${r.role}:${r.songCount}`).join(',')}`;
      const aHash = hashString(aKey);
      const bHash = hashString(bKey);
      if (aHash !== bHash) return aHash - bHash;
      return a.name.localeCompare(b.name);
    });
    return items;
  }, [staff]);

  return (
    <Box component="main" sx={{ pb: 8 }}>
      <Container sx={{ pt: 6 }}>
        <Stack
          direction="row"
          sx={{
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography variant="h4">Staff 云</Typography>
          <Stack
            direction="row"
            spacing={1}
            sx={{
              alignItems: 'center',
            }}
          >
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
              }}
            >
              显示出现 1-2 次
            </Typography>
            <Switch
              size="small"
              checked={showSingles}
              onChange={(event) => setShowSingles(event.target.checked)}
              slotProps={{ input: { 'aria-label': 'show singles' } }}
            />
          </Stack>
        </Stack>
      </Container>

      <Container sx={{ pt: 4 }}>
        <Card variant="outlined">
          <CardContent>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress />
              </Box>
            ) : error ? (
              <Alert severity="error">{error}</Alert>
            ) : staff.length === 0 ? (
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  py: 4,
                  textAlign: 'center',
                }}
              >
                暂无 Staff 数据
              </Typography>
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: { xs: 1.5, sm: 2.5 },
                  alignItems: 'center',
                  justifyContent: 'center',
                  alignContent: 'center',
                  minHeight: { xs: 240, sm: 320 },
                }}
              >
                {sortedStaff.map((item) => {
                  const fontSize = scaleSize(
                    item.songCount,
                    minCount,
                    maxCount,
                    14,
                    36,
                  );
                  const topRoles = item.roles.slice(0, 3);
                  return (
                    <ButtonBase
                      key={item.name}
                      component={Link}
                      to={`/staff/${encodeURIComponent(item.name)}`}
                      sx={{
                        display: 'inline-flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 0.75,
                        px: 1.5,
                        py: 1,
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        minWidth: 140,
                        textAlign: 'center',
                        textDecoration: 'none',
                        color: 'inherit',
                        transition: 'border-color 0.2s, background-color 0.2s',
                        '&:hover': {
                          borderColor: 'primary.main',
                          bgcolor: 'action.hover',
                        },
                      }}
                    >
                      <Box
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 1,
                          fontSize,
                          fontWeight: item.songCount >= maxCount ? 700 : 500,
                          lineHeight: 1.2,
                        }}
                      >
                        <Box component="span">{item.name}</Box>
                        <Box
                          component="span"
                          sx={{ fontSize: '0.75em', color: 'text.secondary' }}
                        >
                          {item.songCount}
                        </Box>
                      </Box>
                      {topRoles.length > 0 && (
                        <Stack
                          direction="row"
                          spacing={0.5}
                          useFlexGap
                          sx={{
                            flexWrap: 'wrap',
                          }}
                        >
                          {topRoles.map((role) => (
                            <Chip
                              key={role.role}
                              size="small"
                              label={role.role}
                              variant="outlined"
                              sx={{
                                bgcolor: {
                                  xs: 'rgba(255,255,255,0.8)',
                                  sm: 'transparent',
                                },
                                backdropFilter: { xs: 'blur(4px)', sm: 'none' },
                              }}
                            />
                          ))}
                        </Stack>
                      )}
                    </ButtonBase>
                  );
                })}
              </Box>
            )}
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
