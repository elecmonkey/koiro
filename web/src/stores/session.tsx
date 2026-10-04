import type { Session, User } from '@koiro/shared';
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api } from '@/lib/api';

type AuthContextValue = {
  user: User | null;
  allowAnonymous: boolean;
  /** 首次获取会话完成前为 true */
  loading: boolean;
  login: (email: string, password: string, ttlDays: number) => Promise<void>;
  logout: () => Promise<void>;
  /** 资料修改后同步本地状态 */
  setUser: (user: User | null) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Session & { loading: boolean }>({
    user: null,
    allowAnonymous: false,
    loading: true,
  });

  useEffect(() => {
    api<Session>('/api/auth/session')
      .then((session) => setState({ ...session, loading: false }))
      .catch(() => setState((prev) => ({ ...prev, loading: false })));
  }, []);

  const login = useCallback(
    async (email: string, password: string, ttlDays: number) => {
      const session = await api<Session>('/api/auth/login', {
        method: 'POST',
        json: { email, password, ttlDays },
      });
      setState({ ...session, loading: false });
    },
    [],
  );

  const logout = useCallback(async () => {
    await api('/api/auth/logout', { method: 'POST' });
    setState((prev) => ({ ...prev, user: null }));
  }, []);

  const setUser = useCallback((user: User | null) => {
    setState((prev) => ({ ...prev, user }));
  }, []);

  const value = useMemo(
    () => ({ ...state, login, logout, setUser }),
    [state, login, logout, setUser],
  );
  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  const ctx = use(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
