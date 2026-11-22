import type { BiomeId } from './biomes';
import { DEFAULT_BIOME, isBiomeId } from './biomes';

export const STORAGE_KEY = 'pomodoro.v1';
export const BIOME_KEY = 'pomodoro.biome.v1';
export const AUDIO_KEY = 'pomodoro.audio.v1';
export const SESSIONS_KEY = 'pomodoro.sessions.v1';
export const WORLD_KEY = 'pomodoro.world.v1';

/**
 * Данные каждого mock-аккаунта хранятся под своими ключами: `<ключ>@<userId>`.
 * Формат значений не меняется. Ключи без суффикса (данные до появления входа)
 * один раз переносятся в первый аккаунт, который вошёл на этом устройстве.
 */
const LEGACY_CLAIM_KEY = 'pomodoro.legacy-owner.v1';
const SCOPED_BASE_KEYS = [STORAGE_KEY, BIOME_KEY, AUDIO_KEY, SESSIONS_KEY, WORLD_KEY, 'pomodoro.atlas.v1'];
let scope: string | null = null;

export function scopedKey(base: string): string {
  return scope ? `${base}@${scope}` : base;
}

export function setStorageScope(userId: string | null, claimLegacy = true): void {
  scope = userId;
  if (!userId || !claimLegacy) return;
  try {
    const ls = window.localStorage;
    const owner = ls.getItem(LEGACY_CLAIM_KEY);
    if (owner !== null) return;
    const hasLegacy = SCOPED_BASE_KEYS.some((key) => ls.getItem(key) !== null);
    if (hasLegacy) {
      for (const key of SCOPED_BASE_KEYS) {
        const legacy = ls.getItem(key);
        if (legacy !== null && ls.getItem(`${key}@${userId}`) === null) {
          ls.setItem(`${key}@${userId}`, legacy);
        }
      }
    }
    ls.setItem(LEGACY_CLAIM_KEY, JSON.stringify({ version: 1, userId }));
  } catch {
    // хранилище недоступно — приложение работает в памяти
  }
}

export const MIN_DURATION_MINUTES = 1;
export const MAX_DURATION_MINUTES = 180;
export const DEFAULT_DURATION_MINUTES = 25;

export type Settings = {
  durationMinutes: number;
  muted: boolean;
};

export type IslandSnapshot = {
  progress: number;
  completedAt: string | null;
};

export type PersistedState = {
  version: 1;
  settings: Settings;
  island: IslandSnapshot;
};

export const DEFAULT_STATE: PersistedState = {
  version: 1,
  settings: {
    durationMinutes: DEFAULT_DURATION_MINUTES,
    muted: false,
  },
  island: {
    progress: 0,
    completedAt: null,
  },
};

export type AudioSettings = {
  volume: number;
  musicOnStart: boolean;
};

export const DEFAULT_AUDIO: AudioSettings = {
  volume: 0.7,
  musicOnStart: true,
};

export type SessionStatus = 'completed' | 'aborted';

export type SessionEntry = {
  id: string;
  startedAt: string;
  endedAt: string;
  durationMinutes: number;
  elapsedMs: number;
  biome: BiomeId;
  status: SessionStatus;
};

export type SessionStats = {
  completed: number;
  totalFocusMs: number;
};

export type SessionLog = {
  version: 1;
  stats: SessionStats;
  items: SessionEntry[];
};

export const DEFAULT_SESSIONS: SessionLog = {
  version: 1,
  stats: { completed: 0, totalFocusMs: 0 },
  items: [],
};

export const MAX_SESSIONS_KEPT = 20;

export function clampDurationMinutes(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_DURATION_MINUTES;
  return Math.min(MAX_DURATION_MINUTES, Math.max(MIN_DURATION_MINUTES, Math.round(value)));
}

export function clampProgress(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const bounded = Math.min(1, Math.max(0, value));
  return Math.round(bounded * 100) / 100;
}

export function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_AUDIO.volume;
  const bounded = Math.min(1, Math.max(0, value));
  return Math.round(bounded * 100) / 100;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(scopedKey(key));
  } catch {
    return null;
  }
}

