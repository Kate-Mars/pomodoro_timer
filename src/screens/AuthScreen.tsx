import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, LogIn, ShieldCheck, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { AuthError, login, register } from '@/lib/auth';
import type { AuthUser } from '@/lib/auth';
import { authMessage, emailRedirect, googleRedirect, supabase, toAuthUser } from '@/lib/supabase';
import { World } from '@/components/world/World';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const emailField = z.string().trim().min(1, 'Введите email').pipe(z.email('Email в формате name@example.com'));

const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Введите пароль'),
});

const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Имя — от 2 символов').max(32, 'Имя — до 32 символов'),
    email: emailField,
    password: z
      .string()
      .min(8, 'Пароль — минимум 8 символов')
      .regex(/[A-Za-zА-Яа-яЁё]/, 'Добавьте хотя бы одну букву')
      .regex(/\d/, 'Добавьте хотя бы одну цифру'),
    confirm: z.string().min(1, 'Повторите пароль'),
  })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Пароли не совпадают' });

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

function PasswordInput(props: React.ComponentProps<typeof Input>) {
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={shown ? 'text' : 'password'} className="pr-11" />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="absolute top-1 right-1"
        onClick={() => setShown((s) => !s)}
        aria-label={shown ? 'Скрыть пароль' : 'Показать пароль'}
      >
        {shown ? <EyeOff /> : <Eye />}
      </Button>
    </div>
  );
}

function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {message}
    </p>
  );
}

function LoginForm({ onDone, onUnconfirmed }: {
  onDone: (u: AuthUser) => void;
  onUnconfirmed: (email: string) => void;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' }, mode: 'onTouched' });
  const submitting = form.formState.isSubmitting;

  const onSubmit = async (values: LoginValues) => {
    setFormError(null);
    try {
      let user: AuthUser;
      if (supabase) {
        const { data, error } = await supabase.auth.signInWithPassword(values);
        if (error?.code === 'email_not_confirmed') {
          onUnconfirmed(values.email);
          return;
        }
        if (error) throw new AuthError(authMessage(error.code));
        user = toAuthUser(data.user);
      } else {
        user = await login(values);
      }
      toast.success(`С возвращением, ${user.name}!`);
      onDone(user);
    } catch (e) {
      setFormError(e instanceof AuthError ? e.message : 'Что-то пошло не так. Попробуйте ещё раз.');
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="grid gap-4">
        <FormError message={formError} />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" placeholder="you@example.com" disabled={submitting} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Пароль</FormLabel>
              <FormControl>
                <PasswordInput autoComplete="current-password" disabled={submitting} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? <Loader2 className="animate-spin" /> : <LogIn />}
          {submitting ? 'Входим…' : 'Войти'}
        </Button>
      </form>
    </Form>
  );
}

function RegisterForm({ onDone, onSent }: { onDone: (u: AuthUser) => void; onSent: (email: string) => void }) {
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', confirm: '' },
    mode: 'onTouched',
  });
  const submitting = form.formState.isSubmitting;

  const onSubmit = async (values: RegisterValues) => {
    setFormError(null);
    try {
      if (supabase) {
        const { email, name, password } = values;
        const { error } = await supabase.auth.signUp({
          email, password, options: { data: { name }, emailRedirectTo: emailRedirect() },
        });
        if (error) throw new AuthError(authMessage(error.code));
        onSent(email);
        return;
      }
      const user = await register(values);
      toast.success(`Остров для ${user.name} готов к стройке`);
      onDone(user);
    } catch (e) {
      if (e instanceof AuthError && e.field === 'email') form.setError('email', { message: e.message });
      else setFormError(e instanceof AuthError ? e.message : 'Что-то пошло не так. Попробуйте ещё раз.');
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="grid gap-4">
        <FormError message={formError} />
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Имя</FormLabel>
              <FormControl>
                <Input autoComplete="nickname" placeholder="Как подписать твой мир" disabled={submitting} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" placeholder="you@example.com" disabled={submitting} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Пароль</FormLabel>
              <FormControl>
                <PasswordInput autoComplete="new-password" disabled={submitting} {...field} />
              </FormControl>
              <FormDescription>Минимум 8 символов, буквы и цифры.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirm"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Повтор пароля</FormLabel>
              <FormControl>
                <PasswordInput autoComplete="new-password" disabled={submitting} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? <Loader2 className="animate-spin" /> : <UserPlus />}
          {submitting ? 'Создаём остров…' : 'Создать аккаунт'}
        </Button>
      </form>
    </Form>
  );
}

