import { memo, useEffect, useMemo, useRef, useState } from 'react';
import type { BiomeId, Particle } from '@/lib/biomes';
import { biomeDef } from '@/lib/biomes';
import type { Box, DrawItem, Face, FaceKind, Special } from '@/lib/voxel';
import { buildItems, boundsOf, project, pts, sortItems } from '@/lib/voxel';
import {
  CHIMNEY,
  LIGHTS,
  PALETTES,
  PIECE_ORDER,
  RIVER_END_X,
  baseDecor,
  characterBoxes,
  pieceBoxes,
  stageDecor,
  terrainBoxes,
  terrainSolid,
  visiblePieceIds,
} from '@/lib/world';
import type { CharacterPose, PieceId } from '@/lib/world';
import type { TimeOfDay } from '@/lib/daycycle';
import { LIGHT_BY_TIME, WEATHER_LIGHT } from '@/lib/daycycle';
import type { Weather } from '@/lib/storage';

type Props = {
  biome: BiomeId;
  progress: number;
  time: TimeOfDay;
  weather: Weather;
  effects: boolean;
  pose: CharacterPose;
  celebrating: boolean;
  /** Стадия развития биома 0–3: добавляет растительность и достопримечательности. */
  stage?: number;
};

/* ---------- цвет с учётом освещения ---------- */

type Rgb = [number, number, number];
const tintCache = new Map<string, string>();

function tint(hex: string, light: Rgb): string {
  const key = `${hex}|${light.join(',')}`;
  const hit = tintCache.get(key);
  if (hit) return hit;
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v, i) => Math.max(0, Math.min(255, Math.round(v * light[i]))));
  const out = `rgb(${c[0]},${c[1]},${c[2]})`;
  if (tintCache.size > 8000) tintCache.clear();
  tintCache.set(key, out);
  return out;
}

const SPECIAL_BASE: Record<Exclude<Special, 'glow'>, Record<FaceKind, string>> = {
  water: { top: '#4b93cf', left: '#3a77ad', right: '#2f6290' },
  ice: { top: '#bfe1f0', left: '#9cc8de', right: '#84b2ca' },
  window: { top: '#c6dbe3', left: '#b7d0da', right: '#a2bcc7' },
  lamp: { top: '#f6dea4', left: '#efcf88', right: '#e2bd70' },
  fire: { top: '#ffb04a', left: '#ff9a3c', right: '#f07f2c' },
};

/** Вода у каждого биома своя: голубая, бирюзовая лагуна, сумеречная светящаяся. */
const WATER: Record<string, Record<FaceKind, string>> = {
  water: SPECIAL_BASE.water,
  ice: SPECIAL_BASE.ice,
  lagoon: { top: '#4fd1c5', left: '#38b2ac', right: '#2c9a94' },
  glowwater: { top: '#5a7fc0', left: '#4a6aa8', right: '#3d5890' },
};

const WATERFALL_COLOR: Record<string, string> = {
  water: '#4f97d2',
  ice: '#a8d4ea',
  lagoon: '#56d0c8',
  glowwater: '#6a8fd0',
};

const EMISSIVE_NIGHT: Partial<Record<Special, Record<FaceKind, string>>> = {
  window: { top: '#ffd27a', left: '#ffc864', right: '#f2b452' },
  lamp: { top: '#fff0b8', left: '#ffe08a', right: '#ffd06a' },
};

function faceFill(face: Face, light: Rgb, glow: number, water: Record<FaceKind, string>): string {
  if (!face.special) return tint(face.fill, light);
  if (face.special === 'fire') return SPECIAL_BASE.fire[face.kind];
  if (face.special === 'glow') {
    // светящиеся грибы и мох: днём чуть ярче окружения, ночью — собственный свет
    const k = 0.75 + glow * 0.55;
    const lift: Rgb = [light[0] * (1 - glow) + k * glow, light[1] * (1 - glow) + k * glow, light[2] * (1 - glow) + k * glow];
    return tint(face.fill, [Math.max(lift[0], light[0] * 1.1), Math.max(lift[1], light[1] * 1.1), Math.max(lift[2], light[2] * 1.1)]);
  }
  const night = EMISSIVE_NIGHT[face.special];
  if (night && glow > 0.4) return night[face.kind];
  const base = face.special === 'water' || face.special === 'ice' ? water : SPECIAL_BASE[face.special];
  return tint(base[face.kind], light);
}

/* ---------- сборка сцены ---------- */

const SOLID = terrainSolid();

