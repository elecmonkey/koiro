import { Box, Pagination } from '@mui/material';

/** 列表底部的分页；只有一页时不显示。换页后回到页面顶部 */
export function ListPagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', pt: 2 }}>
      <Pagination
        count={totalPages}
        page={page}
        onChange={(_, value) => {
          onChange(value);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        color="primary"
      />
    </Box>
  );
}
