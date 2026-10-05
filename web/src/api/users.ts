import type {
  Page,
  PageQuery,
  ProfilePatch,
  User,
  UserFilter,
  UserId,
  UserInput,
  UserPatch,
} from '@koiro/shared';
import { apiUrl, request, sendFile } from '@/http';

type Signal = { signal?: AbortSignal };

export const fetchUsers = (
  query: PageQuery & UserFilter,
  { signal }: Signal = {},
) => request<Page<User>>('GET', '/users', { query, signal });

export const createUser = (input: UserInput) =>
  request<User>('POST', '/users', { body: input });

export const updateUser = (id: UserId, patch: UserPatch) =>
  request<User>('PATCH', `/users/${id}`, { body: patch });

export const deleteUser = (id: UserId) =>
  request<void>('DELETE', `/users/${id}`);

export const fetchProfile = ({ signal }: Signal = {}) =>
  request<User>('GET', '/profile', { signal });

export const updateProfile = (patch: ProfilePatch) =>
  request<User>('PATCH', '/profile', { body: patch });

/** 上传并设为自己的头像；不要求 UPLOAD 权限 */
export const uploadAvatar = async (
  file: Blob,
  onProgress?: (percent: number) => void,
): Promise<User> => {
  const body = await sendFile('POST', apiUrl('/profile/avatar'), file, {
    headers: { 'Content-Type': 'application/octet-stream' },
    onProgress,
  });
  return JSON.parse(body) as User;
};
