import { useState } from 'react';
import type { User } from '@koiro/shared';
import { Button, Snackbar, Typography } from '@mui/material';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { ManagerCard } from '@/components/admin/manager-card';
import { ManagerToolbar } from '@/components/admin/manager-toolbar';
import { SearchField } from '@/components/admin/search-field';
import { ListPagination } from '@/components/ui/list-pagination';
import { PageState } from '@/components/ui/page-state';
import { useDeleteUser, useUsers } from '@/query';
import { CreateUserDialog } from './create-user-dialog';
import { EditDisplayNameDialog } from './edit-display-name-dialog';
import { EditPermissionsDialog } from './edit-permissions-dialog';
import { ResetPasswordDialog } from './reset-password-dialog';
import { UserRow } from './user-row';

export function UsersManager() {
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const { data, isPending, error } = useUsers({ q: keyword, page });

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [editNameTarget, setEditNameTarget] = useState<User | null>(null);
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [resetDone, setResetDone] = useState(false);

  const deleteUser = useDeleteUser();

  return (
    <>
      <ManagerCard>
        <ManagerToolbar title={`用户 (${String(data?.total ?? 0)})`}>
          <SearchField
            placeholder="搜索用户"
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
            新建用户
          </Button>
        </ManagerToolbar>

        <PageState
          loading={isPending}
          error={error}
          empty={data?.total === 0 && '暂无用户'}
        >
          {data?.items.map((user) => (
            <UserRow
              key={user.id}
              user={user}
              onEditPermissions={() => setEditTarget(user)}
              onEditDisplayName={() => setEditNameTarget(user)}
              onResetPassword={() => setResetTarget(user)}
              onDelete={() => setDeleteTarget(user)}
            />
          ))}
          <ListPagination
            page={page}
            totalPages={data?.totalPages ?? 0}
            onChange={setPage}
          />
        </PageState>
      </ManagerCard>

      {createOpen && <CreateUserDialog onClose={() => setCreateOpen(false)} />}
      {editTarget && (
        <EditPermissionsDialog
          user={editTarget}
          onClose={() => setEditTarget(null)}
        />
      )}
      {editNameTarget && (
        <EditDisplayNameDialog
          user={editNameTarget}
          onClose={() => setEditNameTarget(null)}
        />
      )}
      {resetTarget && (
        <ResetPasswordDialog
          user={resetTarget}
          onClose={() => setResetTarget(null)}
          onDone={() => {
            setResetTarget(null);
            setResetDone(true);
          }}
        />
      )}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="确认删除"
        message={
          <Typography>
            确定要删除用户「{deleteTarget?.displayName}」（{deleteTarget?.email}
            ）吗？此操作不可撤销。
          </Typography>
        }
        pending={deleteUser.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteUser.mutate(deleteTarget.id, {
            onSuccess: () => setDeleteTarget(null),
          });
        }}
        onClose={() => setDeleteTarget(null)}
      />
      <Snackbar
        open={resetDone}
        autoHideDuration={2000}
        message="密码已重置"
        onClose={() => setResetDone(false)}
      />
    </>
  );
}
