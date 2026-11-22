import { supabase } from '../lib/supabase';
import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Check, Sprout } from 'lucide-react';
import { useAppState } from '@/AppStateContext';
import { PageShell, Section } from '@/components/PageShell';
import { biomeLabel, nextUnlock } from '@/lib/biomes';
import { BiomeGrid } from '@/components/BiomeGrid';
import { BiomeEmblem } from '@/components/BiomeEmblem';
import { PIECE_LABELS, PIECE_ORDER, visiblePieceIds } from '@/lib/world';
import type { SessionEntry } from '@/lib/storage';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const WEEKDAYS = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

function minutesOf(ms: number) {
  return Math.round(ms / 60000);
}

function formatFocus(ms: number) {
  const total = minutesOf(ms);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${h} ч ${m} мин` : `${m} мин`;
}

function lastSevenDays(items: SessionEntry[]) {
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    return { key: dayKey(d), label: WEEKDAYS[d.getDay()], minutes: 0, isToday: i === 6 };
  });
  for (const item of items) {
    if (item.status !== 'completed') continue;
    const day = days.find((d) => d.key === dayKey(new Date(item.endedAt)));
    if (day) day.minutes += minutesOf(item.elapsedMs);
  }
  return days;
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="stat px-4 py-4 sm:px-5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-extrabold tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function ProgressScreen() {
  const { stats, sessions, progress, percent, user } = useAppState();
  const days = lastSevenDays(sessions);
  const max = Math.max(5, ...days.map((d) => d.minutes));
  const todayCount = sessions.filter((s) => s.status === 'completed' && dayKey(new Date(s.endedAt)) === dayKey(new Date())).length;
  const built = new Set(visiblePieceIds(progress));
  const empty = sessions.length === 0 && stats.completed === 0;
  const next = nextUnlock(stats.completed);
  const { hash } = useLocation();
  useEffect(() => {
    if (hash !== '#session-journal') return;
    const target = document.getElementById('session-journal');
    target?.focus({ preventScroll: true });
    target?.scrollIntoView({ block: 'start', behavior: 'instant' });
  }, [hash, empty]);

  return (
    <PageShell title={`Мир ${user.name}`} lead={supabase ? "Журнал и статистика синхронизируются с аккаунтом." : "Статистика считается по сессиям в этом браузере."}>
      <div className="panel stat-strip grid grid-cols-2 overflow-hidden rounded-lg sm:grid-cols-4">
        <Stat label="Сессий завершено" value={String(stats.completed)} />
        <Stat label="Время фокуса" value={formatFocus(stats.totalFocusMs)} />
        <Stat label="Сегодня" value={String(todayCount)} sub="завершённых сессий" />
        <Stat label="Остров сейчас" value={`${percent}%`} sub={`${built.size} из ${PIECE_ORDER.length} построек`} />
      </div>

      {empty ? (
        <section id="session-journal" tabIndex={-1} aria-label="Журнал сессий" className="panel flex scroll-mt-5 flex-col items-center rounded-lg px-6 py-10 text-center focus-visible:ring-2 focus-visible:ring-ring">
          <span className="grid size-14 place-items-center rounded-md bg-primary/15 text-primary">
            <Sprout className="size-7" />
          </span>
          <h2 className="mt-4 text-lg font-bold">Пока здесь пусто</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">Заверши первую сессию — она появится в журнале, а на острове вырастут первые постройки.</p>
          <Button asChild className="mt-5">
            <Link to="/">К таймеру</Link>
          </Button>
        </section>
      ) : (
        <>
          <Section title="Последние 7 дней" description="Минуты завершённых сессий по дням (по последним 20 записям журнала).">
            <div className="flex h-24 items-end gap-2 sm:h-32" role="img" aria-label={days.map((d) => `${d.label}: ${d.minutes} мин`).join(', ')}>
              {days.map((d) => (
                <div key={d.key} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                  <span className="text-[11px] tabular-nums text-muted-foreground">{d.minutes || ''}</span>
                  <div
                    className={cn('w-full max-w-10 rounded-t-[3px] shadow-[inset_0_2px_0_rgb(255_255_255/0.2)]', d.minutes ? 'bg-primary' : 'bg-input/60')}
                    style={{ height: `${Math.max(4, (d.minutes / max) * 72)}%` }}
                  />
                  <span className={cn('text-xs', d.isToday ? 'font-bold text-foreground' : 'text-muted-foreground')}>{d.label}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section id="session-journal" title="Журнал сессий">
            <ul className="grid gap-2">
              {sessions.slice(0, 8).map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 rounded-md border bg-input/20 px-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="font-semibold tabular-nums">
                      {new Date(s.endedAt).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {minutesOf(s.elapsedMs)} из {s.durationMinutes} мин · {biomeLabel(s.biome)}
                    </p>
                  </div>
                  <Badge variant={s.status === 'completed' ? 'default' : 'outline'}>{s.status === 'completed' ? 'завершена' : 'прервана'}</Badge>
                </li>
              ))}
            </ul>
          </Section>
        </>
      )}

      <Section title="Атлас мест" description="Новые места открываются за завершённые сессии. Чем больше сессий в одном месте, тем оно уютнее.">
        {next ? (
          <div className="grid gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-muted-foreground">
                <BiomeEmblem biome={next.biome.id} size={20} locked />
                Дальше: <span className="font-semibold text-foreground">{next.biome.label}</span>
              </span>
              <span className="tabular-nums text-muted-foreground">
                {stats.completed} / {next.biome.unlockAt}
              </span>
            </div>
            <Progress value={(stats.completed / next.biome.unlockAt) * 100} aria-label="До открытия следующего места" />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Все места открыты. Возвращайся в любимые — они продолжают обживаться.</p>
        )}
        <BiomeGrid detailed />
      </Section>

      <Section title="Стройка текущего острова">
        <Progress value={percent} aria-label="Остров построен" />
        <ol className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {PIECE_ORDER.map((id, i) => (
            <li key={id} className={cn('flex items-center gap-2 text-sm', built.has(id) ? 'text-foreground' : 'text-muted-foreground/70')}>
              <span className={cn('grid size-5 place-items-center rounded-[3px] text-[10px] font-bold', built.has(id) ? 'bg-primary text-primary-foreground' : 'bg-input/60')}>
                {built.has(id) ? <Check className="size-3" /> : i + 1}
              </span>
              {PIECE_LABELS[id]}
            </li>
          ))}
        </ol>
      </Section>
    </PageShell>
  );
}