function unitKeys(boxes: Box[]) {
  const s = new Set(SOLID);
  for (const b of boxes) if (b.cull && b.w === 1 && b.d === 1 && b.h === 1) s.add(`${b.x},${b.y},${b.z}`);
  return s;
}

type PieceItems = DrawItem & { piece: PieceId | 'terrain' | 'decor' | 'stage' };

function glowSpots(boxes: Box[]) {
  return boxes
    .filter((b) => b.special === 'glow' && b.w * b.d >= 0.03)
    .map((b) => ({ ...project(b.x + b.w / 2, b.y + b.d / 2, b.z + b.h), r: 6 + Math.min(18, b.w * 12) }));
}

function buildStatic(biome: BiomeId) {
  const terrain = buildItems('terrain', terrainBoxes(biome)).map((i) => ({ ...i, piece: 'terrain' as const }));
  const decorBoxes = baseDecor(biome);
  const decor = buildItems('decor', decorBoxes, unitKeys(decorBoxes)).map((i) => ({ ...i, piece: 'decor' as const }));
  const pieces = new Map<PieceId, PieceItems[]>();
  const pieceGlows = new Map<PieceId, ReturnType<typeof glowSpots>>();
  for (const id of PIECE_ORDER) {
    const boxes = pieceBoxes(id, biome);
    pieces.set(id, buildItems(id, boxes, unitKeys(boxes)).map((i) => ({ ...i, piece: id })));
    pieceGlows.set(id, glowSpots(boxes));
  }
  const stages = [0, 1, 2, 3].map((s) => {
    const boxes = stageDecor(biome, s);
    return {
      items: buildItems(`stage${s}`, boxes, unitKeys(boxes)).map((i) => ({ ...i, piece: 'stage' as const })),
      glows: glowSpots(boxes),
      lamps: boxes.filter((b) => b.special === 'lamp').map((b) => project(b.x + b.w / 2, b.y + b.d / 2, b.z + b.h / 2)),
    };
  });
  return { terrain, decor, pieces, pieceGlows, stages, decorGlows: glowSpots(decorBoxes) };
}

/** Рамка сцены считается по полному острову, чтобы при строительстве ничего не «прыгало». */
const VIEW = (() => {
  const all = [...terrainBoxes('meadow'), ...PIECE_ORDER.flatMap((id) => pieceBoxes(id, 'meadow'))];
  const b = boundsOf(all, 14);
  return { x: b.x - 10, y: b.y - 34, w: b.w + 20, h: b.h + 46 };
})();

