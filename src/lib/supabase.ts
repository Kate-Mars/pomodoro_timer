import { createClient, type Session, type User } from '@supabase/supabase-js';
import type { AuthUser } from './auth';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
export const supabase = url && key
  ? createClient(url, key, { auth: { flowType: 'pkce', detectSessionInUrl: false } })
  : null;

export const emailRedirect = () => new URL('/auth/confirm', window.location.origin).href;
export const googleRedirect = () => new URL('/auth/callback', window.location.origin).href;

export function toAuthUser(user: User): AuthUser {
  const { id, email = '', created_at: createdAt, user_metadata } = user;
  const name = [user_metadata.name, user_metadata.full_name].find(
    (value): value is string => typeof value === 'string' && !!value.trim(),
  );
  return { id, email, createdAt, name: name?.trim().slice(0, 32) ?? (email.split('@')[0] || 'Пользователь') };
}

export function authMessage(code?: string): string {
  switch (code) {
    case 'email_not_confirmed': return 'Сначала подтвердите адрес по ссылке из письма.';
    case 'invalid_credentials': return 'Неверный email или пароль.';
    case 'over_email_send_rate_limit': return 'Лимит писем исчерпан. Попробуйте позже.';
    case 'over_request_rate_limit': return 'Слишком много попыток. Подождите и попробуйте снова.';
    case 'email_address_not_authorized': return 'Отправка на этот адрес недоступна. Проверьте настройки SMTP.';
    case 'user_already_exists': return 'Аккаунт с таким email уже есть. Попробуйте войти.';
    default: return 'Не удалось выполнить запрос. Проверьте подключение и попробуйте снова.';
  }
}

export const authReturn = (() => {
  const { pathname, search, hash } = window.location;
  if (pathname !== '/auth/confirm' && pathname !== '/auth/callback') return null;
  const params = new URLSearchParams(search);
  const fragment = new URLSearchParams(hash.slice(1));
  const email = pathname === '/auth/confirm';
  const errorCode = params.get('error_code') ?? fragment.get('error_code');
  const failed = params.has('error') || fragment.has('error') || !!errorCode;
  const tokenHash = params.get('token_hash');
  const recovery = email && params.get('type') === 'recovery';
  const code = params.get('code');
  const accessToken = fragment.get('access_token');

  type ReturnResult =
    | { kind: 'signed-in' | 'recovery'; session: Session }
    | { kind: 'confirmed' | 'retry-sign-in' | 'failed' };

  const result = async (): Promise<ReturnResult> => {
    if (!supabase) return { kind: 'failed' };
    if (failed) {
      return { kind: email && errorCode === 'flow_state_not_found' ? 'retry-sign-in' : 'failed' };
    }
    if (email && tokenHash) {
      const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: recovery ? 'recovery' : 'email' });
      if (error || (recovery && !data.session)) return { kind: 'failed' };
      return data.session ? { kind: recovery ? 'recovery' : 'signed-in', session: data.session } : { kind: 'confirmed' };
    }
    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error && data.session) {
        const isRecovery = email && 'redirectType' in data && data.redirectType === 'recovery';
        return { kind: isRecovery ? 'recovery' : 'signed-in', session: data.session };
      }
      return { kind: email ? 'retry-sign-in' : 'failed' };
    }
    if (email && accessToken && fragment.get('type') === 'signup') {
      // A standard hosted email can return a token fragment instead of a PKCE code.
      // Verify the confirmation without replacing the browser's sign-in session.
      const { data, error } = await supabase.auth.getUser(accessToken);
      return { kind: !error && data.user?.email_confirmed_at ? 'confirmed' : 'failed' };
    }
    return { kind: 'failed' };
  };

  // One exchange per page load, including repeated React StrictMode effects.
  return { email, recovery, result: result().catch((): ReturnResult => ({ kind: 'failed' })) };
})();
