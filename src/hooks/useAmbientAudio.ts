import { useCallback, useEffect, useRef, useState } from 'react';
import type { BiomeId } from '../lib/biomes';
import { MusicEngine } from '../lib/music';
import { AmbienceEngine, playChime } from '../lib/ambience';
import type { AmbienceLayer } from '../lib/ambience';

type Engine = {
  context: AudioContext;
  /** Общая шина: мягкий лимитер, чтобы сумма музыки и природы никогда не «рвалась». */
  out: AudioNode;
  music: MusicEngine;
  ambience: AmbienceEngine;
};

export type AmbientAudio = {
  available: boolean;
  playing: boolean;
  play: (biome: BiomeId) => void;
  stop: () => void;
  setVolume: (volume: number) => void;
  /** Окружение: набор слоёв и громкость; пустой набор — тишина. Только после жеста пользователя. */
  setAmbience: (layers: AmbienceLayer[], volume: number) => void;
  /** Колокольчик завершения; не создаёт AudioContext сам по себе. */
  chime: (volume: number) => void;
};

/**
 * Звук приложения: генеративная музыка (`lib/music.ts`) и природа (`lib/ambience.ts`)
 * в одном AudioContext. Контекст создаётся только по действию пользователя.
 * Громкость музыки и природы независимы, mute управляется снаружи.
 */
export function useAmbientAudio(initialVolume: number): AmbientAudio {
  const engineRef = useRef<Engine | null>(null);
  const volumeRef = useRef(initialVolume);
  const playingRef = useRef(false);
  const [available, setAvailable] = useState(
    () => typeof window !== 'undefined' && typeof window.AudioContext === 'function',
  );
  const [playing, setPlaying] = useState(false);

  const ensureEngine = useCallback((biome: BiomeId = 'meadow'): Engine | null => {
    if (engineRef.current) return engineRef.current;
    if (typeof window === 'undefined' || typeof window.AudioContext !== 'function') {
      setAvailable(false);
      return null;
    }
    try {
      const context = new AudioContext({ latencyHint: 'playback' });
      const limiter = context.createDynamicsCompressor();
      limiter.threshold.value = -14;
      limiter.knee.value = 12;
      limiter.ratio.value = 4;
      limiter.attack.value = 0.01;
      limiter.release.value = 0.4;
      limiter.connect(context.destination);
      const engine: Engine = {
        context,
        out: limiter,
        music: new MusicEngine(context, limiter, biome),
        ambience: new AmbienceEngine(context, limiter),
      };
      engineRef.current = engine;
      return engine;
    } catch {
      setAvailable(false);
      return null;
    }
  }, []);

  const withRunning = useCallback((engine: Engine, fn: () => void) => {
    if (engine.context.state === 'suspended') {
      engine.context
        .resume()
        .then(fn)
        .catch(() => setAvailable(false));
    } else {
      fn();
    }
  }, []);

  const play = useCallback(
    (biome: BiomeId) => {
      const engine = ensureEngine(biome);
      if (!engine) return;
      withRunning(engine, () => {
        engine.music.start(biome, volumeRef.current);
        playingRef.current = true;
        setPlaying(true);
      });
    },
    [ensureEngine, withRunning],
  );

  const stop = useCallback(() => {
    playingRef.current = false;
    setPlaying(false);
    engineRef.current?.music.stop();
  }, []);

  const setVolume = useCallback((volume: number) => {
    const next = Math.min(1, Math.max(0, volume));
    volumeRef.current = next;
    engineRef.current?.music.setVolume(next);
  }, []);

  const setAmbience = useCallback(
    (layers: AmbienceLayer[], volume: number) => {
      const existing = engineRef.current;
      if (!existing && layers.length === 0) return;
      const engine = existing ?? ensureEngine();
      if (!engine) return;
      if (layers.length > 0) withRunning(engine, () => engine.ambience.setLayers(layers, volume));
      else engine.ambience.setLayers(layers, volume);
    },
    [ensureEngine, withRunning],
  );

  const chime = useCallback((volume: number) => {
    const engine = engineRef.current;
    if (!engine || engine.context.state !== 'running') return;
    playChime(engine.context, volume, engine.out);
  }, []);

  useEffect(() => {
    return () => {
      const engine = engineRef.current;
      engineRef.current = null;
      playingRef.current = false;
      if (!engine) return;
      engine.music.dispose();
      engine.ambience.dispose();
      void engine.context.close().catch(() => undefined);
    };
  }, []);

  return { available, playing, play, stop, setVolume, setAmbience, chime };
}