const WATERFALL = (() => {
  const X = RIVER_END_X + 1;
  const top = 0.84;
  const bottom = -11;
  const poly = pts([project(X, 7, top), project(X, 8, top), project(X, 8, bottom), project(X, 7, bottom)]);
  const lines = [0.2, 0.45, 0.7, 0.88].map((t) => {
    const a = project(X, 7 + t, top);
    const b = project(X, 7 + t, bottom);
    return `M${a.x.toFixed(1)} ${a.y.toFixed(1)} L${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
  });
  const yTop = project(X, 7, top).y;
  const yBottom = project(X, 8, bottom).y;
  return { poly, lines, yTop, yBottom };
})();

const FRESH_MS = 2600;

/* ---------- частицы биомов ---------- */

/** Детерминированный «случайный» ряд, чтобы частицы не прыгали при перерисовке. */
const seq = (i: number, k: number) => {
  const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

const TOP = project(0, 0, 8).y; // верх кроны
const MIDX = project(6, 6, 0).x;

function Particles({ kinds, time, weather }: { kinds: Particle[]; time: TimeOfDay; weather: Weather }) {
  const daylight = time !== 'night';
  return (
    <g className="particles" aria-hidden>
      {kinds.includes('petals') &&
        Array.from({ length: 16 }, (_, i) => (
          <rect
            key={`p${i}`}
            className="pt pt-fall"
            x={VIEW.x + seq(i, 1) * VIEW.w * 0.9 + VIEW.w * 0.05}
            y={TOP - 30 + seq(i, 2) * 60}
            width={3.2}
            height={2.2}
            fill={i % 3 ? '#f7c6d8' : '#f0a8c4'}
            style={{
              ['--dx' as string]: `${(seq(i, 3) - 0.3) * 120}px`,
              ['--dy' as string]: `${200 + seq(i, 4) * 160}px`,
              animationDuration: `${9 + seq(i, 5) * 8}s`,
              animationDelay: `${-seq(i, 6) * 16}s`,
            }}
          />
        ))}
      {kinds.includes('leaves') &&
        Array.from({ length: 14 }, (_, i) => (
          <rect
            key={`l${i}`}
            className="pt pt-fall pt-leaf"
            x={VIEW.x + seq(i, 11) * VIEW.w * 0.9 + VIEW.w * 0.05}
            y={TOP - 20 + seq(i, 12) * 50}
            width={3.6}
            height={3.6}
            fill={['#e08a2c', '#c4472e', '#e9b63a'][i % 3]}
            style={{
              ['--dx' as string]: `${(seq(i, 13) - 0.2) * 140}px`,
              ['--dy' as string]: `${220 + seq(i, 14) * 150}px`,
              animationDuration: `${10 + seq(i, 15) * 9}s`,
              animationDelay: `${-seq(i, 16) * 18}s`,
            }}
          />
        ))}
      {kinds.includes('butterflies') && daylight && weather === 'clear' &&
        Array.from({ length: 4 }, (_, i) => {
          const p = project(2 + seq(i, 21) * 8, 2 + seq(i, 22) * 8, 2.2 + seq(i, 23) * 1.5);
          const color = ['#f2c94c', '#ffffff', '#e98bb0', '#8fd0f0'][i];
          return (
            <g key={`b${i}`} transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`}>
              <g className="pt-wander" style={{ animationDuration: `${14 + i * 3}s`, animationDelay: `${-i * 4}s` }}>
                <g className="pt-flap" style={{ animationDelay: `${-i * 0.13}s` }}>
                  <rect x={-3} y={-2} width={2.6} height={3} fill={color} />
                  <rect x={0.4} y={-2} width={2.6} height={3} fill={color} />
                </g>
              </g>
            </g>
          );
        })}
      {kinds.includes('sunbeams') && daylight && weather === 'clear' && (
        <g className="sunbeams">
          {[0, 1, 2].map((i) => {
            const x0 = MIDX - 250 + i * 64;
            return (
              <polygon
                key={`s${i}`}
                className="sunbeam"
                points={`${x0},${TOP - 40} ${x0 + 18 + i * 6},${TOP - 40} ${x0 + 130},${TOP + 230} ${x0 + 92},${TOP + 230}`}
                fill="url(#beam)"
                style={{ animationDelay: `${-i * 3.3}s` }}
              />
            );
          })}
        </g>
      )}
      {kinds.includes('dust') && daylight &&
        Array.from({ length: 10 }, (_, i) => (
          <rect
            key={`d${i}`}
            className="pt pt-drift"
            x={VIEW.x + seq(i, 31) * VIEW.w * 0.6}
            y={TOP + 60 + seq(i, 32) * 220}
            width={1.8}
            height={1.8}
            fill="#f3dcae"
            style={{ animationDuration: `${14 + seq(i, 33) * 10}s`, animationDelay: `${-seq(i, 34) * 20}s` }}
          />
        ))}
      {kinds.includes('spores') &&
        Array.from({ length: 16 }, (_, i) => {
          const p = project(1 + seq(i, 41) * 10, 1 + seq(i, 42) * 10, 1.4);
          return (
            <rect
              key={`sp${i}`}
              className="pt pt-rise"
              x={p.x}
              y={p.y}
              width={2.2}
              height={2.2}
              fill={i % 3 ? '#8fe8f0' : '#e9a8f0'}
              style={{ animationDuration: `${7 + seq(i, 43) * 7}s`, animationDelay: `${-seq(i, 44) * 12}s` }}
            />
          );
        })}
      {kinds.includes('mist') &&
        [0, 1, 2].map((i) => (
          <ellipse
            key={`m${i}`}
            className="mist"
            cx={MIDX - 120 + i * 120}
            cy={project(6, 6, 0).y + 40 + i * 24}
            rx={150}
            ry={26}
            fill="url(#mist-g)"
            style={{ animationDelay: `${-i * 7}s` }}
          />
        ))}
    </g>
  );
}

