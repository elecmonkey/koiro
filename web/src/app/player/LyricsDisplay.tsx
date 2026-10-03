import { Box, Stack, Typography } from '@mui/material';
import type { Language } from '@koiro/shared';
import type { Inline } from '@/app/editor/ast/types';
import { lyricsFontFamily } from '@/lib/lyricsFont';
import type { LyricLine } from './useLyricsSync';

interface LyricsDisplayProps {
  prevLine: LyricLine | null;
  currentLine: LyricLine | null;
  nextLine: LyricLine | null;
  /** 是否处于预览模式（第一句歌词开始前） */
  isPreview?: boolean;
  /** 歌词语言列表，用于判断字体优先级 */
  languages?: Language[];
}

/**
 * 渲染 Inline 节点数组
 */
function renderInlines(inlines: Inline[]): React.ReactNode {
  return inlines.map((inline, index) => {
    switch (inline.type) {
      case 'text':
        return <span key={index}>{inline.text}</span>;
      case 'ruby':
        return (
          <ruby key={index} style={{ rubyPosition: 'over' }}>
            {inline.base}
            <rp>(</rp>
            <rt style={{ fontSize: '0.7em', fontWeight: 400 }}>
              {inline.ruby}
            </rt>
            <rp>)</rp>
          </ruby>
        );
    }
  });
}

/**
 * 单行歌词显示（带淡入动画）
 * 使用 key 触发 CSS animation
 */
function LyricLineView({
  line,
  variant,
  isPreview = false,
  languages = [],
}: {
  line: LyricLine | null;
  variant: 'prev' | 'current' | 'next';
  isPreview?: boolean;
  languages?: Language[];
}) {
  // 预览模式下 current 也不高亮
  const effectiveVariant = isPreview ? 'prev' : variant;

  const fontFamily =
    lyricsFontFamily(languages) ??
    'var(--font-body), var(--font-jp-sans), "Noto Sans SC", sans-serif';

  const baseStyles = {
    prev: {
      opacity: 0.5,
      fontSize: '0.85rem',
      fontWeight: 400,
    },
    current: {
      opacity: 1,
      fontSize: '0.95rem',
      fontWeight: 600,
    },
    next: {
      opacity: 0.5,
      fontSize: '0.85rem',
      fontWeight: 400,
    },
  };

  if (!line) {
    return (
      <Box
        sx={{
          height: 28,
        }}
      />
    );
  }

  return (
    <Typography
      key={line.index}
      component="div"
      sx={{
        ...baseStyles[effectiveVariant],
        fontFamily,
        lineHeight: 1.6,
        textAlign: 'center',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        animation: 'lyricFadeIn 0.3s ease-out',
        '@keyframes lyricFadeIn': {
          '0%': {
            opacity: 0,
            transform: 'translateY(8px)',
          },
          '100%': {
            opacity: baseStyles[effectiveVariant].opacity,
            transform: 'translateY(0)',
          },
        },
        '& ruby': {
          rubyAlign: 'center',
        },
        '& rt': {
          color:
            effectiveVariant === 'current' ? 'primary.main' : 'text.secondary',
        },
      }}
    >
      {renderInlines(line.block.children)}
    </Typography>
  );
}

/**
 * 歌词显示组件 - 显示3行歌词（上一行、当前行、下一行）
 */
export function LyricsDisplay({
  prevLine,
  currentLine,
  nextLine,
  isPreview = false,
  languages = [],
}: LyricsDisplayProps) {
  const hasLyrics = prevLine || currentLine || nextLine;

  if (!hasLyrics) {
    return (
      <Box
        sx={{
          py: 1.5,
          px: 1,
          textAlign: 'center',
        }}
      >
        <Typography
          variant="body2"
          sx={{
            color: 'text.secondary',
            opacity: 0.6,
          }}
        >
          暂无歌词
        </Typography>
      </Box>
    );
  }

  return (
    <Stack
      spacing={0.5}
      sx={{
        py: 1,
        px: 1,
        minHeight: 88,
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <LyricLineView
        line={prevLine}
        variant="prev"
        isPreview={isPreview}
        languages={languages}
      />
      <LyricLineView
        line={currentLine}
        variant="current"
        isPreview={isPreview}
        languages={languages}
      />
      <LyricLineView
        line={nextLine}
        variant="next"
        isPreview={isPreview}
        languages={languages}
      />
    </Stack>
  );
}
