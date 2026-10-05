import { useState } from 'react';
import type { Playlist } from '@koiro/shared';
import { Button, Typography } from '@mui/material';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { ManagerCard } from '@/components/admin/manager-card';
import { ManagerToolbar } from '@/components/admin/manager-toolbar';
import { SearchField } from '@/components/admin/search-field';
import { ListPagination } from '@/components/ui/list-pagination';
import { PageState } from '@/components/ui/page-state';
import { useDeletePlaylist, usePlaylists } from '@/query';
import { CreatePlaylistDialog } from './create-playlist-dialog';
import { EditPlaylistDialog } from './edit-playlist-dialog';
import { PlaylistRow } from './playlist-row';

export function PlaylistsManager() {
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const { data, isPending, error } = usePlaylists({ q: keyword, page });

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Playlist | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Playlist | null>(null);
  const deletePlaylist = useDeletePlaylist();

  return (
    <>
      <ManagerCard>
        <ManagerToolbar title={`播放列表 (${String(data?.total ?? 0)})`}>
          <SearchField
            placeholder="搜索播放列表"
            initial={keyword}
            onSearch={(q) => {
              setKeyword(q);
              setPage(1);
            }}
          />
          <Button
            variant="contained"
            onClick={() => setCreateOpen(true)}
            fullWidth
          >
            新建播放列表
          </Button>
        </ManagerToolbar>

        <PageState
          loading={isPending}
          error={error}
          empty={data?.total === 0 && '暂无播放列表'}
        >
          {data?.items.map((playlist) => (
            <PlaylistRow
              key={playlist.id}
              playlist={playlist}
              onEdit={() => setEditTarget(playlist)}
              onDelete={() => setDeleteTarget(playlist)}
            />
          ))}
          <ListPagination
            page={page}
            totalPages={data?.totalPages ?? 0}
            onChange={setPage}
          />
        </PageState>
      </ManagerCard>

      {createOpen && (
        <CreatePlaylistDialog onClose={() => setCreateOpen(false)} />
      )}
      {editTarget && (
        <EditPlaylistDialog
          playlist={editTarget}
          onClose={() => setEditTarget(null)}
        />
      )}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="确认删除"
        message={
          <Typography>
            确定要删除播放列表「{deleteTarget?.name}」吗？此操作不可撤销。
          </Typography>
        }
        pending={deletePlaylist.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deletePlaylist.mutate(deleteTarget.id, {
            onSuccess: () => setDeleteTarget(null),
          });
        }}
        onClose={() => setDeleteTarget(null)}
      />
    </>
  );
}
