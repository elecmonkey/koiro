import type {
  PageQuery,
  ProfilePatch,
  Session,
  UserFilter,
  UserId,
  UserInput,
  UserPatch,
} from '@koiro/shared';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  createUser,
  deleteUser,
  fetchProfile,
  fetchUsers,
  updateProfile,
  updateUser,
  uploadAvatar,
} from '@/api';
import { queryKeys } from './keys';

export function useUsers(query: PageQuery & UserFilter) {
  return useQuery({
    queryKey: queryKeys.userList(query),
    queryFn: ({ signal }) => fetchUsers(query, { signal }),
    placeholderData: keepPreviousData,
  });
}

export function useCreateUser() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: UserInput) => createUser(input),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.users }),
  });
}

export function useUpdateUser() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: UserId; patch: UserPatch }) =>
      updateUser(id, patch),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.users }),
  });
}

export function useDeleteUser() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: UserId) => deleteUser(id),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.users }),
  });
}

export function useProfile() {
  return useQuery({
    queryKey: queryKeys.profile,
    queryFn: ({ signal }) => fetchProfile({ signal }),
  });
}

/** 改了昵称要同步到会话里的当前用户 */
export function useUpdateProfile() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (patch: ProfilePatch) => updateProfile(patch),
    onSuccess: (user) => {
      client.setQueryData(queryKeys.profile, user);
      client.setQueryData<Session>(queryKeys.session, (session) =>
        session ? { ...session, user } : session,
      );
    },
  });
}

/** 上传并设为自己的头像 */
export function useUploadAvatar() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      file,
      onProgress,
    }: {
      file: Blob;
      onProgress?: (percent: number) => void;
    }) => uploadAvatar(file, onProgress),
    onSuccess: (user) => {
      client.setQueryData(queryKeys.profile, user);
      client.setQueryData<Session>(queryKeys.session, (session) =>
        session ? { ...session, user } : session,
      );
    },
  });
}
