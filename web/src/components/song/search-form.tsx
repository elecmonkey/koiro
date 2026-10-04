import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CircularProgress,
  InputAdornment,
  Stack,
  TextField,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

/** 搜索框；关键字由调用方决定去处（如写进 URL） */
export function SearchForm({
  initial,
  searching,
  onSearch,
}: {
  initial: string;
  searching: boolean;
  onSearch: (q: string) => void;
}) {
  const [value, setValue] = useState(initial);
  const submit = () => onSearch(value.trim());

  return (
    <Card variant="outlined">
      <Box sx={{ p: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            fullWidth
            placeholder="搜索歌曲标题、Staff 或歌词内容..."
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              },
            }}
          />
          <Button
            variant="contained"
            onClick={submit}
            disabled={searching}
            sx={{ minWidth: 100 }}
          >
            {searching ? <CircularProgress size={24} /> : '搜索'}
          </Button>
        </Stack>
      </Box>
    </Card>
  );
}
