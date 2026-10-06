import { useMemo, type ReactNode } from 'react';
import { Box, ButtonBase } from '@mui/material';
import { Link } from 'react-router';

export type TagCloudItem = {
  key: string;
  label: string;
  /** 决定字号 */
  count: number;
  href: string;
  /** 文字下方的附加内容 */
  footer?: ReactNode;
};

const MIN_FONT_SIZE = 14;
const MAX_FONT_SIZE = 36;

function hashString(input: string) {
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return hash >>> 0;
}

function scaleSize(count: number, min: number, max: number) {
  if (max === min) return (MIN_FONT_SIZE + MAX_FONT_SIZE) / 2;
  const ratio = (count - min) / (max - min);
  return MIN_FONT_SIZE + ratio * (MAX_FONT_SIZE - MIN_FONT_SIZE);
}

/** 标签云：数量越多字越大；顺序按内容哈希打散，同样的数据每次排列相同 */
export function TagCloud({ items }: { items: readonly TagCloudItem[] }) {
  const counts = items.map((item) => item.count);
  const min = counts.length ? Math.min(...counts) : 0;
  const max = counts.length ? Math.max(...counts) : 0;
  const shuffled = useMemo(
    () =>
      [...items].sort((a, b) => {
        const diff =
          hashString(`${a.key}|${String(a.count)}`) -
          hashString(`${b.key}|${String(b.count)}`);
        return diff !== 0 ? diff : a.key.localeCompare(b.key);
      }),
    [items],
  );

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: { xs: 1.5, sm: 2.5 },
        alignItems: 'center',
        justifyContent: 'center',
        alignContent: 'center',
        py: { xs: 1, sm: 2 },
      }}
    >
      {shuffled.map((item) => (
        <ButtonBase
          key={item.key}
          component={Link}
          to={item.href}
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
            '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
          }}
        >
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              fontSize: scaleSize(item.count, min, max),
              fontWeight: item.count >= max ? 700 : 500,
              lineHeight: 1.2,
            }}
          >
            <Box component="span">{item.label}</Box>
            <Box
              component="span"
              sx={{ fontSize: '0.75em', color: 'text.secondary' }}
            >
              {item.count}
            </Box>
          </Box>
          {item.footer}
        </ButtonBase>
      ))}
    </Box>
  );
}
