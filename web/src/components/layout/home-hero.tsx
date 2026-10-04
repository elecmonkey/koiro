import { useState } from 'react';
import {
  Box,
  Container,
  InputAdornment,
  Stack,
  TextField,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useNavigate } from 'react-router';

/** 首页顶部：站名「声の色」与搜索框 */
export function HomeHero() {
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const q = inputValue.trim();
    if (e.key === 'Enter' && q)
      void navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <Container maxWidth="sm" sx={{ pt: 8, pb: 6 }}>
      <Stack spacing={4} sx={{ alignItems: 'center' }}>
        {/* 标题：「声の色」with ruby annotations */}
        <Box
          component="h1"
          sx={{
            fontSize: { xs: 48, sm: 60, md: 72 },
            fontWeight: 700,
            letterSpacing: '0.05em',
            color: 'text.primary',
            m: 0,
            textAlign: 'center',
            fontFamily:
              'var(--font-jp-display), "Noto Serif SC", Georgia, "Times New Roman", serif',
            display: 'flex',
            alignItems: 'flex-end', // 底部对齐
            userSelect: 'none',
            WebkitUserSelect: 'none',
          }}
        >
          <Box component="span" sx={{ lineHeight: 1 }}>
            「
          </Box>
          <Box
            component="span"
            sx={{
              display: 'inline-flex',
              flexDirection: 'column',
              alignItems: 'center',
              transform: 'translateY(4px)', // 声往下移
            }}
          >
            <Box
              component="span"
              sx={{
                fontSize: '0.4em',
                fontWeight: 900,
                color: 'text.secondary',
                letterSpacing: '0.1em',
                mb: -2.2, // 假名离汉字更近
              }}
            >
              こえ
            </Box>
            <Box component="span">声</Box>
          </Box>
          <Box
            component="span"
            sx={{ mx: 0.2, lineHeight: 1, transform: 'translateY(-10px)' }}
          >
            の
          </Box>
          <Box
            component="span"
            sx={{
              display: 'inline-flex',
              flexDirection: 'column',
              alignItems: 'center',
              transform: 'translateY(4px)', // 色往下移
            }}
          >
            <Box
              component="span"
              sx={{
                fontSize: '0.4em',
                fontWeight: 900,
                color: 'text.secondary',
                letterSpacing: '0.1em',
                mb: -2.2, // 假名离汉字更近
              }}
            >
              いろ
            </Box>
            <Box component="span">色</Box>
          </Box>
          <Box component="span" sx={{ lineHeight: 1 }}>
            」
          </Box>
        </Box>

        <TextField
          id="home-search"
          fullWidth
          placeholder="搜索歌曲、Staff 或歌词..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
              sx: {
                borderRadius: 6,
                bgcolor: 'background.paper',
                fontSize: 18,
                py: 0.5,
                '&:hover': {
                  boxShadow: 1,
                },
                '&.Mui-focused': {
                  boxShadow: 2,
                },
              },
            },
          }}
          sx={{
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: 'divider',
            },
          }}
        />
      </Stack>
    </Container>
  );
}
