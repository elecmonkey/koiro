import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  ButtonBase,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Stack,
  Typography,
} from '@mui/material';
import { Link } from 'react-router';

import { languageName, type LanguageStat } from '@koiro/shared';
import { api } from '@/lib/api';

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

export default function LanguageCloudClient() {
  const [languages, setLanguages] = useState<LanguageStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const fetchLanguages = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api<LanguageStat[]>('/api/languages');
        if (active) setLanguages(data);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : '未知错误');
      } finally {
        if (active) setLoading(false);
      }
    };
    void fetchLanguages();
    return () => {
      active = false;
    };
  }, []);

  const counts = useMemo(() => languages.map((l) => l.songCount), [languages]);
  const minCount = counts.length ? Math.min(...counts) : 0;
  const maxCount = counts.length ? Math.max(...counts) : 0;

  const sortedLanguages = useMemo(() => {
    const items = [...languages];
    items.sort((a, b) => {
      const aKey = `${a.language}|${a.songCount}`;
      const bKey = `${b.language}|${b.songCount}`;
      const aHash = hashString(aKey);
      const bHash = hashString(bKey);
      if (aHash !== bHash) return aHash - bHash;
      return a.language.localeCompare(b.language);
    });
    return items;
  }, [languages]);

  return (
    <Box component="main" sx={{ pb: 8 }}>
      <Container sx={{ pt: 6 }}>
        <Typography variant="h4">语种云</Typography>
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
            ) : languages.length === 0 ? (
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  py: 4,
                  textAlign: 'center',
                }}
              >
                暂无语种数据
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
                {sortedLanguages.map((item) => {
                  const fontSize = scaleSize(
                    item.songCount,
                    minCount,
                    maxCount,
                    14,
                    36,
                  );
                  return (
                    <ButtonBase
                      key={item.language}
                      component={Link}
                      to={`/languages/${encodeURIComponent(item.language)}`}
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
                        <Box component="span">
                          {languageName(item.language)}
                        </Box>
                        <Box
                          component="span"
                          sx={{ fontSize: '0.75em', color: 'text.secondary' }}
                        >
                          {item.songCount}
                        </Box>
                      </Box>
                      <Stack direction="row" spacing={0.5}>
                        <Typography
                          variant="caption"
                          sx={{
                            color: 'text.secondary',
                          }}
                        >
                          {item.language}
                        </Typography>
                      </Stack>
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
