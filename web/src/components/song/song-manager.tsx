import { useState } from 'react';
import type { SongSummary } from '@koiro/shared';
import { Button, Typography } from '@mui/material';
import { Link } from 'react-router';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { ManagerCard } from '@/components/admin/manager-card';
import { ManagerToolbar } from '@/components/admin/manager-toolbar';
import { SearchField } from '@/components/admin/search-field';
import { ListPagination } from '@/components/ui/list-pagination';
import { PageState } from '@/components/ui/page-state';
import { useDeleteSong, useMySongs } from '@/query';
import { SongRow } from './song-row';

export function SongsManager() {
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const { data, isPending, error } = useMySongs({ q: keyword, page });

  const [deleteTarget, setDeleteTarget] = useState<SongSummary | null>(null);
  const deleteSong = useDeleteSong();

  return (
    <>
      <ManagerCard>
        <ManagerToolbar title={`歌曲 (${String(data?.total ?? 0)})`}>
          <SearchField
            placeholder="搜索歌曲"
            initial={keyword}
            onSearch={(q) => {
              setKeyword(q);
              setPage(1);
            }}
          />
          <Button component={Link} to="/upload" variant="contained" fullWidth>
            上传新歌曲
          </Button>
        </ManagerToolbar>

        <PageState
          loading={isPending}
          error={error}
          empty={data?.total === 0 && '暂无歌曲'}
        >
          {data?.items.map((song) => (
            <SongRow
              key={song.id}
              song={song}
              onDelete={() => setDeleteTarget(song)}
            />
          ))}
          <ListPagination
            page={page}
            totalPages={data?.totalPages ?? 0}
            onChange={setPage}
          />
        </PageState>
      </ManagerCard>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="确认删除"
        message={
          <Typography>
            确定要删除歌曲「{deleteTarget?.title}」吗？此操作不可撤销。
          </Typography>
        }
        pending={deleteSong.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteSong.mutate(deleteTarget.id, {
            onSuccess: () => setDeleteTarget(null),
          });
        }}
        onClose={() => setDeleteTarget(null)}
      />
    </>
  );
}
