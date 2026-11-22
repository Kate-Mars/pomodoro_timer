import { memo, useEffect, useRef, useState } from 'react';
import type { BiomeId } from '@/lib/biomes';
import { biomeDef, effectiveWeather } from '@/lib/biomes';
import { PALETTES } from '@/lib/world';
import type { TimeOfDay } from '@/lib/daycycle';
import type { MotionLevel, Weather } from '@/lib/storage';
import type { CharacterPose } from '@/lib/world';
import { WorldScene } from './WorldScene';
import { cn } from '@/lib/utils';

type Props = {
  biome: BiomeId;
  progress: number;
  time: TimeOfDay;
  weather: Weather;
  effects: boolean;
  motion: MotionLevel;
  pose: CharacterPose;
  celebrating: boolean;
  /** Стадия развития текущего биома 0–3. */
  stage?: number;
  /** Положение острова: на главном экране он смещён, на фоне других экранов — по центру и мельче. */
  layout?: 'stage' | 'backdrop';
  className?: string;
};

const SUN_POS: Record<TimeOfDay, { left: string; top: string }> = {
  morning: { left: '14%', top: '34%' },
  day: { left: '72%', top: '9%' },
  sunset: { left: '84%', top: '46%' },
  night: { left: '78%', top: '10%' },
};

const STARS = Array.from({ length: 46 }, (_, i) => ({
  left: `${(i * 37.3) % 100}%`,
  top: `${(i * 23.7) % 100}%`,
  delay: `${(i % 9) * -0.7}s`,
  size: i % 5 === 0 ? 3 : 2,
}));

const CLOUDS = [
  { top: '8%', scale: 1.25, duration: 150, delay: -20, left: '8%' },
  { top: '20%', scale: 0.8, duration: 190, delay: -95, left: '58%' },
  { top: '31%', scale: 1, duration: 170, delay: -140, left: '30%' },
  { top: '62%', scale: 0.7, duration: 210, delay: -60, left: '78%' },
  { top: '76%', scale: 1.1, duration: 240, delay: -170, left: '18%' },
];

const CLOUD_COLORS: Record<TimeOfDay, [string, string]> = {
  morning: ['#fff3ea', '#e7cfc8'],
  day: ['#ffffff', '#dce9f2'],
  sunset: ['#ffd2b0', '#c98a8f'],
  night: ['#4a5a7a', '#36435f'],
};

function BlockCloud({ time, rain }: { time: TimeOfDay; rain: boolean }) {
  const [top, under] = rain ? ['#a9b3bf', '#8b96a3'] : CLOUD_COLORS[time];
  return (
    <svg width="168" height="52" viewBox="0 0 168 52" aria-hidden>
      <rect x="24" y="12" width="96" height="20" fill={top} />
      <rect x="0" y="24" width="168" height="16" fill={top} />
      <rect x="48" y="0" width="48" height="16" fill={top} />
      <rect x="0" y="40" width="140" height="12" fill={under} />
    </svg>
  );
}

/** Маленькие дальние острова — для глубины. Плоская воксельная «аппликация». */
function FarIsle({ time, flip, top }: { time: TimeOfDay; flip?: boolean; top: string }) {
  const dark = time === 'night';
  const grass = dark ? '#2a4a46' : time === 'sunset' ? '#8a7a55' : top;
  const side = dark ? '#1f2c3d' : time === 'sunset' ? '#7a5866' : '#7c8fa3';
  return (
    <svg width="120" height="80" viewBox="0 0 120 80" aria-hidden style={flip ? { transform: 'scaleX(-1)' } : undefined}>
      <polygon points="60,10 108,30 60,50 12,30" fill={grass} />
      <polygon points="12,30 60,50 60,62 24,46" fill={side} />
      <polygon points="60,50 108,30 96,44 60,62" fill={side} opacity="0.85" />
      <polygon points="36,48 60,62 84,52 60,78" fill={side} opacity="0.7" />
      <rect x="70" y="8" width="10" height="16" fill={dark ? '#1d3a33' : '#4d7f4b'} />
      <rect x="66" y="0" width="18" height="12" fill={dark ? '#24463d' : '#5b9452'} />
    </svg>
  );
}

