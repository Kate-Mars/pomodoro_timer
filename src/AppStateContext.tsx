import { createContext, useContext } from 'react';
import type { TimerStatus } from './hooks/useTimer';
import type { BiomeId } from './lib/biomes';
import type { Atlas, SessionEntry, SessionStats, Weather, WorldSettings } from './lib/storage';
import type { AuthUser } from './lib/auth';
import type { TimeOfDay } from './lib/daycycle';
import type { AmbienceLayer } from './lib/ambience';

export type DialogKind = 'reset' | 'clearIsland' | 'resetProgress' | null;

export type AppActions = {
  start: () => void;
  pause: () => void;
  resume: () => void;
  requestReset: () => void;
  requestClearIsland: () => void;
  requestResetProgress: () => void;
  changeDuration: (minutes: number) => void;
  toggleMute: () => void;
  setVolume: (volume: number) => void;
  setMusicOnStart: (enabled: boolean) => void;
  setBiome: (biome: BiomeId) => void;
  updateWorld: (patch: Partial<WorldSettings>) => void;
  dismissDiscovery: () => void;
  logout: () => void;
};

export type AppState = {
  status: TimerStatus;
  remainingMs: number;
  durationMinutes: number;
  progress: number;
  percent: number;
  restored: boolean;
  muted: boolean;
  volume: number;
  musicOnStart: boolean;
  audioAvailable: boolean;
  storageUnavailable: boolean;
  biome: BiomeId;
  sessions: SessionEntry[];
  stats: SessionStats;
  world: WorldSettings;
  timeOfDay: TimeOfDay;
  ambienceLayers: AmbienceLayer[];
  celebrating: boolean;
  user: AuthUser;
  /** Сессии по биомам и уже показанные открытия. */
  atlas: Atlas;
  /** Открытые биомы. */
  unlocked: BiomeId[];
  /** Стадия развития текущего биома 0–3. */
  stage: number;
  /** Погода с учётом биома (снег бывает не везде). */
  weather: Weather;
  actions: AppActions;
};

export const AppStateContext = createContext<AppState | null>(null);

export function useAppState(): AppState {
  const context = useContext(AppStateContext);
  if (!context) throw new Error('AppStateContext не предоставлен');
  return context;
}
