import { useState } from 'react';
import { IconButton, InputAdornment, TextField } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

/** 带清除按钮的搜索框；回车提交，关键字交给调用方处理（如写回查询参数） */
export function SearchField({
  placeholder,
  initial,
  onSearch,
}: {
  placeholder: string;
  initial: string;
  onSearch: (keyword: string) => void;
}) {
  const [value, setValue] = useState(initial);

  return (
    <TextField
      size="small"
      placeholder={placeholder}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onSearch(value.trim());
      }}
      slotProps={{
        input: {
          endAdornment: value ? (
            <InputAdornment position="end">
              <IconButton
                size="small"
                onClick={() => {
                  setValue('');
                  onSearch('');
                }}
                aria-label="clear search"
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ) : undefined,
        },
      }}
      fullWidth
      sx={{ minWidth: { md: 220 } }}
    />
  );
}
