import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { AppHeader } from './components/AppHeader';
import { ConfirmDialog } from './components/ConfirmDialog';
import { World } from './components/world/World';
import { useAmbientAudio } from './hooks/useAmbientAudio';
import { usePersistedState } from './hooks/usePersistedState';
import { useSessionLog } from './hooks/useSessionLog';
import { useTimer } from './hooks/useTimer';
import { useCloudProgress } from './hooks/useCloudProgress';
import type { CloudSnapshot } from './lib/cloudProgress';
import { Button } from './components/ui/button';
import { AppStateContext } from './AppStateContext';
import type { AppActions, AppState, DialogKind } from './AppStateContext';
import { AboutScreen } from './screens/AboutScreen';
import { ProgressScreen } from './screens/ProgressScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { TimerScreen } from './screens/TimerScreen';
import { islandPercent } from './lib/world';
import type { CharacterPose } from './lib/world';
import type { BiomeId } from './lib/biomes';
import { biomeStage, effectiveWeather, isUnlocked, unlockedBiomes } from './lib/biomes';
import { soundscape } from './lib/soundscape';
import { DiscoveryCard } from './components/DiscoveryCard';
import {
  clampDurationMinutes,
  clampProgress,
  clampVolume,
  loadAudio,
  loadAtlas,
  loadBiome,
  loadSessions,
  loadWorld,
  saveAtlas,
  saveAudio,
  saveBiome,
  saveWorld,
} from './lib/storage';
import type { Atlas, AudioSettings, PersistedState, SessionEntry, WorldSettings } from './lib/storage';
import type { AuthUser } from './lib/auth';
import { resolveTimeOfDay } from './lib/daycycle';
import type { AmbienceLayer } from './lib/ambience';

const PERSIST_INTERVAL_MS = 5000;
const PERSIST_PROGRESS_STEP = 0.05;
const VOLUME_SAVE_DELAY_MS = 150;
const MIN_SESSION_MS = 1000;

type AppProps = {
  user: AuthUser;
  onLogout: () => void;
  cloudInitial?: CloudSnapshot;
};

