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
import { request } from '@/http';

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
