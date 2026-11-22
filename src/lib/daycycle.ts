import type { TimerStatus } from '@/hooks/useTimer';
import type { TimeOfDayMode, Weather } from './storage';

export type TimeOfDay = 'morning' | 'day' | 'sunset' | 'night';

export const TIME_LABELS: Record<TimeOfDay, string> = {
  morning: 'Утро',
  day: 'День',
  sunset: 'Закат',
  night: 'Ночь',
};

export const WEATHER_LABELS: Record<Weather, string> = {
  clear: 'Ясно',
  rain: 'Дождь',
  snow: 'Снег',
};

/** Множители цвета для блоков и сила свечения окон/фонарей. */
export const LIGHT_BY_TIME: Record<TimeOfDay, { rgb: [number, number, number]; glow: number }> = {
  morning: { rgb: [1.03, 0.95, 0.9], glow: 0.15 },
  day: { rgb: [1, 1, 1], glow: 0 },
  sunset: { rgb: [1.06, 0.8, 0.66], glow: 0.55 },
  night: { rgb: [0.46, 0.52, 0.74], glow: 0.9 },
};

export const WEATHER_LIGHT: Record<Weather, [number, number, number]> = {
  clear: [1, 1, 1],
  rain: [0.8, 0.84, 0.9],
  snow: [0.95, 0.97, 1.03],
};

/**
 * Автоматический режим связан с реальным прогрессом сессии:
 * утро → день → закат → ночь; завершённая сессия встречает уютной ночью с огнями в окнах.
 */
export function resolveTimeOfDay(mode: TimeOfDayMode, progress: number, status: TimerStatus): TimeOfDay {
  if (mode !== 'auto') return mode;
  if (status === 'completed' || progress >= 1) return 'night';
  if (progress < 0.25) return 'morning';
  if (progress < 0.6) return 'day';
  if (progress < 0.85) return 'sunset';
  return 'night';
}
