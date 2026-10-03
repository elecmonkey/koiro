import { Navigate, useSearchParams } from 'react-router';
import { useAuth } from '@/auth/AuthContext';
import { pageTitle } from '@/lib/site-config';
import LoginForm from './LoginForm';

export default function Page() {
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  // 已登录（包括刚登录成功）时跳回来源页面，没有则回首页
  if (!loading && user) {
    return <Navigate to={safeNext(searchParams.get('next'))} replace />;
  }
  return (
    <>
      <title>{pageTitle('登录')}</title>
      <LoginForm />
    </>
  );
}

/** 只允许站内相对路径，防止开放重定向 */
function safeNext(next: string | null) {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
}