const SWAP_MS = 900;

function WorldImpl({ biome, progress, time, weather: rawWeather, effects, motion, pose, celebrating, stage = 0, layout = 'stage', className }: Props) {
  const weather = effectiveWeather(biome, rawWeather);
  const isNight = time === 'night';
  const sunPos = SUN_POS[time];
  const def = biomeDef(biome);
  const isleTop = PALETTES[biome].top;

  // Смена биома — мягкий наплыв: старый остров тает, новый проявляется.
  const [leaving, setLeaving] = useState<{ biome: BiomeId; stage: number } | null>(null);
  const prev = useRef({ biome, stage });
  useEffect(() => {
    if (prev.current.biome !== biome) {
      setLeaving(prev.current);
      const t = window.setTimeout(() => setLeaving(null), SWAP_MS);
      prev.current = { biome, stage };
      return () => window.clearTimeout(t);
    }
    prev.current = { biome, stage };
  }, [biome, stage]);

  const scene = (b: BiomeId, st: number) => (
    <WorldScene biome={b} progress={progress} time={time} weather={weather} effects={effects} pose={pose} celebrating={celebrating} stage={st} />
  );

  return (
    <div className={cn('world', className)} data-time={time} data-weather={weather} data-biome={biome} data-motion={motion} aria-hidden={layout === 'backdrop'}>
      {(['morning', 'day', 'sunset', 'night'] as const).map((t) => (
        <div key={t} className={cn('sky-layer', `sky-${t}`, time === t && 'is-active')} />
      ))}
      <div className="sky-layer sky-rain" style={{ opacity: weather === 'rain' ? 1 : 0 }} />
      <div className="sky-layer sky-haze" style={{ ['--haze' as string]: def.haze }} />

      <div className="stars" style={{ opacity: isNight && weather === 'clear' ? 1 : 0 }}>
        {STARS.map((s, i) => (
          <span key={i} className="star" style={{ left: s.left, top: s.top, width: s.size, height: s.size, animationDelay: s.delay }} />
        ))}
      </div>

      <div
        className={cn('celestial', isNight ? 'celestial--moon' : 'celestial--sun')}
        style={{ ...sunPos, opacity: weather === 'rain' ? 0.25 : 1 }}
      />

      {effects && (
        <>
          <div className="far-isle" style={{ left: '6%', top: '58%', animationDelay: '-4s' }}>
            <FarIsle time={time} top={isleTop} />
          </div>
          <div className="far-isle" style={{ right: '7%', top: '22%', transform: 'scale(0.7)', animationDelay: '-9s' }}>
            <FarIsle time={time} top={isleTop} flip />
          </div>
        </>
      )}

      {CLOUDS.slice(0, effects ? CLOUDS.length : 2).map((c, i) => (
        <div
          key={i}
          className="cloud"
          style={{
            top: c.top,
            left: c.left,
            animationDuration: `${c.duration}s`,
            animationDelay: `${c.delay}s`,
            opacity: isNight ? 0.55 : 0.92,
            scale: String(c.scale),
          }}
        >
          <BlockCloud time={time} rain={weather === 'rain'} />
        </div>
      ))}

      <div className={cn('island-wrap', layout === 'stage' ? 'island-wrap--stage' : 'island-wrap--backdrop')}>
        <div className="island-float">
          {leaving && <div className="island-swap island-swap--out">{scene(leaving.biome, leaving.stage)}</div>}
          <div key={biome} className={cn('island-swap', leaving && 'island-swap--in')}>
            {scene(biome, stage)}
          </div>
        </div>
      </div>

      {/* погода всегда смонтирована и плавно проявляется — без резких переключений */}
      {effects && (
        <>
          <div className={cn('weather', weather === 'rain' && 'is-on')}>
            <div className="rain-layer rain-layer--far" />
            <div className="rain-layer" />
          </div>
          <div className={cn('weather', weather === 'snow' && 'is-on')}>
            <div className="snow-layer snow-layer--far" />
            <div className="snow-layer" />
          </div>
        </>
      )}
    </div>
  );
}

export const World = memo(WorldImpl);
