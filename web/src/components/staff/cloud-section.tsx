import { useState } from 'react';
import { Card, CardContent, Stack, Switch, Typography } from '@mui/material';
import { TagCloud, type TagCloudItem } from '@/components/ui/tag-cloud';

/** 默认只显示歌曲数不少于这个数的人 */
const MIN_SONGS = 3;

/** 一朵标签云：标题、各自独立的「显示出现 1-2 次」开关 */
export function CloudSection({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: readonly TagCloudItem[];
  emptyText: string;
}) {
  const [showSingles, setShowSingles] = useState(false);
  const shown = items.filter((item) => showSingles || item.count >= MIN_SONGS);

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          <Stack
            direction="row"
            sx={{ alignItems: 'center', justifyContent: 'space-between' }}
          >
            <Typography variant="h6">{title}</Typography>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                显示出现 1-2 次
              </Typography>
              <Switch
                size="small"
                checked={showSingles}
                onChange={(event) => setShowSingles(event.target.checked)}
                slotProps={{
                  input: { 'aria-label': `${title}：显示出现 1-2 次` },
                }}
              />
            </Stack>
          </Stack>
          {shown.length === 0 ? (
            <Typography
              variant="body2"
              sx={{ color: 'text.secondary', textAlign: 'center', py: 6 }}
            >
              {emptyText}
            </Typography>
          ) : (
            <TagCloud items={shown} />
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
