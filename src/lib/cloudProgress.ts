import { unlockedBiomes } from './biomes';
import type { BiomeId } from './biomes';
import {
  DEFAULT_AUDIO, DEFAULT_STATE, DEFAULT_WORLD, decodeAudio, decodeState, decodeWorld,
} from './storage';
import type {
  Atlas, AudioSettings, IslandSnapshot, PersistedState, SessionEntry, SessionLog, Settings, WorldSettings,
} from './storage';
import { supabase } from './supabase';

export type CloudPatch = {
  settings?: Partial<Settings>;
  audio?: Partial<AudioSettings>;
  world?: Partial<WorldSettings>;
  island?: IslandSnapshot;
  biome?: BiomeId;
};

type SnapshotResponse = {
  state: { settings: unknown; audio: unknown; world: unknown; island: unknown; biome: BiomeId; generation: number } | null;
  items: SessionEntry[];
  stats: SessionLog['stats'];
  byBiome: Atlas['byBiome'];
};

export type CloudSnapshot = {
  state: PersistedState;
  audio: AudioSettings;
  world: WorldSettings;
  biome: BiomeId;
  generation: number;
  log: SessionLog;
  atlas: Atlas;
};

function fromSnapshot({ state, items, stats, byBiome }: SnapshotResponse): CloudSnapshot {
  const seen = unlockedBiomes(stats.completed);
  return {
    state: state ? decodeState(state) : DEFAULT_STATE,
    audio: state ? decodeAudio(state.audio) : DEFAULT_AUDIO,
    world: state ? decodeWorld(state.world) : DEFAULT_WORLD,
    biome: state && seen.includes(state.biome) ? state.biome : 'meadow',
    generation: state?.generation ?? 0,
    log: { version: 1, items, stats },
    atlas: { byBiome, seen },
  };
}

async function rpc(name: string, args: Record<string, unknown>): Promise<unknown> {
  if (!supabase) throw new Error('Supabase is unavailable');
  const { data, error } = await supabase.rpc(name, args).abortSignal(AbortSignal.timeout(15_000));
  if (error) throw error;
  return data;
}

export async function loadCloudProgress(userId: string): Promise<CloudSnapshot> {
  const data = await rpc('pomodoro_snapshot', { p_user: userId });
  if (!data) throw new Error('Progress unavailable');
  return fromSnapshot(data as SnapshotResponse);
}

export async function saveCloudPatch(userId: string, patch: CloudPatch): Promise<void> {
  await rpc('pomodoro_write', { p_user: userId, p_patch: patch });
}

export async function commitCloudProgress(userId: string, generation: number, session?: SessionEntry) {
  const data = await rpc('pomodoro_write', {
    p_user: userId,
    p_generation: generation,
    ...(session ? { p_session: session } : { p_reset: true }),
  });
  if (!data) throw new Error('Progress unavailable');
  return fromSnapshot(data as SnapshotResponse);
}