export default function App({ user, onLogout, cloudInitial }: AppProps) {
  const cloud = useCloudProgress(user.id, cloudInitial);
  const { patch: persistCloud, record: recordCloud, reset: resetCloud } = cloud;
  const cloudEnabled = !!cloudInitial;
  const persistState = useCallback((next: PersistedState, previous: PersistedState) => {
    if (next.island !== previous.island) persistCloud({ island: next.island });
    if (next.settings.durationMinutes !== previous.settings.durationMinutes) {
      persistCloud({ settings: { durationMinutes: next.settings.durationMinutes } });
    }
    if (next.settings.muted !== previous.settings.muted) {
      persistCloud({ settings: { muted: next.settings.muted } });
    }
  }, [persistCloud]);
  const { state, storageUnavailable, update } = usePersistedState(
    cloudInitial?.state, cloudEnabled ? persistState : undefined,
  );
  const { durationMinutes, muted } = state.settings;
  const totalMs = durationMinutes * 60_000;

  const [progress, setProgress] = useState(state.island.progress);
  const [restored, setRestored] = useState(
    () => state.island.progress > 0 && state.island.progress < 1,
  );

  const [biome, setBiomeState] = useState<BiomeId>(() => cloudInitial?.biome ?? loadBiome());
  const [audioPrefs, setAudioPrefs] = useState<AudioSettings>(() => cloudInitial?.audio ?? loadAudio());
  const [dialog, setDialog] = useState<DialogKind>(null);
  const dialogTrigger = useRef<HTMLElement | null>(null);
  const [manualAudioOn, setManualAudioOn] = useState(false);
  const [world, setWorld] = useState<WorldSettings>(() => cloudInitial?.world ?? loadWorld());
  const [celebrating, setCelebrating] = useState(false);
  const location = useLocation();

  const lastSaveRef = useRef({ at: 0, progress: state.island.progress });
  const sessionIdRef = useRef<string | null>(null);
  const sessionStartedAtRef = useRef<string | null>(null);
  const sessionBiomeRef = useRef<BiomeId>(biome);

  const localLog = useSessionLog(cloudInitial?.log);
  const { record, clear } = localLog;
  const sessions = cloud.snapshot?.log.items ?? localLog.items;
  const stats = cloud.snapshot?.log.stats ?? localLog.stats;
  const [localAtlas, setAtlas] = useState<Atlas>(() => cloudInitial?.atlas ?? loadAtlas(loadSessions(), unlockedBiomes(stats.completed)));
  const atlas = cloud.snapshot?.atlas ?? localAtlas;
  const [discovery, setDiscovery] = useState<BiomeId | null>(null);
  const previousCloudCount = useRef(cloudInitial?.log.stats.completed ?? 0);
  useEffect(() => {
    if (!cloudEnabled) return;
    const oldCount = previousCloudCount.current;
    previousCloudCount.current = stats.completed;
    const previouslyUnlocked = unlockedBiomes(oldCount);
    const newPlace = unlockedBiomes(stats.completed).find((id) => !previouslyUnlocked.includes(id));
    if (!newPlace) return;
    const timerId = window.setTimeout(() => setDiscovery(newPlace), 2600);
    return () => window.clearTimeout(timerId);
  }, [cloudEnabled, stats.completed]);
  const completedRef = useRef(stats.completed);
  completedRef.current = stats.completed;
  const unlocked = useMemo(() => unlockedBiomes(stats.completed), [stats.completed]);
  const stage = biomeStage(atlas.byBiome[biome] ?? 0);

  const updateAtlas = useCallback((fn: (prev: Atlas) => Atlas) => {
    setAtlas((prev) => {
      const next = fn(prev);
      saveAtlas(next);
      return next;
    });
  }, []);
  const audio = useAmbientAudio(audioPrefs.volume);
  const { play, stop, setVolume: applyVolume, available: audioAvailable, setAmbience, chime } = audio;

  const percent = islandPercent(progress);

  const setBiome = useCallback((next: BiomeId) => {
    setBiomeState(next);
    if (cloudEnabled) persistCloud({ biome: next });
    else saveBiome(next);
  }, [cloudEnabled, persistCloud]);

  const setVolume = useCallback((value: number) => {
    const volume = clampVolume(value);
    setAudioPrefs((prev) => ({ ...prev, volume }));
    if (cloudEnabled) persistCloud({ audio: { volume } });
  }, [cloudEnabled, persistCloud]);

  const setMusicOnStart = useCallback((enabled: boolean) => {
    setAudioPrefs((prev) => ({ ...prev, musicOnStart: enabled }));
    if (cloudEnabled) persistCloud({ audio: { musicOnStart: enabled } });
  }, [cloudEnabled, persistCloud]);

  useEffect(() => {
    if (cloudEnabled) return;
    const timer = window.setTimeout(() => saveAudio(audioPrefs), VOLUME_SAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [audioPrefs, cloudEnabled]);

  useEffect(() => {
    document.documentElement.dataset.biome = biome;
  }, [biome]);

  const updateWorld = useCallback((patch: Partial<WorldSettings>) => {
    setWorld((prev) => {
      const next = { ...prev, ...patch };
      if (!cloudEnabled) saveWorld(next);
      return next;
    });
    if (cloudEnabled) persistCloud({ world: patch });
  }, [cloudEnabled, persistCloud]);

  useEffect(() => {
    document.documentElement.dataset.motion = world.motion;
  }, [world.motion]);

  // звук завершения читает актуальные настройки через ref, чтобы не пересоздавать handleComplete
  const chimeRef = useRef({ enabled: world.chime, muted, volume: audioPrefs.volume });
  chimeRef.current = { enabled: world.chime, muted, volume: audioPrefs.volume };
  // на экране таймера завершение видно в панели и над островом — toast нужен только на других страницах
  const pathRef = useRef(location.pathname);
  pathRef.current = location.pathname;

  useEffect(() => {
    applyVolume(audioPrefs.volume);
  }, [applyVolume, audioPrefs.volume]);

  const handleComplete = useCallback(() => {
    const finishedAt = new Date();
    setProgress(1);
    setCelebrating(true);
    if (chimeRef.current.enabled && !chimeRef.current.muted) chime(chimeRef.current.volume);
    if (pathRef.current !== '/') toast.success('Отличная работа!', { description: 'Твой мир стал немного больше.' });
    setDialog((prev) => (prev === 'reset' ? null : prev));
    const entry: SessionEntry = {
      id: sessionIdRef.current ?? crypto.randomUUID(),
      startedAt:
        sessionStartedAtRef.current ??
        new Date(finishedAt.getTime() - totalMs).toISOString(),
      endedAt: finishedAt.toISOString(),
      durationMinutes,
      elapsedMs: totalMs,
      biome: sessionBiomeRef.current,
      status: 'completed',
    };
    if (cloudEnabled) {
      recordCloud(entry);
      return;
    }
    record(entry);
    update((prev) => ({
      ...prev,
      island: { progress: 1, completedAt: finishedAt.toISOString() },
    }));
    // развитие места и открытие новых биомов
    const doneBiome = sessionBiomeRef.current;
    const nowCompleted = completedRef.current + 1;
    updateAtlas((prev) => {
      const fresh = unlockedBiomes(nowCompleted).filter((b) => !prev.seen.includes(b));
      if (fresh.length > 0) window.setTimeout(() => setDiscovery(fresh[0]), 2600);
      return {
        byBiome: { ...prev.byBiome, [doneBiome]: (prev.byBiome[doneBiome] ?? 0) + 1 },
        seen: [...prev.seen, ...fresh],
      };
    });
  }, [chime, cloudEnabled, durationMinutes, record, recordCloud, totalMs, update, updateAtlas]);

  const timer = useTimer(totalMs, handleComplete);
  const { status, remainingMs } = timer;

  useEffect(() => {
    if (status === 'running' || status === 'paused') {
      setProgress(clampProgress(1 - remainingMs / totalMs));
    }
  }, [status, remainingMs, totalMs]);

  useEffect(() => {
    const shouldPlay =
      status === 'running' && !muted && (audioPrefs.musicOnStart || manualAudioOn);
    if (shouldPlay) play(biome);
    else stop();
  }, [status, muted, biome, audioPrefs.musicOnStart, manualAudioOn, play, stop]);

  const timeOfDay = resolveTimeOfDay(world.timeOfDay, progress, status);
  useEffect(() => {
    document.documentElement.dataset.time = timeOfDay;
  }, [timeOfDay]);

  // Звуковой пейзаж: биом, время суток и погода; играет только во время сессии.
  const weather = effectiveWeather(biome, world.weather);
  const ambienceLayers = useMemo<AmbienceLayer[]>(() => soundscape(biome, timeOfDay, weather), [biome, timeOfDay, weather]);

  const ambienceKey = ambienceLayers.join(',');
  useEffect(() => {
    const active = status === 'running' && !muted && world.ambienceOn;
    setAmbience(active && ambienceKey ? (ambienceKey.split(',') as AmbienceLayer[]) : [], world.ambienceVolume);
  }, [ambienceKey, muted, setAmbience, status, world.ambienceOn, world.ambienceVolume]);

  useEffect(() => {
    if (status !== 'running') return;

    const now = Date.now();
    const last = lastSaveRef.current;
    const farEnoughInTime = now - last.at >= PERSIST_INTERVAL_MS;
    const farEnoughInProgress = Math.abs(progress - last.progress) >= PERSIST_PROGRESS_STEP;
    if (!farEnoughInTime && !farEnoughInProgress) return;

    lastSaveRef.current = { at: now, progress };
    update((prev) => ({ ...prev, island: { progress, completedAt: null } }));
  }, [progress, status, update]);

  const statusRef = useRef(status);
  statusRef.current = status;
  const progressRef = useRef(progress);
  progressRef.current = progress;

  useEffect(() => {
    const flush = () => {
      if (statusRef.current !== 'running' && statusRef.current !== 'paused') return;
      update((prev) => ({
        ...prev,
        island: { progress: progressRef.current, completedAt: null },
      }));
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flush();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('beforeunload', flush);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('beforeunload', flush);
      if (!cloudEnabled) flush();
    };
  }, [cloudEnabled, update]);

  const handleStart = () => {
    setCelebrating(false);
    setProgress(0);
    setRestored(false);
    setManualAudioOn(false);
    lastSaveRef.current = { at: Date.now(), progress: 0 };
    update((prev) => ({ ...prev, island: { progress: 0, completedAt: null } }));
    sessionIdRef.current = cloudEnabled ? crypto.randomUUID() : null;
    sessionStartedAtRef.current = new Date().toISOString();
    sessionBiomeRef.current = biome;
    timer.start();
    if (!muted && audioPrefs.musicOnStart) play(biome);
  };

  const handlePause = () => {
    timer.pause();
    update((prev) => ({
      ...prev,
      island: { progress: clampProgress(1 - remainingMs / totalMs), completedAt: null },
    }));
  };

  const applyClearIsland = (persist = true) => {
    setCelebrating(false);
    setProgress(0);
    setRestored(false);
    setManualAudioOn(false);
    lastSaveRef.current = { at: Date.now(), progress: 0 };
    timer.reset();
    if (persist) update((prev) => ({ ...prev, island: { progress: 0, completedAt: null } }));
  };

  const applyReset = () => {
    const elapsed = Math.max(0, totalMs - remainingMs);
    if ((status === 'running' || status === 'paused') && elapsed >= MIN_SESSION_MS) {
      const entry: SessionEntry = {
        id: sessionIdRef.current ?? crypto.randomUUID(),
        startedAt:
          sessionStartedAtRef.current ??
          new Date(Date.now() - elapsed).toISOString(),
        endedAt: new Date().toISOString(),
        durationMinutes,
        elapsedMs: elapsed,
        biome: sessionBiomeRef.current,
        status: 'aborted',
      };
      if (cloudEnabled) {
        recordCloud(entry);
        applyClearIsland(false);
        return;
      }
      record(entry);
    }
    applyClearIsland();
  };

  const applyResetProgress = () => {
    if (cloudEnabled) {
      applyClearIsland(false);
      resetCloud();
      setDiscovery(null);
      if (!isUnlocked(biome, 0)) setBiomeState('meadow');
      return;
    }
    applyClearIsland();
    clear();
    updateAtlas(() => ({ byBiome: {}, seen: unlockedBiomes(0) }));
    if (!isUnlocked(biome, 0)) setBiome('meadow');
  };

  const handleChangeDuration = (minutes: number) => {
    const clamped = clampDurationMinutes(minutes);
    update((prev) => ({
      ...prev,
      settings: { ...prev.settings, durationMinutes: clamped },
    }));
    timer.reset(clamped * 60_000);
  };

  const handleToggleMute = () => {
    if (muted) setManualAudioOn(true);
    update((prev) => ({
      ...prev,
      settings: { ...prev.settings, muted: !prev.settings.muted },
    }));
  };

  const confirmDialog = () => {
    const kind = dialog;
    setDialog(null);
    if (kind === 'reset') applyReset();
    else if (kind === 'clearIsland') applyClearIsland();
    else if (kind === 'resetProgress') applyResetProgress();
  };

  const openDialog = (kind: DialogKind) => {
    dialogTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setDialog(kind);
  };
  const restoreDialogFocus = () => {
    const trigger = dialogTrigger.current;
    const target = trigger?.isConnected && trigger !== document.body && !trigger.matches(':disabled')
      ? trigger
      : document.querySelector<HTMLElement>('[data-timer-action]');
    target?.focus({ preventScroll: true });
  };

  const actions: AppActions = {
    start: handleStart,
    pause: handlePause,
    resume: timer.resume,
    requestReset: () => openDialog('reset'),
    requestClearIsland: () => openDialog('clearIsland'),
    requestResetProgress: () => openDialog('resetProgress'),
    changeDuration: handleChangeDuration,
    toggleMute: handleToggleMute,
    setVolume,
    setMusicOnStart,
    setBiome,
    updateWorld,
    dismissDiscovery: () => setDiscovery(null),
    logout: () => {
      if (cloud.hasPending()) {
        toast.error('Дождитесь сохранения или повторите его перед выходом.');
        return;
      }
      stop();
      setAmbience([], 0);
      onLogout();
    },
  };

  const appState: AppState = {
    status,
    remainingMs,
    durationMinutes,
    progress,
    percent,
    restored,
    muted,
    volume: audioPrefs.volume,
    musicOnStart: audioPrefs.musicOnStart,
    audioAvailable,
    storageUnavailable,
    biome,
    sessions,
    stats,
    world,
    timeOfDay,
    ambienceLayers,
    celebrating,
    user,
    atlas,
    unlocked,
    stage,
    weather,
    actions,
  };

  const onTimerScreen = location.pathname === '/';
  const pose: CharacterPose =
    status === 'running' ? 'building' : status === 'completed' || celebrating ? 'cheering' : 'resting';

  return (
    <AppStateContext.Provider value={appState}>
      <div className="relative min-h-dvh" data-motion={world.motion}>
        <div className={onTimerScreen ? 'world-host world-host--stage' : 'world-host world-host--backdrop'}>
          <World
            biome={biome}
            progress={progress}
            time={timeOfDay}
            weather={world.weather}
            stage={stage}
            effects={world.effects}
            motion={world.motion}
            pose={pose}
            celebrating={celebrating}
            layout={onTimerScreen ? 'stage' : 'backdrop'}
          />
        </div>

        <AppHeader />

        <main className="relative z-10">
          {cloud.failed ? (
            <div role="alert" className="panel fixed inset-x-3 top-20 z-40 mx-auto flex max-w-xl flex-wrap items-center gap-3 p-3">
              <p>Не удалось сохранить изменения. Проверьте сеть и повторите.</p>
              <Button size="sm" onClick={() => void cloud.retry()}>Повторить сохранение</Button>
            </div>
          ) : cloud.saving ? (
            <p role="status" className="panel pointer-events-none fixed inset-x-3 top-20 z-40 mx-auto w-fit rounded px-3 py-1 text-sm">Сохраняем изменения…</p>
          ) : null}
          {cloud.discarded && (
            <p role="status" className="panel mx-auto my-2 max-w-xl p-3">
              Результат предыдущей сессии пропущен после сброса прогресса в другом окне.
            </p>
          )}
          <div key={location.pathname} className="page-enter">
          <Routes location={location}>
            <Route path="/" element={<TimerScreen />} />
            <Route path="/settings" element={<SettingsScreen />} />
            <Route path="/progress" element={<ProgressScreen />} />
            <Route path="/about" element={<AboutScreen />} />
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </div>
        </main>
        {discovery && status !== 'running' && (
          <DiscoveryCard
            biome={discovery}
            onGo={() => {
              setBiome(discovery);
              setDiscovery(null);
            }}
            onLater={() => setDiscovery(null)}
          />
        )}
      </div>

      <ConfirmDialog
        open={dialog === 'reset'}
        title="Сбросить сессию?"
        description="Таймер вернётся к началу, а постройки этой сессии исчезнут. Прерванная сессия попадёт в журнал."
        confirmLabel="Сбросить"
        onConfirm={confirmDialog}
        onCancel={() => setDialog(null)}
        onRestoreFocus={restoreDialogFocus}
      />
      <ConfirmDialog
        open={dialog === 'clearIsland'}
        title="Очистить остров?"
        description="Постройки исчезнут, журнал сессий останется. Таймер не запустится."
        confirmLabel="Очистить"
        onConfirm={confirmDialog}
        onCancel={() => setDialog(null)}
        onRestoreFocus={restoreDialogFocus}
      />
      <ConfirmDialog
        open={dialog === 'resetProgress'}
        title="Сбросить весь прогресс?"
        description="Остров и вся история сессий этого аккаунта будут удалены. Действие нельзя отменить."
        confirmLabel="Удалить всё"
        onConfirm={confirmDialog}
        onCancel={() => setDialog(null)}
        onRestoreFocus={restoreDialogFocus}
      />
    </AppStateContext.Provider>
  );
}
