import { Link } from 'react-router-dom';
import { ArrowRight, Pause, Play, RotateCcw, Volume2, VolumeX, CloudRain, CloudSnow, Sun, Sunrise, Sunset, Moon } from 'lucide-react';
import { useAppState } from '@/AppStateContext';
import { formatClock } from '@/lib/format';
import { TIME_LABELS } from '@/lib/daycycle';
import { PIECE_LABELS, nextPiece, visiblePieceIds } from '@/lib/world';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DurationControl } from './DurationControl';
import { BiomeSwitcher } from './BiomeSwitcher';
import { cn } from '@/lib/utils';

const STATUS_TEXT = {
  idle: { title: 'Готов начать', hint: 'Выбери длительность и нажми «Старт» — остров начнёт строиться.' },
  running: { title: 'Время работать', hint: 'Пока ты занят делом, на острове идёт стройка.' },
  paused: { title: 'Пауза', hint: 'Стройка ждёт. Остаток времени сохранён.' },
  completed: { title: 'Отличная работа!', hint: 'Сессия завершена. Твой мир стал немного больше.' },
} as const;

const TIME_ICON = { morning: Sunrise, day: Sun, sunset: Sunset, night: Moon };

export function TimerPanel() {
  const { status, remainingMs, durationMinutes, progress, percent, muted, audioAvailable, timeOfDay, weather, restored, storageUnavailable, actions } =
    useAppState();
  const active = status === 'running' || status === 'paused';
  const sessionPct = Math.round(progress * 100);
  const text = STATUS_TEXT[status];
  const action = status === 'running' ? actions.pause : status === 'paused' ? actions.resume : actions.start;
  const actionLabel = { idle: 'Старт', running: 'Пауза', paused: 'Продолжить', completed: 'Начать заново' }[status];
  const ActionIcon = status === 'running' ? Pause : Play;
  const next = nextPiece(progress);
  const built = visiblePieceIds(progress).length;
  const TimeIcon = TIME_ICON[timeOfDay];
  const WeatherIcon = weather === 'rain' ? CloudRain : weather === 'snow' ? CloudSnow : null;

  return (
    <section aria-labelledby="timer-status" className={cn('panel timer-panel w-full rounded-lg p-4 sm:p-6', status === 'running' && 'is-running')}>
      <div className="flex items-center justify-between gap-1.5 sm:gap-3">
        <span
          id="timer-status" role="status"
          className={cn(
            'pixel-label shrink-0 whitespace-nowrap rounded-[4px] px-2 py-1',
            status === 'running' && 'bg-primary/15 text-primary',
            status === 'paused' && 'bg-accent/15 text-accent',
            status === 'completed' && 'bg-accent/20 text-accent',
            status === 'idle' && 'bg-secondary text-muted-foreground',
          )}
        >
          {text.title}
        </span>
        <span className="flex min-w-0 items-center gap-0.5 text-xs sm:gap-1 text-muted-foreground">
          <span className="flex shrink-0 items-center gap-1.5" title={`${TIME_LABELS[timeOfDay]}${weather !== "clear" ? (weather === "rain" ? ", дождь" : ", снег") : ""}`}>
            <TimeIcon className="size-3.5" />
            <span className="sr-only">{TIME_LABELS[timeOfDay]}</span>
            {WeatherIcon && <WeatherIcon className="size-3.5" />}
          </span>
          <span aria-hidden className="hidden opacity-50 sm:inline">·</span>
          <BiomeSwitcher />
        </span>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3 sm:mt-4">
        <p className="timer-digits text-[clamp(64px,17vw,104px)] text-foreground">
          {(() => {
            const [mm, ss] = formatClock(remainingMs).split(':');
            return (
              <>
                {mm}
                <span className="timer-colon">:</span>
                {ss}
              </>
            );
          })()}
        </p>
        <p className="mb-2 hidden text-right text-xs text-muted-foreground sm:block">
          из {durationMinutes} мин
        </p>
      </div>

      <div className="mt-3 grid gap-2 sm:mt-4">
        <Progress value={status === 'idle' ? 0 : sessionPct} aria-label="Прогресс сессии" indicatorClassName={status === 'completed' ? 'bg-accent' : undefined} />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Остров <span className="font-semibold text-foreground tabular-nums">{percent}%</span> · {built}/14
          </span>
          <span className="truncate pl-2 text-right">
            {status === 'completed' || !next ? 'Все постройки готовы' : `Дальше: ${PIECE_LABELS[next]}`}
          </span>
        </div>
      </div>

      <div className="mt-3 sm:mt-5">
        <DurationControl value={durationMinutes} disabled={active} onChange={actions.changeDuration} />
      </div>

      <div className="mt-3 flex items-center gap-2 sm:mt-4">
        <Button data-timer-action size="lg" className="flex-1" variant={status === 'running' ? 'secondary' : 'default'} onClick={action}>
          <ActionIcon /> {actionLabel}
        </Button>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="outline" className="size-12" onClick={actions.requestReset} disabled={!active} aria-label="Сбросить сессию">
              <RotateCcw />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Сброс (с подтверждением)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="outline"
              className={cn('size-12', !muted && 'text-primary')}
              onClick={actions.toggleMute}
              aria-pressed={!muted}
              aria-label={muted ? 'Включить звук' : 'Выключить звук'}
              disabled={!audioAvailable}
            >
              {muted ? <VolumeX /> : <Volume2 />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{!audioAvailable ? 'Звук недоступен в этом браузере' : muted ? 'Звук выключен' : 'Музыка и звуки мира включены'}</TooltipContent>
        </Tooltip>
      </div>
      <div className="mt-3 grid gap-1">
        <p className={cn('timer-hint text-sm text-muted-foreground', status === 'completed' && 'text-accent')}>{text.hint}</p>
        {status === 'completed' && (
          <Button variant="link" asChild className="h-9 w-fit px-0">
            <Link to="/progress#session-journal">Посмотреть в журнале <ArrowRight /></Link>
          </Button>
        )}
        {restored && status === 'idle' && <p className="text-xs text-muted-foreground">Остров восстановлен с прошлого раза. Новая сессия начнёт стройку заново.</p>}
        {storageUnavailable && <p className="text-xs text-destructive">Браузер не даёт сохранять данные — прогресс живёт только до закрытия вкладки.</p>}
      </div>
    </section>
  );
}