function EmailConfirmation({ email: initialEmail, invalid, onBack }: {
  email: string; invalid: boolean; onBack: () => void;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const resend = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || busy) return;
    setBusy(true);
    setError(null);
    setSent(false);
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup', email: email.trim(), options: { emailRedirectTo: emailRedirect() },
      });
      if (resendError) setError(authMessage(resendError.code));
      else setSent(true);
    } catch {
      setError(authMessage());
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={resend} className="mt-5 grid gap-3">
      <h2 className="text-lg font-bold">{invalid ? 'Ссылка недействительна' : 'Проверьте почту'}</h2>
      <p className="text-sm text-muted-foreground">
        {invalid ? 'Запросите новую ссылку для подтверждения адреса.' : 'Проверьте входящие и папку «Спам». Если адрес уже подтверждён, вернитесь ко входу.'}
      </p>
      <label htmlFor="confirmation-email" className="text-sm">Email</label>
      <Input id="confirmation-email" type="email" autoComplete="email" value={email}
        onChange={(event) => setEmail(event.target.value)} required disabled={busy} />
      <FormError message={error} />
      {sent && <p role="status" className="text-sm">Запрос принят. Проверьте входящие и папку «Спам».</p>}
      <Button type="submit" disabled={busy}>{busy ? 'Отправляем…' : 'Отправить письмо повторно'}</Button>
      <Button type="button" variant="ghost" onClick={onBack}>Ко входу или восстановлению пароля</Button>
    </form>
  );
}

function PasswordRecovery({ reset, onBack, onDone }: {
  reset: boolean; onBack: () => void; onDone: (user: AuthUser) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || busy) return;
    const fields = new FormData(event.currentTarget);
    const password = String(fields.get('password') ?? '');
    if (reset && password !== fields.get('confirm')) {
      setError('Пароли не совпадают.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (reset) {
        const { data, error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) setError(authMessage(updateError.code));
        else {
          toast.success('Пароль обновлён');
          onDone(toAuthUser(data.user));
        }
      } else {
        const email = String(fields.get('email') ?? '').trim();
        const { error: sendError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: emailRedirect() });
        if (sendError) setError(authMessage(sendError.code));
        else setSent(true);
      }
    } catch {
      setError(authMessage());
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="mt-5 grid gap-3" onSubmit={submit}>
      <h2 className="text-lg font-bold">{reset ? 'Новый пароль' : 'Восстановление пароля'}</h2>
      {reset ? (
        <>
          <label htmlFor="reset-password">Новый пароль</label>
          <PasswordInput id="reset-password" name="password" autoComplete="new-password" minLength={8} required disabled={busy} />
          <label htmlFor="reset-confirm">Повторите пароль</label>
          <PasswordInput id="reset-confirm" name="confirm" autoComplete="new-password" minLength={8} required disabled={busy} />
        </>
      ) : (
        <>
          <label htmlFor="reset-email">Email</label>
          <Input id="reset-email" name="email" type="email" autoComplete="email" required disabled={busy} />
        </>
      )}
      <FormError message={error} />
      {sent && <p role="status" className="text-sm">Если аккаунт существует, на его email придёт ссылка для сброса пароля.</p>}
      <Button type="submit" disabled={busy}>{reset ? 'Сохранить пароль' : sent ? 'Отправить ссылку повторно' : 'Отправить ссылку'}</Button>
      {!reset && <Button type="button" variant="ghost" onClick={onBack}>Ко входу</Button>}
    </form>
  );
}

export type AuthNotice = 'invalid-email' | 'confirmed-email' | 'retry-email' | 'google-cancelled' | 'reset-password' | 'invalid-recovery' | null;

