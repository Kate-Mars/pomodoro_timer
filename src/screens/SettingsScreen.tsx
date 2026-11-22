import { supabase } from '../lib/supabase';
import { Eraser, Trash2 } from 'lucide-react';
import { useAppState } from '@/AppStateContext';
import { PageShell, Row, Section } from '@/components/PageShell';
import { DurationControl } from '@/components/DurationControl';
import { BiomeGrid } from '@/components/BiomeGrid';
import { biomeDef } from '@/lib/biomes';
import type { MotionLevel, TimeOfDayMode, Weather } from '@/lib/storage';
import { AMBIENCE_LABELS } from '@/lib/ambience';
import { MUSIC } from '@/lib/music';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';

const TIME_OPTIONS: Array<{ value: TimeOfDayMode; label: string }> = [
  { value: 'auto', label: 'Авто — по ходу сессии' },
  { value: 'morning', label: 'Утро' },
  { value: 'day', label: 'День' },
  { value: 'sunset', label: 'Закат' },
  { value: 'night', label: 'Ночь' },
];

const WEATHER_OPTIONS: Array<{ value: Weather; label: string }> = [
  { value: 'clear', label: 'Ясно' },
  { value: 'rain', label: 'Дождь' },
  { value: 'snow', label: 'Снег' },
];

const MOTION_OPTIONS: Array<{ value: MotionLevel; label: string }> = [
  { value: 'full', label: 'Полная' },
  { value: 'calm', label: 'Спокойная' },
  { value: 'off', label: 'Без анимации' },
];

export function SettingsScreen() {
  const { status, durationMinutes, biome, volume, muted, musicOnStart, audioAvailable, world, ambienceLayers, actions } = useAppState();
  const active = status === 'running' || status === 'paused';

  return (
    <PageShell title="Настройки" lead={supabase ? "Настройки сохраняются в аккаунте после подтверждения сервером." : "Настройки сохраняются в этом браузере отдельно для каждого аккаунта."}>
      <div className="panel divide-y divide-border/70 overflow-hidden rounded-lg">
      <Section bare title="Таймер">
        <Row label="Длительность сессии" hint="Пресеты или своё значение, от 1 до 180 минут.">
          <DurationControl value={durationMinutes} disabled={active} onChange={actions.changeDuration} />
        </Row>
      </Section>

      <Section bare title="Мир">
        <div className="grid gap-2">
          <span className="text-sm font-semibold">Место</span>
          <BiomeGrid />
          <p className="text-xs text-muted-foreground">
            Новые места открываются за завершённые сессии. Смена места не сбрасывает таймер: меняются природа, свет, музыка и звуки.
          </p>
        </div>

        <Row label="Время суток" hint="В авто-режиме утро сменяется ночью по мере прогресса сессии." htmlFor="tod">
          <Select value={world.timeOfDay} onValueChange={(v) => actions.updateWorld({ timeOfDay: v as TimeOfDayMode })}>
            <SelectTrigger id="tod" className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Row>

        <Row
          label="Погода"
          hint={biomeDef(biome).weathers.includes(world.weather) ? 'Погода переключается плавно.' : 'В этом месте такой погоды не бывает — сейчас ясно.'}
          htmlFor="weather"
        >
          <Select value={world.weather} onValueChange={(v) => actions.updateWorld({ weather: v as Weather })}>
            <SelectTrigger id="weather" className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WEATHER_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} disabled={!biomeDef(biome).weathers.includes(o.value)}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Row>

        <Row label="Визуальные эффекты" hint="Дождь и снег, дальние острова, облака, светлячки." htmlFor="fx">
          <Switch id="fx" checked={world.effects} onCheckedChange={(v) => actions.updateWorld({ effects: v })} />
        </Row>
      </Section>

      <Section bare title="Звук" description={!audioAvailable ? 'Web Audio недоступен в этом браузере — таймер работает без звука.' : undefined}>
        <Row label="Музыка вместе со стартом" hint={`Генеративная музыка места: ${MUSIC[biome].mood}. Мягко вступает после «Старт».`} htmlFor="music">
          <Switch id="music" checked={musicOnStart} onCheckedChange={actions.setMusicOnStart} disabled={!audioAvailable} />
        </Row>
        <Row label="Громкость музыки" hint={muted ? 'Сейчас звук выключен кнопкой на таймере.' : `${Math.round(volume * 100)}%`}>
          <Slider className="w-56" value={[Math.round(volume * 100)]} max={100} step={1} onValueChange={([v]) => actions.setVolume(v / 100)} aria-label="Громкость музыки" disabled={!audioAvailable} />
        </Row>
        <Row
          label="Звуки мира"
          hint={`Отдельно от музыки, во время сессии. Сейчас: ${ambienceLayers.map((l) => AMBIENCE_LABELS[l]).join(', ') || 'тишина'}.`}
          htmlFor="amb"
        >
          <Switch id="amb" checked={world.ambienceOn} onCheckedChange={(v) => actions.updateWorld({ ambienceOn: v })} disabled={!audioAvailable} />
        </Row>
        <Row label="Громкость звуков мира" hint={`${Math.round(world.ambienceVolume * 100)}%`}>
          <Slider
            className="w-56"
            value={[Math.round(world.ambienceVolume * 100)]}
            max={100}
            step={1}
            onValueChange={([v]) => actions.updateWorld({ ambienceVolume: v / 100 })}
            aria-label="Громкость звуков мира"
            disabled={!audioAvailable || !world.ambienceOn}
          />
        </Row>
        <Row label="Колокольчик в конце сессии" hint="Короткий мягкий сигнал, если звук не выключен." htmlFor="chime">
          <Switch id="chime" checked={world.chime} onCheckedChange={(v) => actions.updateWorld({ chime: v })} disabled={!audioAvailable} />
        </Row>
      </Section>

      <Section bare title="Внешний вид">
        <Row label="Интенсивность анимаций" hint="«Спокойная» убирает парение и частицы. Системная настройка «уменьшить движение» учитывается всегда." htmlFor="motion">
          <Select value={world.motion} onValueChange={(v) => actions.updateWorld({ motion: v as MotionLevel })}>
            <SelectTrigger id="motion" className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MOTION_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Row>
      </Section>

      </div>

      <Section title="Данные">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={actions.requestClearIsland}>
            <Eraser /> Очистить остров
          </Button>
          <Button variant="destructive" onClick={actions.requestResetProgress}>
            <Trash2 /> Сбросить весь прогресс
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Оба действия спрашивают подтверждение. Настройки и аккаунт при этом не удаляются.</p>
      </Section>
    </PageShell>
  );
}