function writeRaw(key: string, value: unknown): boolean {
  try {
    window.localStorage.setItem(scopedKey(key), JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function readJson(key: string): unknown {
  const raw = readRaw(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function readSettings(raw: unknown): Settings {
  const settings = isRecord(raw) ? raw : {};
  const duration =
    typeof settings.durationMinutes === 'number'
      ? clampDurationMinutes(settings.durationMinutes)
      : DEFAULT_DURATION_MINUTES;
  const muted = typeof settings.muted === 'boolean' ? settings.muted : false;
  return { durationMinutes: duration, muted };
}

function readIsland(raw: unknown): IslandSnapshot {
  const island = isRecord(raw) ? raw : {};
  const progress = typeof island.progress === 'number' ? clampProgress(island.progress) : 0;
  const completedAt = typeof island.completedAt === 'string' ? island.completedAt : null;
  return { progress, completedAt };
}

export type LoadResult = {
  state: PersistedState;
  storageUnavailable: boolean;
};

export function decodeState(raw: unknown): PersistedState {
  if (!isRecord(raw)) return DEFAULT_STATE;
  return { version: 1, settings: readSettings(raw.settings), island: readIsland(raw.island) };
}

export function loadState(): LoadResult {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(scopedKey(STORAGE_KEY));
  } catch {
    return { state: DEFAULT_STATE, storageUnavailable: true };
  }

  if (raw === null) {
    return { state: DEFAULT_STATE, storageUnavailable: false };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { state: DEFAULT_STATE, storageUnavailable: false };
  }

  return { state: decodeState(parsed), storageUnavailable: false };
}

export function saveState(state: PersistedState): boolean {
  return writeRaw(STORAGE_KEY, state);
}

export function loadBiome(): BiomeId {
  const parsed = readJson(BIOME_KEY);
  if (!isRecord(parsed)) return DEFAULT_BIOME;
  return isBiomeId(parsed.biome) ? parsed.biome : DEFAULT_BIOME;
}

export function saveBiome(biome: BiomeId): boolean {
  return writeRaw(BIOME_KEY, { version: 1, biome });
}

export function loadAudio(): AudioSettings {
  return decodeAudio(readJson(AUDIO_KEY));
}

export function decodeAudio(parsed: unknown): AudioSettings {
  if (!isRecord(parsed)) return DEFAULT_AUDIO;
  const volume = typeof parsed.volume === 'number' ? clampVolume(parsed.volume) : DEFAULT_AUDIO.volume;
  const musicOnStart =
    typeof parsed.musicOnStart === 'boolean' ? parsed.musicOnStart : DEFAULT_AUDIO.musicOnStart;
  return { volume, musicOnStart };
}

export function saveAudio(audio: AudioSettings): boolean {
  return writeRaw(AUDIO_KEY, { version: 1, ...audio });
}

function readSessionEntry(raw: unknown): SessionEntry | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.startedAt !== 'string' || typeof raw.endedAt !== 'string') return null;
  if (typeof raw.durationMinutes !== 'number' || typeof raw.elapsedMs !== 'number') return null;
  const status = raw.status === 'completed' || raw.status === 'aborted' ? raw.status : null;
  if (!status) return null;
  if (!isBiomeId(raw.biome)) return null;
  return {
    id: typeof raw.id === 'string' ? raw.id : `${raw.startedAt}-${raw.endedAt}`,
    startedAt: raw.startedAt,
    endedAt: raw.endedAt,
    durationMinutes: clampDurationMinutes(raw.durationMinutes),
    elapsedMs: Math.max(0, Math.round(raw.elapsedMs)),
    biome: raw.biome,
    status,
  };
}

export function loadSessions(): SessionLog {
  const parsed = readJson(SESSIONS_KEY);
  if (!isRecord(parsed)) return DEFAULT_SESSIONS;

  const statsRaw = isRecord(parsed.stats) ? parsed.stats : {};
  const stats: SessionStats = {
    completed:
      typeof statsRaw.completed === 'number' && statsRaw.completed >= 0
        ? Math.round(statsRaw.completed)
        : 0,
    totalFocusMs:
      typeof statsRaw.totalFocusMs === 'number' && statsRaw.totalFocusMs >= 0
        ? Math.round(statsRaw.totalFocusMs)
        : 0,
  };

  const items = Array.isArray(parsed.items)
    ? parsed.items
        .map(readSessionEntry)
        .filter((item): item is SessionEntry => item !== null)
        .slice(0, MAX_SESSIONS_KEPT)
    : [];

  return { version: 1, stats, items };
}

export function saveSessions(log: SessionLog): boolean {
  return writeRaw(SESSIONS_KEY, {
    version: 1,
    stats: log.stats,
    items: log.items.slice(0, MAX_SESSIONS_KEPT),
  });
}

// ---------------------------------------------------------------------------
// Мир: время суток, погода, эффекты, окружение (редакция 3, ключ pomodoro.world.v1)

export type TimeOfDayMode = 'auto' | 'morning' | 'day' | 'sunset' | 'night';
export type Weather = 'clear' | 'rain' | 'snow';
export type MotionLevel = 'full' | 'calm' | 'off';

export type WorldSettings = {
  timeOfDay: TimeOfDayMode;
  weather: Weather;
  effects: boolean;
  motion: MotionLevel;
  ambienceOn: boolean;
  ambienceVolume: number;
  chime: boolean;
};

export const DEFAULT_WORLD: WorldSettings = {
  timeOfDay: 'auto',
  weather: 'clear',
  effects: true,
  motion: 'full',
  ambienceOn: true,
  ambienceVolume: 0.5,
  chime: true,
};

const TIME_MODES: TimeOfDayMode[] = ['auto', 'morning', 'day', 'sunset', 'night'];
const WEATHERS: Weather[] = ['clear', 'rain', 'snow'];
const MOTIONS: MotionLevel[] = ['full', 'calm', 'off'];

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

export function loadWorld(): WorldSettings {
  return decodeWorld(readJson(WORLD_KEY));
}

export function decodeWorld(parsed: unknown): WorldSettings {
  if (!isRecord(parsed)) return DEFAULT_WORLD;
  return {
    timeOfDay: pick(parsed.timeOfDay, TIME_MODES, DEFAULT_WORLD.timeOfDay),
    weather: pick(parsed.weather, WEATHERS, DEFAULT_WORLD.weather),
    effects: typeof parsed.effects === 'boolean' ? parsed.effects : DEFAULT_WORLD.effects,
    motion: pick(parsed.motion, MOTIONS, DEFAULT_WORLD.motion),
    ambienceOn: typeof parsed.ambienceOn === 'boolean' ? parsed.ambienceOn : DEFAULT_WORLD.ambienceOn,
    ambienceVolume:
      typeof parsed.ambienceVolume === 'number'
        ? clampVolume(parsed.ambienceVolume)
        : DEFAULT_WORLD.ambienceVolume,
    chime: typeof parsed.chime === 'boolean' ? parsed.chime : DEFAULT_WORLD.chime,
  };
}

export function saveWorld(world: WorldSettings): boolean {
  return writeRaw(WORLD_KEY, { version: 1, ...world });
}

// ---------------------------------------------------------------------------
// Атлас биомов (редакция 4, ключ pomodoro.atlas.v1): сколько сессий завершено
// в каждом биоме и какие открытия пользователь уже видел.

export const ATLAS_KEY = 'pomodoro.atlas.v1';

export type Atlas = {
  /** Завершённые сессии по биомам — от них зависит стадия развития места. */
  byBiome: Partial<Record<BiomeId, number>>;
  /** Биомы, об открытии которых уже показали сообщение. */
  seen: BiomeId[];
};

/**
 * Если атласа ещё нет (данные прошлых версий), считаем сессии по журналу,
 * а уже доступные биомы помечаем как «виденные», чтобы не поздравлять задним числом.
 */
export function loadAtlas(fallbackLog: SessionLog, unlockedNow: BiomeId[]): Atlas {
  const parsed = readJson(ATLAS_KEY);
  if (isRecord(parsed) && isRecord(parsed.byBiome) && Array.isArray(parsed.seen)) {
    const byBiome: Atlas['byBiome'] = {};
    for (const [k, val] of Object.entries(parsed.byBiome)) {
      if (isBiomeId(k) && typeof val === 'number' && val >= 0) byBiome[k] = Math.round(val);
    }
    return { byBiome, seen: parsed.seen.filter(isBiomeId) };
  }
  const byBiome: Atlas['byBiome'] = {};
  for (const item of fallbackLog.items) {
    if (item.status === 'completed') byBiome[item.biome] = (byBiome[item.biome] ?? 0) + 1;
  }
  return { byBiome, seen: unlockedNow };
}

export function saveAtlas(atlas: Atlas): boolean {
  return writeRaw(ATLAS_KEY, { version: 1, ...atlas });
}