export function AuthScreen({ onAuthenticated, notice }: {
  onAuthenticated: (user: AuthUser) => void;
  notice: AuthNotice;
}) {
  const [pendingEmail, setPendingEmail] = useState<string | null>(() => notice === 'invalid-email' ? '' : null);
  const [requestReset, setRequestReset] = useState(notice === 'invalid-recovery');
  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(
    notice === 'google-cancelled' ? 'Вход через Google не завершён. Попробуйте снова.' : null,
  );

  const startGoogle = async () => {
    if (!supabase || googleBusy) return;
    setGoogleBusy(true);
    setGoogleError(null);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google', options: { redirectTo: googleRedirect(), skipBrowserRedirect: true },
      });
      if (error || !data.url) throw new Error();
      window.location.assign(data.url);
    } catch {
      setGoogleError('Не удалось начать вход через Google. Попробуйте снова.');
      setGoogleBusy(false);
    }
  };
  useEffect(() => {
    document.documentElement.dataset.time = 'sunset';
    const resetGoogleButton = () => setGoogleBusy(false);
    window.addEventListener('pageshow', resetGoogleButton);
    return () => window.removeEventListener('pageshow', resetGoogleButton);
  }, []);
  return (
    <div className="relative min-h-dvh">
      <div className="world-host">
        <World biome="cherry" progress={0.62} time="sunset" weather="clear" effects motion="full" pose="resting" celebrating={false} layout="stage" />
      </div>
      <div className="relative z-10 flex min-h-dvh flex-col px-3 py-4 sm:px-6 lg:px-8">
        <Logo />
        <div className="flex flex-1 items-end justify-center py-6 lg:items-center lg:justify-start">
          <section className="panel w-full max-w-[420px] rounded-lg p-4 sm:p-6" aria-labelledby="auth-title">
            <h1 id="auth-title" className="text-2xl font-extrabold tracking-tight">
              Твой остров ждёт
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Работай по Помодоро — и смотри, как растёт твой маленький мир.</p>
            {notice === 'confirmed-email' && (
              <p role="status" className="mt-4 text-sm">Адрес подтверждён. Войдите с email и паролем.</p>
            )}
            {notice === 'retry-email' && (
              <p role="status" className="mt-4 text-sm">Не удалось автоматически войти по ссылке. Попробуйте войти с email и паролем.</p>
            )}
            {notice === 'invalid-recovery' && requestReset && (
              <p role="alert" className="mt-4 text-sm">Ссылка восстановления недействительна. Запросите новую.</p>
            )}
            {supabase && (requestReset || notice === 'reset-password') ? (
              <PasswordRecovery reset={notice === 'reset-password'} onBack={() => setRequestReset(false)}
                onDone={onAuthenticated} />
            ) : supabase && pendingEmail !== null ? (
              <EmailConfirmation email={pendingEmail} invalid={notice === 'invalid-email' && !pendingEmail}
                onBack={() => setPendingEmail(null)} />
            ) : (
            <>
              <Tabs defaultValue="login" className="mt-5">
                <TabsList className="w-full">
                  <TabsTrigger value="login">Вход</TabsTrigger>
                  <TabsTrigger value="register">Регистрация</TabsTrigger>
                </TabsList>
                <TabsContent value="login">
                  <LoginForm onDone={onAuthenticated} onUnconfirmed={setPendingEmail} />
                  {supabase && <Button type="button" variant="link" className="mt-1 px-0" onClick={() => setRequestReset(true)}>Забыли пароль?</Button>}
                </TabsContent>
                <TabsContent value="register">
                  <RegisterForm onDone={onAuthenticated} onSent={setPendingEmail} />
                </TabsContent>
              </Tabs>
              {supabase && (
                <div className="mt-4 grid gap-3 border-t border-border pt-4">
                  <FormError message={googleError} />
                  <Button variant="outline" disabled={googleBusy} onClick={() => void startGoogle()}>
                    {googleBusy ? 'Открываем Google…' : 'Продолжить с Google'}
                  </Button>
                </div>
              )}
            </>
            )}
            <p className="mt-5 flex gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="size-4 shrink-0 text-primary" />
              {supabase
                ? 'Настройки, остров и журнал сохраняются в вашем аккаунте.'
                : 'Локальный режим. Для подтверждения почты и Google-входа настройте Supabase по инструкции в README.'}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
