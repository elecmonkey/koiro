import { Box, Card, CardContent, Container, Typography } from '@mui/material';
import { languageName } from '@koiro/shared';
import { PageHeader } from '@/components/ui/page-header';
import { PageState } from '@/components/ui/page-state';
import { TagCloud } from '@/components/ui/tag-cloud';
import { useLanguages } from '@/query';
import { pageTitle } from '@/utils/page-title';

export default function LanguagesPage() {
  const { data, isPending, error } = useLanguages();

  return (
    <Box component="main" sx={{ pb: 8 }}>
      <title>{pageTitle('语种云')}</title>
      <PageHeader title="语种云" />
      <Container sx={{ pt: 4 }}>
        <Card variant="outlined">
          <CardContent>
            <PageState
              loading={isPending}
              error={error}
              empty={data?.length === 0 && '暂无语种数据'}
            >
              <TagCloud
                items={(data ?? []).map((stat) => ({
                  key: stat.language,
                  label: languageName(stat.language),
                  count: stat.songCount,
                  href: `/languages/${stat.language}`,
                  footer: (
                    <Typography
                      variant="caption"
                      sx={{ color: 'text.secondary' }}
                    >
                      {stat.language}
                    </Typography>
                  ),
                }))}
              />
            </PageState>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
