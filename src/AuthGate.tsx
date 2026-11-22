import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import App from './App';
import { CloudApp } from './CloudApp';
import { AuthScreen, type AuthNotice } from './screens/AuthScreen';
import { getCurrentUser, logout } from './lib/auth';
import type { AuthUser } from './lib/auth';
import { authReturn, supabase, toAuthUser } from './lib/supabase';
import { setStorageScope } from './lib/storage';
import { TooltipProvider } from './components/ui/tooltip';
import { Toaster } from './components/ui/sonner';

function initialUser(): AuthUser | null {
  if (supabase) return null;
  const user = getCurrentUser();
  setStorageScope(user?.id ?? null);
  return user;
}

export function AuthGate() {
  const [user, setUser] = useState<AuthUser | null>(initialUser);
  const [loading, setLoading] = useState(!!supabase);
  const [notice, setNotice] = useState<AuthNotice>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    let ready = !authReturn;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active || !ready) return;
      const next = session ? toAuthUser(session.user) : null;
      setStorageScope(next?.id ?? null, false);
      setUser(next);
      setLoading(false);
    });
    if (authReturn) {
      const pending = authReturn;
      void pending.result.then((result) => {
        if (!active) return;
        if ('session' in result) {
          const next = toAuthUser(result.session.user);
          setStorageScope(next.id, false);
          setUser(next);
          if (result.kind === 'recovery') {
            setNotice('reset-password');
            navigateRef.current('/login', { replace: true });
          } else {
            if (pending.email) toast.success('Адрес подтверждён');
            navigateRef.current('/', { replace: true });
          }
        } else {
          const message = result.kind === 'confirmed' ? 'confirmed-email'
            : result.kind === 'retry-sign-in' ? 'retry-email'
            : pending.recovery ? 'invalid-recovery' : pending.email ? 'invalid-email' : 'google-cancelled';
          setNotice(message);
          navigateRef.current('/login', { replace: true });
        }
        ready = true;
        setLoading(false);
      });
    }
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleAuthenticated = useCallback((next: AuthUser) => {
    setStorageScope(next.id, !supabase);
    setUser(next);
    const from = (location.state as { from?: string } | null)?.from;
    navigate(from && !from.startsWith('/login') ? from : '/', { replace: true });
  }, [location.state, navigate]);

  const handleLogout = useCallback(async () => {
    if (supabase) {
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) {
        toast.error('Не удалось выйти. Попробуйте снова.');
        return;
      }
    } else {
      logout();
    }
    setStorageScope(null);
    setUser(null);
    setNotice(null);
    navigate('/login', { replace: true });
  }, [navigate]);

  return (
    <TooltipProvider>
      {loading ? (
        <p role="status" className="p-6">Проверяем вход…</p>
      ) : user && !notice ? (
        (supabase ? <CloudApp key={user.id} user={user} onLogout={handleLogout} />
          : <App key={user.id} user={user} onLogout={handleLogout} />)
      ) : (
        <Routes>
          <Route path="/login" element={<AuthScreen notice={notice} onAuthenticated={(next) => {
            setNotice(null);
            handleAuthenticated(next);
          }} />} />
          <Route path="*" element={<Navigate to="/login" replace state={{ from: location.pathname }} />} />
        </Routes>
      )}
      <Toaster position="bottom-right" mobileOffset={92} />
    </TooltipProvider>
  );
}
