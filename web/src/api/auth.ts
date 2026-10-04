import type {
  CliAuthorization,
  CliAuthorizeRequest,
  LoginRequest,
  Session,
} from '@koiro/shared';
import { request } from '@/http';

export const fetchSession = ({ signal }: { signal?: AbortSignal } = {}) =>
  request<Session>('GET', '/auth/session', { signal });

export const login = (body: LoginRequest) =>
  request<Session>('POST', '/auth/login', { body });

export const logout = () => request<void>('POST', '/auth/logout');

/** 已登录的用户确认命令行登录，返回带授权码的回调地址 */
export const authorizeCli = (body: CliAuthorizeRequest) =>
  request<CliAuthorization>('POST', '/auth/cli/authorize', { body });
