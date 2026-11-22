import { useEffect, useState } from 'react';
import App from './App';
import { Button } from './components/ui/button';
import { loadCloudProgress, type CloudSnapshot } from './lib/cloudProgress';
import type { AuthUser } from './lib/auth';

export function CloudApp({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  const [snapshot, setSnapshot] = useState<CloudSnapshot>();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    void loadCloudProgress(user.id).then((data) => {
      if (active) setSnapshot(data);
    }).catch(() => {
      if (active) setFailed(true);
    });
    return () => { active = false; };
  }, [user.id, attempt]);

  if (snapshot) return <App user={user} onLogout={onLogout} cloudInitial={snapshot} />;
  if (!failed) return <p className="p-6" role="status">Загружаем прогресс…</p>;
  return (
    <section className="panel mx-auto my-6 grid max-w-md gap-3 p-6">
      <p role="alert">Не удалось загрузить прогресс. Проверьте подключение к Supabase и повторите попытку.</p>
      <Button onClick={() => { setFailed(false); setAttempt((value) => value + 1); }}>Повторить загрузку</Button>
      <Button variant="ghost" onClick={onLogout}>Выйти</Button>
    </section>
  );
}