function WorldSceneImpl({ biome, progress, time, weather, effects, pose, celebrating, stage = 0 }: Props) {
  const scene = useMemo(() => buildStatic(biome), [biome]);
  const def = biomeDef(biome);
  const palette = PALETTES[biome];
  const visible = visiblePieceIds(progress);
  const visibleKey = visible.join('|');

  // Новые постройки получают анимацию «сборки» блоков; при первой отрисовке — без неё.
  const prevVisible = useRef<Set<PieceId> | null>(null);
  const [fresh, setFresh] = useState<Set<PieceId | 'stage'>>(() => new Set());
  useEffect(() => {
    const now = new Set(visibleKey ? (visibleKey.split('|') as PieceId[]) : []);
    const prev = prevVisible.current;
    prevVisible.current = now;
    if (!prev) return;
    const added = [...now].filter((id) => !prev.has(id));
    if (added.length === 0) return;
    setFresh((f) => new Set([...f, ...added]));
    const timer = window.setTimeout(() => {
      setFresh((f) => {
        const next = new Set(f);
        for (const id of added) next.delete(id);
        return next;
      });
    }, FRESH_MS);
    return () => window.clearTimeout(timer);
  }, [visibleKey]);

  // новая стадия развития тоже «вырастает»
  const prevStage = useRef(stage);
  useEffect(() => {
    if (stage > prevStage.current) {
      setFresh((f) => new Set([...f, 'stage']));
      const timer = window.setTimeout(() => setFresh((f) => {
        const next = new Set(f);
        next.delete('stage');
        return next;
      }), FRESH_MS);
      prevStage.current = stage;
      return () => window.clearTimeout(timer);
    }
    prevStage.current = stage;
  }, [stage]);

  const items = useMemo(() => {
    const list: PieceItems[] = [...scene.terrain, ...scene.decor, ...scene.stages[Math.min(3, stage)].items];
    for (const id of visibleKey ? (visibleKey.split('|') as PieceId[]) : []) list.push(...(scene.pieces.get(id) ?? []));
    return sortItems(list);
  }, [scene, visibleKey, stage]);

  const char = useMemo(() => {
    const { body, arm } = characterBoxes(pose);
    return { body: sortItems(buildItems('char', body)), arm: buildItems('arm', arm) };
  }, [pose]);

  const baseLight = LIGHT_BY_TIME[time];
  const w = WEATHER_LIGHT[weather];
  const light: Rgb = [baseLight.rgb[0] * w[0], baseLight.rgb[1] * w[1], baseLight.rgb[2] * w[2]];
  const glow = baseLight.glow;
  const roofBuilt = visible.includes('roof');
  const chimney = project(CHIMNEY.x, CHIMNEY.y, CHIMNEY.z);
  const water = WATER[palette.water];

  const glowDots = useMemo(() => {
    const list = [...scene.decorGlows, ...scene.stages[Math.min(3, stage)].glows];
    for (const id of visibleKey ? (visibleKey.split('|') as PieceId[]) : []) list.push(...(scene.pieceGlows.get(id) ?? []));
    return list;
  }, [scene, visibleKey, stage]);

  const renderFace = (face: Face, piece: string, extraDelay = 0) => {
    const isFresh = fresh.has(piece as PieceId);
    const cls = ['vx'];
    if (face.special) cls.push(`vx-${face.special}`);
    if (isFresh) cls.push('vx-in');
    const fill = faceFill(face, light, glow, water);
    return (
      <polygon
        key={face.key}
        className={cls.join(' ')}
        points={face.points}
        fill={fill}
        stroke={fill}
        style={isFresh ? { animationDelay: `${Math.max(0, (face.z - 1) * 110 + extraDelay)}ms` } : undefined}
      />
    );
  };

  const particles = effects ? (time === 'night' ? def.particles.night : def.particles.day) : [];
  const fireflies = effects && glow > 0.4 && weather === 'clear' && !['desert', 'snow'].includes(biome);
  const stageLamps = scene.stages[Math.min(3, stage)].lamps;

  return (
    <svg
      className="world-svg"
      viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`${def.label}: построено ${visible.length} из ${PIECE_ORDER.length} этапов`}
    >
      <defs>
        <radialGradient id="glow-warm">
          <stop offset="0" stopColor="#ffd98a" stopOpacity="0.68" />
          <stop offset="0.45" stopColor="#ffb85c" stopOpacity="0.23" />
          <stop offset="1" stopColor="#ff9a3c" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="glow-fire">
          <stop offset="0" stopColor="#ffc46b" stopOpacity="0.95" />
          <stop offset="0.5" stopColor="#ff8a3c" stopOpacity="0.3" />
          <stop offset="1" stopColor="#ff6a2c" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="glow-cool">
          <stop offset="0" stopColor="#b9f4ff" stopOpacity="0.9" />
          <stop offset="0.5" stopColor="#6fd0e8" stopOpacity="0.28" />
          <stop offset="1" stopColor="#6fd0e8" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="mist-g">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.42" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="beam" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fff3c4" stopOpacity="0.5" />
          <stop offset="0.6" stopColor="#fff3c4" stopOpacity="0.12" />
          <stop offset="1" stopColor="#fff3c4" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="fall-fade" gradientUnits="userSpaceOnUse" x1="0" x2="0" y1={WATERFALL.yTop} y2={WATERFALL.yBottom}>
          <stop offset="0" stopColor="#fff" stopOpacity="1" />
          <stop offset="0.55" stopColor="#fff" stopOpacity="0.9" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id="fall-mask" maskUnits="userSpaceOnUse" x={VIEW.x} y={VIEW.y} width={VIEW.w} height={VIEW.h}>
          <rect x={VIEW.x} y={WATERFALL.yTop - 20} width={VIEW.w} height={WATERFALL.yBottom - WATERFALL.yTop + 40} fill="url(#fall-fade)" />
        </mask>
      </defs>

      <g className="world-island">
        {items.map((item, i) => item.faces.map((f) => renderFace(f, item.piece, (i % 7) * 18)))}

        {/* водопад с края реки */}
        <g className="waterfall" mask="url(#fall-mask)">
          <polygon points={WATERFALL.poly} fill={tint(WATERFALL_COLOR[palette.water], light)} className="vx" />
          {WATERFALL.lines.map((d, i) => (
            <path key={d} d={d} className="waterfall-line" style={{ animationDelay: `${i * -0.35}s` }} />
          ))}
        </g>

        {/* дым из трубы — только когда крыша построена */}
        {roofBuilt && (
          <g className="smoke" transform={`translate(${chimney.x.toFixed(1)} ${chimney.y.toFixed(1)})`}>
            {[0, 1, 2, 3].map((i) => (
              <rect key={i} x={-3} y={-3} width={6} height={6} className="smoke-puff" style={{ animationDelay: `${i * 1.4}s` }} />
            ))}
          </g>
        )}

        {/* персонаж */}
        <g className={`char char--${pose}`}>
          {char.body.map((item) => item.faces.map((f) => renderFace(f, 'char')))}
          <g className="char-arm">{char.arm.map((item) => item.faces.map((f) => renderFace(f, 'char')))}</g>
        </g>
      </g>

      {/* свет окон, фонарей и костра поверх сцены */}
      <g className="world-glows" style={{ opacity: glow }}>
        {LIGHTS.filter((l) => visible.includes(l.piece)).map((l) => {
          const c = project(l.x, l.y, l.z);
          return (
            <circle
              key={`${l.x},${l.y},${l.z}`}
              cx={c.x}
              cy={c.y}
              r={l.r * (celebrating && l.kind === 'window' ? 1.16 : 1)}
              fill={l.kind === 'fire' ? 'url(#glow-fire)' : 'url(#glow-warm)'}
              className={`glow glow--${l.kind}`}
            />
          );
        })}
        {stageLamps.map((c, i) => (
          <circle key={`sl${i}`} cx={c.x} cy={c.y} r={22} fill="url(#glow-warm)" className="glow glow--lamp" />
        ))}
      </g>

      {/* собственный свет грибов и мха: виден и днём, ночью сильнее */}
      {glowDots.length > 0 && (
        <g className="world-glows world-glows--cool" style={{ opacity: 0.25 + glow * 0.75 }}>
          {glowDots.map((g, i) => (
            <circle key={`g${i}`} cx={g.x} cy={g.y} r={g.r} fill="url(#glow-cool)" className="glow glow--cool" style={{ animationDelay: `${-i * 0.7}s` }} />
          ))}
        </g>
      )}

      {particles.length > 0 && <Particles kinds={particles} time={time} weather={weather} />}

      {fireflies && (
        <g className="fireflies">
          {[
            [2.5, 9.5, 2.2], [5.5, 8.5, 2.8], [9.5, 7.5, 2.4], [4.5, 3.5, 3.2], [10.5, 10.5, 2.1], [1.5, 6.5, 2.6],
          ].map(([x, y, z], i) => {
            const p = project(x, y, z);
            return <rect key={i} x={p.x} y={p.y} width={2.2} height={2.2} className="firefly" style={{ animationDelay: `${i * -1.7}s` }} />;
          })}
        </g>
      )}

      {/* праздничные искры над домом в момент завершения */}
      {celebrating && effects && (
        <g className="sparkles">
          {Array.from({ length: 12 }, (_, i) => {
            const p = project(6 + seq(i, 51) * 5, 2 + seq(i, 52) * 4, 4 + seq(i, 53) * 2);
            return (
              <rect
                key={`c${i}`}
                className="sparkle"
                x={p.x}
                y={p.y}
                width={2.6}
                height={2.6}
                fill={i % 2 ? '#ffe08a' : '#fff6d8'}
                style={{ animationDelay: `${seq(i, 54) * 1.6}s` }}
              />
            );
          })}
        </g>
      )}
    </svg>
  );
}

export const WorldScene = memo(WorldSceneImpl);
