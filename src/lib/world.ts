/**
 * Остров: рельеф, постройки и порядок строительства.
 * Геометрия общая для всех биомов, отличаются материалы и некоторые объекты
 * (дуб/ель/кактус, деревянный/песчаниковый/заснеженный дом, вода/лёд).
 * Всё детерминировано — никаких случайных чисел и внешних картинок.
 */
import type { BiomeId } from './biomes';
import type { Box } from './voxel';
import { hash3 } from './voxel';

/** Пороги появления 14 этапов — те же, что в первой версии (контракт прогресса не меняется). */
export const ISLAND_THRESHOLDS = [
  0.05, 0.12, 0.2, 0.28, 0.36, 0.44, 0.52, 0.6, 0.68, 0.76, 0.84, 0.9, 0.95, 1,
] as const;

export type PieceId =
  | 'grove'
  | 'foundation'
  | 'walls'
  | 'roof'
  | 'path'
  | 'lanterns'
  | 'garden'
  | 'bridge'
  | 'trees'
  | 'well'
  | 'tower'
  | 'flowers'
  | 'campfire'
  | 'beacon';

export const PIECE_ORDER: PieceId[] = [
  'grove', 'foundation', 'walls', 'roof', 'path', 'lanterns', 'garden',
  'bridge', 'trees', 'well', 'tower', 'flowers', 'campfire', 'beacon',
];

export const PIECE_LABELS: Record<PieceId, string> = {
  grove: 'Роща',
  foundation: 'Фундамент',
  walls: 'Стены дома',
  roof: 'Крыша и труба',
  path: 'Тропинка',
  lanterns: 'Фонари',
  garden: 'Огород',
  bridge: 'Мост',
  trees: 'Новые деревья',
  well: 'Колодец',
  tower: 'Смотровая башня',
  flowers: 'Цветы',
  campfire: 'Костёр',
  beacon: 'Маяк на башне',
};

export const ISLAND_PIECE_COUNT = PIECE_ORDER.length;

export function pieceThreshold(id: PieceId): number {
  return ISLAND_THRESHOLDS[PIECE_ORDER.indexOf(id)];
}

export function visiblePieceIds(progress: number): PieceId[] {
  return PIECE_ORDER.filter((_, i) => progress + 1e-9 >= ISLAND_THRESHOLDS[i]);
}

export function islandPercent(progress: number): number {
  return Math.round((visiblePieceIds(progress).length / ISLAND_PIECE_COUNT) * 100);
}

export function nextPiece(progress: number): PieceId | null {
  return PIECE_ORDER.find((_, i) => progress + 1e-9 < ISLAND_THRESHOLDS[i]) ?? null;
}

/* ---------- палитры ---------- */

export type Palette = {
  top: string; // трава / песок / снег / мицелий
  topAlt?: string; // пятна: лепестки, опавшие листья, мох
  altChance?: number;
  beach?: string; // песок у воды (тропики)
  soil: string;
  soilDeep: string;
  stone: string;
  stoneDark: string;
  peak: string; // вершина горы
  peakSide?: string; // боковина вершины
  band?: string; // полосы месы в пустыне
  leaves: string;
  leavesDark: string;
  leavesAlt?: string;
  leafCap?: string; // снег на кронах
  log: string;
  wall: string;
  wallTrim: string;
  roof: string;
  roofCap?: string;
  cobble: string;
  path: string;
  farmland: string;
  crop: string;
  flowerA: string;
  flowerB: string;
  bush: string;
  water: 'water' | 'ice' | 'lagoon' | 'glowwater';
};

const COMMON = {
  plankDark: '#5e3d24',
  fence: '#8b6239',
  metal: '#3b3f45',
  skin: '#d9a77f',
  shirt: '#4c7f6a',
  pants: '#3a4560',
  hair: '#4a2f1c',
  boots: '#3b2a1e',
  logFire: '#6b4a2b',
  flag: '#c9563c',
};

export const PALETTES: Record<BiomeId, Palette> = {
  meadow: {
    top: '#6daa45', topAlt: '#7bb84c', altChance: 0.25,
    soil: '#86593a', soilDeep: '#6e4a31', stone: '#8b9096', stoneDark: '#62676d', peak: '#eef2f4',
    leaves: '#4e8f37', leavesDark: '#2f6a3d', leavesAlt: '#6aa845',
    log: '#6b4a2b', wall: '#b48451', wallTrim: '#6b4a2b', roof: '#7c3f2b',
    cobble: '#7f8285', path: '#a88c5c', farmland: '#5c3b22', crop: '#8fb33a',
    flowerA: '#d9483b', flowerB: '#f2c94c', bush: '#3f7f3a', water: 'water',
  },
  cherry: {
    top: '#7cbf57', topAlt: '#f0b7cc', altChance: 0.16,
    soil: '#8a5d42', soilDeep: '#704a36', stone: '#959aa3', stoneDark: '#686d77', peak: '#f4f1f4',
    leaves: '#f2a7c3', leavesDark: '#e17fa6', leavesAlt: '#f8c6d8',
    log: '#5a3a33', wall: '#efe6da', wallTrim: '#5a3a33', roof: '#4b5068',
    cobble: '#8d8f95', path: '#c9b08a', farmland: '#5c3b22', crop: '#9cc45a',
    flowerA: '#f7d1df', flowerB: '#ffffff', bush: '#e98bb0', water: 'water',
  },
  forest: {
    top: '#4f8a3a', topAlt: '#3f7a35', altChance: 0.35,
    soil: '#6e4b33', soilDeep: '#5a3d2b', stone: '#7d8580', stoneDark: '#565d5a', peak: '#e8eeec',
    leaves: '#2f6a3d', leavesDark: '#24553a', leavesAlt: '#3d7a45',
    log: '#5b3f29', wall: '#8a5d3b', wallTrim: '#4f3523', roof: '#6b3b2b',
    cobble: '#6f7671', path: '#8a7550', farmland: '#4a3220', crop: '#7fa34a',
    flowerA: '#e8e2c4', flowerB: '#c9b6e4', bush: '#3a7a3d', water: 'water',
  },
  autumn: {
    top: '#9aa043', topAlt: '#d0782f', altChance: 0.3,
    soil: '#7d5338', soilDeep: '#644330', stone: '#8d8a86', stoneDark: '#65625f', peak: '#ece6dc',
    leaves: '#e08a2c', leavesDark: '#c4472e', leavesAlt: '#e9b63a',
    log: '#5e4030', wall: '#b07a4a', wallTrim: '#5e4030', roof: '#8a3b2a',
    cobble: '#807b75', path: '#b0905e', farmland: '#5a3a22', crop: '#e0842c',
    flowerA: '#e9b63a', flowerB: '#c4472e', bush: '#c9662f', water: 'water',
  },
  desert: {
    top: '#e2c48b', topAlt: '#d9b77a', altChance: 0.3,
    soil: '#d2a96a', soilDeep: '#b98c52', stone: '#c98a55', stoneDark: '#a8653e', peak: '#e9b77a', band: '#b65f3a',
    leaves: '#78a33e', leavesDark: '#4f7d33',
    log: '#8a6a43', wall: '#e3cd99', wallTrim: '#bf9f68', roof: '#b4613b',
    cobble: '#c9b07c', path: '#c2a272', farmland: '#8a6238', crop: '#5f8f3a',
    flowerA: '#e0784a', flowerB: '#f0d36a', bush: '#8f7a45', water: 'water',
  },
  snow: {
    top: '#eef3f7', topAlt: '#e2ebf3', altChance: 0.25,
    soil: '#7b5a40', soilDeep: '#5f4532', stone: '#8e979f', stoneDark: '#646d76', peak: '#f7fafc',
    leaves: '#35614b', leavesDark: '#264a3a', leafCap: '#f2f6f9',
    log: '#5b3f29', wall: '#7c5638', wallTrim: '#4a3122', roof: '#4d3628', roofCap: '#f1f5f8',
    cobble: '#858b90', path: '#9aa3ab', farmland: '#5a4030', crop: '#6f8f6a',
    flowerA: '#8fb9d9', flowerB: '#f2f6f9', bush: '#2f5a45', water: 'ice',
  },
  tropical: {
    top: '#5fbf4a', topAlt: '#74cc55', altChance: 0.25, beach: '#efd9a0',
    soil: '#a8784a', soilDeep: '#8c6040', stone: '#9a9a8a', stoneDark: '#6f705f', peak: '#6fbf5a', peakSide: '#8a8a78',
    leaves: '#3fae4a', leavesDark: '#2a8a3e', leavesAlt: '#6fcf55',
    log: '#9a7448', wall: '#d8c07a', wallTrim: '#9a7448', roof: '#c9a55a',
    cobble: '#b8ab88', path: '#e6cf98', farmland: '#7a5232', crop: '#f0b33a',
    flowerA: '#ff6f61', flowerB: '#ffd23f', bush: '#2f9a45', water: 'lagoon',
  },
  mushroom: {
    top: '#8a7aa0', topAlt: '#6fd0c8', altChance: 0.08,
    soil: '#6a4f5a', soilDeep: '#55404a', stone: '#6f6a7f', stoneDark: '#4e4a5c', peak: '#9a8ab4',
    leaves: '#b8423c', leavesDark: '#963530', leavesAlt: '#e9dfcf',
    log: '#e6dccb', wall: '#d9cbb8', wallTrim: '#7a5a4a', roof: '#a8463f',
    cobble: '#7a748a', path: '#a596b5', farmland: '#4a3a44', crop: '#6fd0c8',
    flowerA: '#6fd0e8', flowerB: '#e9a8f0', bush: '#5a8a7a', water: 'glowwater',
  },
};

/* ---------- рельеф ---------- */

const N = 12;
const CX = 5.5;
const CY = 5.5;
const RIVER_Y = 7;
const POND = new Set(['2,6', '3,6', '2,7', '3,7', '4,7', '2,8', '3,8']);

function inMask(x: number, y: number): boolean {
  const dx = Math.abs(x - CX) / 6.1;
  const dy = Math.abs(y - CY) / 6.1;
  const wobble = (hash3(x, y, 11) - 0.5) * 0.12;
  return Math.pow(dx, 3.2) + Math.pow(dy, 3.2) <= 1 + wobble;
}

function mountainHeight(x: number, y: number): number {
  const d = Math.hypot(x - 1, y - 1.2);
  return Math.max(0, Math.round(4.6 - d * 1.35));
}

export type TerrainCell = { x: number; y: number; top: number; bottom: number; water: boolean };

export const CELLS: TerrainCell[] = (() => {
  const cells: TerrainCell[] = [];
  for (let x = 0; x < N; x += 1) {
    for (let y = 0; y < N; y += 1) {
      if (!inMask(x, y)) continue;
      const dist = Math.hypot((x - CX) / 6, (y - CY) / 6);
      const depth = 1 + Math.max(0, Math.floor((1 - dist) * 8.5 + hash3(x, y, 3) * 2.2 - 0.6));
      const isRiver = y === RIVER_Y && x >= 4;
      const water = POND.has(`${x},${y}`) || isRiver;
      cells.push({ x, y, top: water ? 0 : mountainHeight(x, y), bottom: -depth, water });
    }
  }
  return cells;
})();

const cellAt = new Map(CELLS.map((c) => [`${c.x},${c.y}`, c]));
export const RIVER_END_X = Math.max(...CELLS.filter((c) => c.y === RIVER_Y).map((c) => c.x));

function nearWaterOrEdge(x: number, y: number): boolean {
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const c = cellAt.get(`${x + dx},${y + dy}`);
    if (!c || c.water) return true;
  }
  return false;
}

export function terrainBoxes(biome: BiomeId): Box[] {
  const p = PALETTES[biome];
  const boxes: Box[] = [];
  for (const c of CELLS) {
    for (let z = c.bottom; z <= c.top; z += 1) {
      const fromTop = c.top - z;
      let color: string;
      let cap: string | undefined;

      if (c.water && z === c.top) {
        // вода чуть ниже уровня травы; лёд — в снежном биоме
        boxes.push({ x: c.x, y: c.y, z, w: 1, d: 0.999, h: 0.82, color: '#3f7fbf', special: p.water === 'ice' ? 'ice' : 'water' });
        continue;
      }
      if (z > 0) {
        // гора
        const isPeak = z >= 3;
        color = biome === 'desert' ? (z % 2 === 0 ? p.stone : p.band ?? p.stone) : isPeak && p.peakSide ? p.peakSide : p.stone;
        if (fromTop === 0) {
          if (isPeak) cap = p.peak;
          else if (biome !== 'desert') cap = p.top;
          else cap = p.peak;
        }
      } else if (fromTop === 0) {
        color = p.soil;
        const alt = p.topAlt && hash3(c.x, c.y, 21) < (p.altChance ?? 0);
        cap = p.beach && nearWaterOrEdge(c.x, c.y) ? p.beach : alt ? p.topAlt : p.top;
      } else if (z >= -2) {
        color = p.beach && fromTop === 1 && nearWaterOrEdge(c.x, c.y) ? p.beach : p.soil;
      } else if (z >= -4) {
        color = z === -3 && hash3(c.x, c.y, z) > 0.55 ? p.soilDeep : p.stone;
      } else {
        const ore = hash3(c.x, c.y, z) > 0.85;
        color = ore ? (biome === 'mushroom' ? '#6fd0c8' : '#7a6a8a') : p.stoneDark;
      }
      boxes.push({ x: c.x, y: c.y, z, w: 1, d: 1, h: 1, color, cap, cull: true });
    }
  }
  return boxes;
}

/** Ячейки земли для отсечения граней объектов, стоящих на острове. */
export function terrainSolid(): Set<string> {
  const solid = new Set<string>();
  for (const c of CELLS) for (let z = c.bottom; z <= c.top; z += 1) if (!c.water) solid.add(`${c.x},${c.y},${z}`);
  return solid;
}

export function groundZ(x: number, y: number): number {
  const c = cellAt.get(`${Math.floor(x)},${Math.floor(y)}`);
  return c ? c.top + 1 : 1;
}

export function hasCell(x: number, y: number): boolean {
  const c = cellAt.get(`${x},${y}`);
  return !!c && !c.water;
}

/* ---------- флора ---------- */

const v = (x: number, y: number, z: number, color: string, extra: Partial<Box> = {}): Box => ({
  x, y, z, w: 1, d: 1, h: 1, color, cull: true, ...extra,
});

/** Цвет листвы с мягкой «пестротой» — без случайности, по координатам. */
function leafColor(p: Palette, x: number, y: number, z: number): string {
  const r = hash3(x, y, z + 5);
  if (p.leavesAlt && r > 0.72) return p.leavesAlt;
  return r > 0.4 ? p.leaves : p.leavesDark;
}

function oak(x: number, y: number, p: Palette, tall = 3): Box[] {
  const z0 = groundZ(x, y);
  const out: Box[] = [];
  for (let i = 0; i < tall; i += 1) out.push(v(x, y, z0 + i, p.log));
  const top = z0 + tall;
  for (let dx = -1; dx <= 1; dx += 1)
    for (let dy = -1; dy <= 1; dy += 1) {
      out.push(v(x + dx, y + dy, top - 1, leafColor(p, x + dx, y + dy, top - 1), { cap: p.leafCap }));
      if (Math.abs(dx) + Math.abs(dy) < 2) out.push(v(x + dx, y + dy, top, leafColor(p, x + dx, y + dy, top), { cap: p.leafCap }));
    }
  out.push(v(x, y, top + 1, p.leaves, { cap: p.leafCap }));
  return out.filter((b) => !(b.x === x && b.y === y && b.z === top - 1 && b.color !== p.log));
}

/** Берёза: светлый ствол с тёмными пятнами и лёгкая округлая крона. */
function birch(x: number, y: number, p: Palette, leaves?: string): Box[] {
  const z0 = groundZ(x, y);
  const out: Box[] = [];
  for (let i = 0; i < 4; i += 1) out.push({ x: x + 0.2, y: y + 0.2, z: z0 + i, w: 0.6, d: 0.6, h: 1, color: i % 2 ? '#e9e4d8' : '#d9d3c4' });
  out.push({ x: x + 0.78, y: y + 0.35, z: z0 + 1.4, w: 0.04, d: 0.25, h: 0.12, color: '#3b3a36' });
  const t = z0 + 4;
  const c = leaves ?? p.leavesAlt ?? p.leaves;
  out.push({ x: x - 0.4, y: y - 0.4, z: t - 0.6, w: 1.8, d: 1.8, h: 1.1, color: c });
  out.push({ x: x - 0.1, y: y - 0.1, z: t + 0.5, w: 1.2, d: 1.2, h: 0.7, color: c });
  return out;
}

function spruce(x: number, y: number, p: Palette, tall = false): Box[] {
  const z0 = groundZ(x, y);
  const out: Box[] = [v(x, y, z0, p.log), v(x, y, z0 + 1, p.log)];
  const layers = tall
    ? [{ z: 2, r: 1 }, { z: 3, r: 1 }, { z: 4, r: 1 }, { z: 5, r: 0 }, { z: 6, r: 0 }, { z: 7, r: 0 }]
    : [{ z: 2, r: 1 }, { z: 3, r: 1 }, { z: 4, r: 0 }, { z: 5, r: 0 }];
  layers.forEach((l, li) => {
    for (let dx = -l.r; dx <= l.r; dx += 1)
      for (let dy = -l.r; dy <= l.r; dy += 1) {
        if (l.r === 1 && Math.abs(dx) + Math.abs(dy) === 2 && li % 2 === 1) continue;
        out.push(v(x + dx, y + dy, z0 + l.z, li % 2 ? p.leavesDark : p.leaves, { cap: p.leafCap }));
      }
  });
  if (tall) out.push({ x: x + 0.3, y: y + 0.3, z: z0 + 8, w: 0.4, d: 0.4, h: 0.5, color: p.leavesDark, cap: p.leafCap });
  return out;
}

/** Сакура: тёмный изогнутый ствол и широкая розовая крона со свисающими ветками. */
function cherryTree(x: number, y: number, p: Palette): Box[] {
  const z0 = groundZ(x, y);
  const out: Box[] = [v(x, y, z0, p.log), v(x, y, z0 + 1, p.log)];
  out.push({ x: x + 0.25, y: y + 0.25, z: z0 + 2, w: 0.5, d: 0.5, h: 1, color: p.log });
  const t = z0 + 3;
  for (let dx = -2; dx <= 2; dx += 1)
    for (let dy = -2; dy <= 2; dy += 1) {
      const d = Math.abs(dx) + Math.abs(dy);
      if (d > 3) continue;
      out.push(v(x + dx, y + dy, t, leafColor(p, x + dx, y + dy, t)));
      if (d <= 1) out.push(v(x + dx, y + dy, t + 1, leafColor(p, x + dx, y + dy, t + 1)));
      if (d === 3 && hash3(x + dx, y + dy, 9) > 0.45)
        out.push({ x: x + dx + 0.2, y: y + dy + 0.2, z: t - 0.6, w: 0.6, d: 0.6, h: 0.6, color: p.leavesAlt ?? p.leaves });
    }
  return out;
}

function cactus(x: number, y: number, h = 3): Box[] {
  const z0 = groundZ(x, y);
  const out: Box[] = [];
  for (let i = 0; i < h; i += 1) out.push({ x: x + 0.15, y: y + 0.15, z: z0 + i, w: 0.7, d: 0.7, h: 1, color: '#5d8f3a' });
  out.push({ x: x + 0.85, y: y + 0.3, z: z0 + 1, w: 0.4, d: 0.4, h: 0.35, color: '#5d8f3a' });
  out.push({ x: x + 1.05, y: y + 0.3, z: z0 + 1.35, w: 0.35, d: 0.4, h: 0.8, color: '#5d8f3a' });
  out.push({ x: x + 0.35, y: y + 0.35, z: z0 + h, w: 0.3, d: 0.3, h: 0.18, color: '#f2a7c3' });
  return out;
}

function palm(x: number, y: number, p: Palette, lush = false): Box[] {
  const z0 = groundZ(x, y);
  const out: Box[] = [];
  const h = lush ? 5 : 4;
  for (let i = 0; i < h; i += 1) out.push({ x: x + 0.3 + i * 0.07, y: y + 0.3, z: z0 + i, w: 0.4, d: 0.4, h: 1, color: i % 2 ? p.log : '#7f5f3a' });
  const t = z0 + h;
  const cx = x + h * 0.07;
  out.push({ x: cx, y, z: t, w: 1, d: 1, h: 0.6, color: p.leaves });
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    out.push({ x: cx + dx, y: y + dy, z: t - 0.2, w: 1, d: 1, h: 0.35, color: p.leavesDark });
    if (lush) out.push({ x: cx + dx * 1.8 + 0.2, y: y + dy * 1.8 + 0.2, z: t - 0.7, w: 0.6, d: 0.6, h: 0.3, color: p.leaves });
  }
  if (lush) out.push({ x: cx + 0.35, y: y + 0.35, z: t - 0.45, w: 0.3, d: 0.3, h: 0.3, color: '#7a5a2a' }); // кокосы
  return out;
}

/** Огромный гриб: кремовая ножка и шляпка с белыми пятнами или светящаяся голубая. */
function bigMushroom(x: number, y: number, p: Palette, glowing: boolean): Box[] {
  const z0 = groundZ(x, y);
  const out: Box[] = [];
  const h = glowing ? 3 : 4;
  for (let i = 0; i < h; i += 1) out.push({ x: x + 0.2, y: y + 0.2, z: z0 + i, w: 0.6, d: 0.6, h: 1, color: p.log });
  const t = z0 + h;
  const capColor = glowing ? '#5fb7e8' : p.leaves;
  for (let dx = -1; dx <= 1; dx += 1)
    for (let dy = -1; dy <= 1; dy += 1) {
      const spot = !glowing && hash3(x + dx, y + dy, 4) > 0.6;
      out.push(v(x + dx, y + dy, t, spot ? '#f1ece4' : capColor, glowing ? { special: 'glow', cull: false } : {}));
    }
  out.push({ x: x - 0.5, y: y - 0.5, z: t + 1, w: 2, d: 2, h: 0.5, color: glowing ? '#7fd0f0' : p.leavesDark, ...(glowing ? { special: 'glow' as const } : {}) });
  if (!glowing) out.push({ x: x + 0.1, y: y + 0.5, z: t + 1.5, w: 0.3, d: 0.3, h: 0.08, color: '#f1ece4' });
  return out;
}

type TreeKind = 'a' | 'b';

function treeFor(biome: BiomeId, kind: TreeKind, x: number, y: number, p: Palette): Box[] {
  switch (biome) {
    case 'meadow': return kind === 'a' ? oak(x, y, p) : birch(x, y, p);
    case 'cherry': return kind === 'a' ? cherryTree(x, y, p) : birch(x, y, p, '#f8c6d8');
    case 'forest': return spruce(x, y, p, kind === 'a');
    case 'autumn': return kind === 'a' ? oak(x, y, p) : birch(x, y, p, '#e9b63a');
    case 'desert': return kind === 'a' ? palm(x, y, p) : cactus(x, y);
    case 'snow': return spruce(x, y, p, kind === 'b');
    case 'tropical': return palm(x, y, p, true);
    case 'mushroom': return bigMushroom(x, y, p, kind === 'b');
  }
}

/** Мелкая растительность одной клетки: трава, папоротник, тыква, сугроб, светящийся грибок. */
function smallPlant(biome: BiomeId, x: number, y: number, p: Palette, variant = 0): Box[] {
  const z = groundZ(x, y);
  const ox = 0.15 + hash3(x, y, 31 + variant) * 0.4;
  const oy = 0.15 + hash3(x, y, 37 + variant) * 0.4;
  switch (biome) {
    case 'meadow':
    case 'cherry':
    case 'tropical':
      // пучок высокой травы
      return [0, 1, 2].map((i) => ({ x: x + ox + i * 0.14, y: y + oy + (i % 2) * 0.1, z, w: 0.08, d: 0.08, h: 0.35 + hash3(x, y, i) * 0.3, color: i % 2 ? p.top : p.bush }));
    case 'forest':
      // папоротник: несколько плоских листьев
      return [
        { x: x + ox, y: y + oy, z, w: 0.6, d: 0.15, h: 0.25, color: '#4f9a45' },
        { x: x + ox + 0.22, y: y + oy - 0.2, z, w: 0.15, d: 0.6, h: 0.3, color: '#3f8a3d' },
      ];
    case 'autumn':
      return variant % 2
        ? [{ x: x + ox, y: y + oy, z, w: 0.5, d: 0.5, h: 0.42, color: '#e07a1f' }, { x: x + ox + 0.2, y: y + oy + 0.2, z: z + 0.42, w: 0.1, d: 0.1, h: 0.12, color: '#4f6a2a' }]
        : [{ x: x + ox, y: y + oy, z, w: 0.6, d: 0.6, h: 0.06, color: '#c4472e' }];
    case 'desert':
      return [
        { x: x + ox, y: y + oy, z, w: 0.08, d: 0.08, h: 0.4, color: '#9a8048' },
        { x: x + ox + 0.15, y: y + oy, z, w: 0.08, d: 0.08, h: 0.28, color: '#8a7040' },
      ];
    case 'snow':
      return [{ x: x + ox - 0.1, y: y + oy - 0.1, z, w: 0.7, d: 0.6, h: 0.2, color: '#f5f8fb' }];
    case 'mushroom':
      return [
        { x: x + ox + 0.08, y: y + oy + 0.08, z, w: 0.1, d: 0.1, h: 0.22, color: '#e6dccb' },
        { x: x + ox, y: y + oy, z: z + 0.22, w: 0.26, d: 0.26, h: 0.12, color: '#6fd0e8', special: 'glow' },
      ];
  }
}

function bush(biome: BiomeId, x: number, y: number, p: Palette): Box {
  if (biome === 'desert') return { x: x + 0.25, y: y + 0.25, z: groundZ(x, y), w: 0.5, d: 0.5, h: 0.45, color: p.bush };
  if (biome === 'snow') return { x: x + 0.1, y: y + 0.1, z: groundZ(x, y), w: 0.8, d: 0.8, h: 0.6, color: p.bush, cap: p.leafCap };
  if (biome === 'mushroom') return { x: x + 0.2, y: y + 0.2, z: groundZ(x, y), w: 0.6, d: 0.6, h: 0.5, color: p.bush };
  return { x: x + 0.1, y: y + 0.1, z: groundZ(x, y), w: 0.8, d: 0.8, h: 0.7, color: p.bush };
}

const GROUND_SPOTS: Array<[number, number]> = [[1, 2], [10, 4], [4, 8], [0, 7], [11, 7], [9, 11], [0, 5], [6, 11], [4, 3]];

/** Начальный остров: дерево, кусты и характерная мелочь биома. */
export function baseDecor(biome: BiomeId): Box[] {
  const p = PALETTES[biome];
  const out = [...treeFor(biome, 'a', 3, 4, p), bush(biome, 1, 5, p), bush(biome, 11, 6, p), bush(biome, 6, 10, p)];
  GROUND_SPOTS.slice(0, 5).forEach(([x, y], i) => {
    if (hasCell(x, y)) out.push(...smallPlant(biome, x, y, p, i));
  });
  return out;
}

/**
 * Развитие биома: чем больше сессий завершено в этом месте, тем оно уютнее.
 * Стадия 1 — больше растительности, 2 — первая достопримечательность, 3 — вторая.
 */
export function stageDecor(biome: BiomeId, stage: number): Box[] {
  const p = PALETTES[biome];
  const out: Box[] = [];
  if (stage >= 1) {
    GROUND_SPOTS.slice(5).forEach(([x, y], i) => {
      if (hasCell(x, y)) out.push(...smallPlant(biome, x, y, p, i + 5));
    });
  }
  if (stage >= 2) out.push(...landmark(biome, 1, 11, 3, p));
  if (stage >= 3) out.push(...landmark(biome, 2, 1, 7, p));
  return out;
}

function landmark(biome: BiomeId, n: 1 | 2, x: number, y: number, p: Palette): Box[] {
  const z = groundZ(x, y);
  const stone = '#9a9ea3';
  switch (biome) {
    case 'meadow':
      return n === 1
        ? [ // улей на подставке
            { x: x + 0.3, y: y + 0.3, z, w: 0.12, d: 0.12, h: 0.5, color: COMMON.plankDark },
            { x: x + 0.15, y: y + 0.15, z: z + 0.5, w: 0.6, d: 0.6, h: 0.5, color: '#e3b04a' },
            { x: x + 0.2, y: y + 0.2, z: z + 1, w: 0.5, d: 0.5, h: 0.12, color: '#c9902f' },
          ]
        : [ // скамейка у пруда
            { x: x + 0.1, y: y + 0.2, z, w: 0.12, d: 0.6, h: 0.35, color: COMMON.plankDark },
            { x: x + 0.75, y: y + 0.2, z, w: 0.12, d: 0.6, h: 0.35, color: COMMON.plankDark },
            { x: x + 0.05, y: y + 0.15, z: z + 0.35, w: 0.9, d: 0.7, h: 0.1, color: p.wall },
          ];
    case 'cherry':
      return n === 1
        ? [ // каменный фонарь
            { x: x + 0.35, y: y + 0.35, z, w: 0.3, d: 0.3, h: 0.6, color: stone },
            { x: x + 0.2, y: y + 0.2, z: z + 0.6, w: 0.6, d: 0.6, h: 0.35, color: '#ffe3a8', special: 'lamp' },
            { x: x + 0.1, y: y + 0.1, z: z + 0.95, w: 0.8, d: 0.8, h: 0.15, color: '#7a7e86' },
          ]
        : [{ x: x + 0.1, y: y + 0.2, z: z - 0.2, w: 0.8, d: 0.4, h: 0.3, color: '#f0b7cc' }, { x: x + 0.3, y: y + 0.6, z: z - 0.2, w: 0.5, d: 0.3, h: 0.25, color: '#f7d1df' }];
    case 'forest':
      return n === 1
        ? [ // поваленное мшистое бревно
            { x: x - 0.4, y: y + 0.3, z, w: 1.6, d: 0.45, h: 0.45, color: p.log },
            { x: x - 0.3, y: y + 0.3, z: z + 0.45, w: 1.2, d: 0.45, h: 0.1, color: '#5f9a45' },
          ]
        : [{ x: x + 0.1, y: y + 0.1, z, w: 0.8, d: 0.8, h: 0.55, color: '#7d8580', cap: '#5f9a45' }];
    case 'autumn':
      return n === 1
        ? [ // пугало
            { x: x + 0.45, y: y + 0.45, z, w: 0.1, d: 0.1, h: 1.3, color: COMMON.plankDark },
            { x: x + 0.1, y: y + 0.45, z: z + 0.9, w: 0.8, d: 0.1, h: 0.1, color: COMMON.plankDark },
            { x: x + 0.3, y: y + 0.38, z: z + 0.55, w: 0.4, d: 0.24, h: 0.45, color: '#7a4a8a' },
            { x: x + 0.33, y: y + 0.36, z: z + 1.05, w: 0.34, d: 0.3, h: 0.3, color: '#e0842c' },
          ]
        : [{ x: x + 0.1, y: y + 0.1, z, w: 0.45, d: 0.45, h: 0.4, color: '#e07a1f' }, { x: x + 0.5, y: y + 0.4, z, w: 0.4, d: 0.4, h: 0.32, color: '#e9963a' }];
    case 'desert':
      return n === 1
        ? [ // песчаниковая арка
            { x, y: y + 0.2, z, w: 0.35, d: 0.6, h: 1.4, color: p.stone },
            { x: x + 0.9, y: y + 0.2, z, w: 0.35, d: 0.6, h: 1.4, color: p.stone },
            { x, y: y + 0.2, z: z + 1.4, w: 1.25, d: 0.6, h: 0.35, color: p.band ?? p.stone },
          ]
        : [{ x: x + 0.2, y: y + 0.2, z, w: 0.6, d: 0.6, h: 0.5, color: '#b98c52' }, { x: x + 0.3, y: y + 0.3, z: z + 0.5, w: 0.4, d: 0.4, h: 0.3, color: '#c98a55' }];
    case 'snow':
      return n === 1
        ? [ // снеговик
            { x: x + 0.15, y: y + 0.15, z, w: 0.7, d: 0.7, h: 0.6, color: '#f5f8fb' },
            { x: x + 0.25, y: y + 0.25, z: z + 0.6, w: 0.5, d: 0.5, h: 0.45, color: '#f5f8fb' },
            { x: x + 0.45, y: y + 0.72, z: z + 0.78, w: 0.1, d: 0.2, h: 0.08, color: '#e0842c' },
            { x: x + 0.22, y: y + 0.22, z: z + 1.05, w: 0.56, d: 0.56, h: 0.1, color: '#3a3f55' },
          ]
        : [{ x: x - 0.1, y: y + 0.1, z, w: 1.2, d: 0.9, h: 0.55, color: '#eef4f9' }, { x: x + 0.2, y: y + 0.85, z, w: 0.5, d: 0.1, h: 0.4, color: '#7d93a8' }];
    case 'tropical':
      return n === 1
        ? [ // гамак между столбиками
            { x: x + 0.05, y: y + 0.1, z, w: 0.12, d: 0.12, h: 0.9, color: p.log },
            { x: x + 0.85, y: y + 0.8, z, w: 0.12, d: 0.12, h: 0.9, color: p.log },
            { x: x + 0.15, y: y + 0.2, z: z + 0.45, w: 0.75, d: 0.65, h: 0.08, color: '#e85d5d' },
          ]
        : [{ x: x - 0.2, y: y + 0.2, z: z - 0.15, w: 1.2, d: 0.5, h: 0.25, color: '#b07a4a' }, { x: x + 0.3, y: y + 0.4, z: z + 0.1, w: 0.08, d: 0.08, h: 0.6, color: '#f2efe6' }];
    case 'mushroom':
      return n === 1
        ? bigMushroom(x, y, p, true).map((b) => ({ ...b, x: b.x * 0.6 + x * 0.4, y: b.y * 0.6 + y * 0.4, w: b.w * 0.6, d: b.d * 0.6, h: b.h * 0.6, z: z + (b.z - z) * 0.6, cull: false }))
        : [0, 1, 2].map((i) => ({ x: x + 0.15 + i * 0.25, y: y + 0.2 + (i % 2) * 0.35, z, w: 0.2, d: 0.2, h: 0.18, color: '#e9a8f0', special: 'glow' as const }));
  }
}

const HOUSE = { x0: 6, x1: 9, y0: 2, y1: 4 };

export function pieceBoxes(id: PieceId, biome: BiomeId): Box[] {
  const p = PALETTES[biome];
  const g = (x: number, y: number) => groundZ(x, y);
  const out: Box[] = [];

  switch (id) {
    case 'grove': {
      out.push(...treeFor(biome, 'b', 4, 0, p));
      out.push(...treeFor(biome, 'a', 0, 4, p));
      break;
    }
    case 'foundation': {
      for (let x = HOUSE.x0; x <= HOUSE.x1; x += 1)
        for (let y = HOUSE.y0; y <= HOUSE.y1; y += 1) out.push(v(x, y, g(x, y), p.cobble));
      break;
    }
    case 'walls': {
      for (let z = 2; z <= 3; z += 1)
        for (let x = HOUSE.x0; x <= HOUSE.x1; x += 1)
          for (let y = HOUSE.y0; y <= HOUSE.y1; y += 1) {
            const edgeX = x === HOUSE.x0 || x === HOUSE.x1;
            const edgeY = y === HOUSE.y0 || y === HOUSE.y1;
            if (!edgeX && !edgeY) continue;
            const corner = edgeX && edgeY;
            // окна и дверь — на видимых гранях (+x и +y)
            if (y === HOUSE.y1 && x === 7) {
              out.push(v(x, y, z, COMMON.plankDark, { cull: false }));
              continue;
            }
            if (z === 3 && ((y === HOUSE.y1 && x === 8) || (x === HOUSE.x1 && y === 3))) {
              out.push(v(x, y, z, '#cfe3ea', { special: 'window', cull: false }));
              continue;
            }
            out.push(v(x, y, z, corner ? p.wallTrim : p.wall));
          }
      break;
    }
    case 'roof': {
      // ступенчатая двускатная крыша с коньком вдоль x и свесами по y
      const rows: Array<[number, number[]]> = [
        [4, [HOUSE.y0 - 1, HOUSE.y1 + 1]],
        [5, [HOUSE.y0, HOUSE.y1]],
        [6, [HOUSE.y0 + 1]],
      ];
      for (const [z, ys] of rows)
        for (const y of ys)
          for (let x = HOUSE.x0; x <= HOUSE.x1; x += 1)
            out.push(v(x, y, z, p.roof, { cap: p.roofCap }));
      // заполнение фронтона и чердака
      for (let x = HOUSE.x0; x <= HOUSE.x1; x += 1) {
        for (let y = HOUSE.y0; y <= HOUSE.y1; y += 1) out.push(v(x, y, 4, x === HOUSE.x1 ? p.wall : p.wallTrim));
        out.push(v(x, HOUSE.y0 + 1, 5, x === HOUSE.x1 ? p.wall : p.wallTrim));
      }
      // труба
      out.push(v(8, HOUSE.y0, 6, p.cobble), v(8, HOUSE.y0, 7, p.cobble));
      break;
    }
    case 'path': {
      for (const [x, y] of [[7, 5], [7, 6], [7, 8], [7, 9], [7, 10], [8, 10], [8, 11], [6, 5]])
        if (cellAt.has(`${x},${y}`)) out.push({ x: x + 0.05, y: y + 0.05, z: g(x, y), w: 0.9, d: 0.9, h: 0.1, color: p.path });
      break;
    }
    case 'lanterns': {
      for (const [x, y] of [[8, 6], [6, 9]]) {
        const z = g(x, y);
        out.push({ x: x + 0.42, y: y + 0.42, z, w: 0.16, d: 0.16, h: 1.1, color: COMMON.plankDark });
        out.push({ x: x + 0.3, y: y + 0.3, z: z + 1.1, w: 0.4, d: 0.4, h: 0.4, color: '#ffd27a', special: 'lamp' });
        out.push({ x: x + 0.27, y: y + 0.27, z: z + 1.5, w: 0.46, d: 0.46, h: 0.08, color: COMMON.metal });
      }
      break;
    }
    case 'garden': {
      const cells: Array<[number, number]> = [[9, 8], [10, 8], [9, 9], [10, 9], [10, 10]];
      for (const [x, y] of cells) {
        if (!cellAt.has(`${x},${y}`)) continue;
        const z = g(x, y);
        out.push({ x, y, z: z - 0.12, w: 1, d: 1, h: 0.12, color: p.farmland });
        if (biome === 'desert') {
          out.push({ x: x + 0.35, y: y + 0.35, z, w: 0.3, d: 0.3, h: 0.5, color: '#6f9a3f' });
        } else if (biome === 'autumn') {
          out.push({ x: x + 0.22, y: y + 0.22, z, w: 0.56, d: 0.56, h: 0.42, color: hash3(x, y, 3) > 0.5 ? '#e07a1f' : '#e9963a' });
          out.push({ x: x + 0.45, y: y + 0.45, z: z + 0.42, w: 0.1, d: 0.1, h: 0.12, color: '#4f6a2a' });
        } else if (biome === 'mushroom') {
          for (const [ox, oy] of [[0.2, 0.2], [0.6, 0.55]]) {
            out.push({ x: x + ox + 0.05, y: y + oy + 0.05, z, w: 0.08, d: 0.08, h: 0.25, color: '#e6dccb' });
            out.push({ x: x + ox, y: y + oy, z: z + 0.25, w: 0.2, d: 0.2, h: 0.1, color: p.crop, special: 'glow' });
          }
        } else {
          for (const [ox, oy] of [[0.15, 0.15], [0.6, 0.15], [0.15, 0.6], [0.6, 0.6]])
            out.push({ x: x + ox, y: y + oy, z, w: 0.22, d: 0.22, h: 0.35 + hash3(x, y, ox * 10 + oy) * 0.25, color: p.crop });
        }
      }
      // невысокий забор по внешнему краю
      for (let y = 8; y <= 10; y += 1) if (cellAt.has(`11,${y}`)) out.push({ x: 11.4, y: y + 0.1, z: g(11, y), w: 0.14, d: 0.8, h: 0.55, color: COMMON.fence });
      for (let x = 9; x <= 10; x += 1) out.push({ x: x + 0.1, y: 7.85, z: g(x, 8), w: 0.8, d: 0.12, h: 0.5, color: COMMON.fence });
      break;
    }
    case 'bridge': {
      const z = 0.95;
      out.push({ x: 6.8, y: 6.75, z, w: 1.45, d: 1.5, h: 0.22, color: biome === 'desert' ? p.wallTrim : p.wall });
      for (const px of [6.8, 8.1])
        for (const py of [6.75, 8.1]) out.push({ x: px, y: py, z: z + 0.22, w: 0.15, d: 0.15, h: 0.55, color: COMMON.plankDark });
      out.push({ x: 8.1, y: 6.75, z: z + 0.62, w: 0.15, d: 1.5, h: 0.12, color: COMMON.plankDark });
      out.push({ x: 6.8, y: 6.75, z: z + 0.62, w: 0.15, d: 1.5, h: 0.12, color: COMMON.plankDark });
      break;
    }
    case 'trees': {
      out.push(...treeFor(biome, 'a', 1, 9, p));
      out.push(...treeFor(biome, 'b', 5, 11, p));
      break;
    }
    case 'well': {
      const x = 5;
      const y = 4;
      const z = g(x, y);
      for (const [dx, dy] of [[0, 0], [0.75, 0], [0, 0.75], [0.75, 0.75]]) out.push({ x: x + dx, y: y + dy, z, w: 0.25, d: 0.25, h: 0.55, color: p.cobble });
      out.push({ x: x + 0.25, y, z, w: 0.5, d: 0.25, h: 0.55, color: p.cobble });
      out.push({ x, y: y + 0.25, z, w: 0.25, d: 0.5, h: 0.55, color: p.cobble });
      out.push({ x: x + 0.25, y: y + 0.25, z: z + 0.3, w: 0.5, d: 0.5, h: 0.1, color: '#3f7fbf', special: p.water === 'ice' ? 'ice' : 'water' });
      out.push({ x: x + 0.75, y: y + 0.25, z, w: 0.25, d: 0.5, h: 0.55, color: p.cobble });
      out.push({ x: x + 0.25, y: y + 0.75, z, w: 0.5, d: 0.25, h: 0.55, color: p.cobble });
      for (const [dx, dy] of [[0.05, 0.05], [0.8, 0.8]]) out.push({ x: x + dx, y: y + dy, z: z + 0.55, w: 0.15, d: 0.15, h: 0.8, color: COMMON.plankDark });
      out.push({ x: x - 0.1, y: y - 0.1, z: z + 1.35, w: 1.2, d: 1.2, h: 0.18, color: p.roof, cap: p.roofCap });
      break;
    }
    case 'tower': {
      const x = 5;
      const y = 6;
      const z = g(x, y);
      for (let i = 0; i < 4; i += 1) out.push(v(x, y, z + i, i === 2 ? p.wallTrim : p.cobble, { cull: false }));
      out.push({ x: x - 0.2, y: y - 0.2, z: z + 4, w: 1.4, d: 1.4, h: 0.2, color: p.wall });
      for (const [dx, dy] of [[-0.2, -0.2], [1.05, -0.2], [-0.2, 1.05], [1.05, 1.05]]) out.push({ x: x + dx, y: y + dy, z: z + 4.2, w: 0.15, d: 0.15, h: 0.45, color: COMMON.plankDark });
      break;
    }
    case 'flowers': {
      const spots: Array<[number, number]> = [[1, 3], [4, 6], [5, 9], [9, 6], [2, 10], [5, 5], [10, 1], [10, 6], [6, 8], [11, 5]];
      spots.forEach(([x, y], i) => {
        if (!cellAt.has(`${x},${y}`) || POND.has(`${x},${y}`) || y === RIVER_Y) return;
        const z = g(x, y);
        const color = i % 2 ? p.flowerA : p.flowerB;
        const ox = 0.2 + hash3(x, y, 1) * 0.5;
        const oy = 0.2 + hash3(x, y, 2) * 0.5;
        out.push({ x: x + ox, y: y + oy, z, w: 0.06, d: 0.06, h: 0.32, color: '#3f6f2e' });
        out.push({ x: x + ox - 0.07, y: y + oy - 0.07, z: z + 0.3, w: 0.2, d: 0.2, h: 0.16, color });
      });
      break;
    }
    case 'campfire': {
      const x = 3;
      const y = 10;
      const z = g(x, y);
      out.push({ x: x + 0.15, y: y + 0.4, z, w: 0.7, d: 0.2, h: 0.18, color: COMMON.logFire });
      out.push({ x: x + 0.4, y: y + 0.15, z, w: 0.2, d: 0.7, h: 0.18, color: COMMON.logFire });
      out.push({ x: x + 0.32, y: y + 0.32, z: z + 0.18, w: 0.36, d: 0.36, h: 0.32, color: '#ff9a3c', special: 'fire' });
      // брёвна-скамейки
      out.push({ x: x - 0.9, y: y + 0.15, z, w: 0.35, d: 0.7, h: 0.35, color: p.log });
      out.push({ x: x + 0.15, y: y + 1.05, z, w: 0.7, d: 0.35, h: 0.35, color: p.log });
      break;
    }
    case 'beacon': {
      const x = 5;
      const y = 6;
      const z = g(x, y) + 4.2;
      out.push({ x: x + 0.25, y: y + 0.25, z, w: 0.5, d: 0.5, h: 0.5, color: '#ffe08a', special: 'lamp' });
      out.push({ x: x + 0.15, y: y + 0.15, z: z + 0.5, w: 0.7, d: 0.7, h: 0.12, color: COMMON.metal });
      out.push({ x: x + 0.45, y: y + 0.45, z: z + 0.62, w: 0.08, d: 0.08, h: 0.9, color: COMMON.plankDark });
      out.push({ x: x + 0.53, y: y + 0.45, z: z + 1.1, w: 0.55, d: 0.06, h: 0.35, color: COMMON.flag });
      break;
    }
  }
  return out;
}

/* ---------- точки света, дым, персонаж ---------- */

export type LightSpot = { piece: PieceId; x: number; y: number; z: number; r: number; kind: 'window' | 'lamp' | 'fire' };

export const LIGHTS: LightSpot[] = [
  { piece: 'walls', x: 8.5, y: 5, z: 3.5, r: 26, kind: 'window' },
  { piece: 'walls', x: 10, y: 3.5, z: 3.5, r: 26, kind: 'window' },
  { piece: 'lanterns', x: 8.5, y: 6.5, z: 2.4, r: 30, kind: 'lamp' },
  { piece: 'lanterns', x: 6.5, y: 9.5, z: 2.4, r: 30, kind: 'lamp' },
  { piece: 'campfire', x: 3.5, y: 10.5, z: 1.5, r: 42, kind: 'fire' },
  { piece: 'beacon', x: 5.5, y: 6.5, z: 5.5, r: 48, kind: 'lamp' },
];

export const CHIMNEY = { x: 8.5, y: 2.5, z: 8 };

export type CharacterPose = 'resting' | 'building' | 'working' | 'cheering';

export const CHARACTER_SPOTS: Record<CharacterPose, { x: number; y: number }> = {
  resting: { x: 2.35, y: 11.1 },
  building: { x: 9.45, y: 5.55 },
  working: { x: 9.45, y: 5.55 },
  cheering: { x: 7.3, y: 8.6 },
};

/** Персонаж — собственный оригинальный дизайн: зелёная шапка, шарф, рабочий комбинезон. */
export function characterBoxes(pose: CharacterPose): { body: Box[]; arm: Box[] } {
  const { x, y } = CHARACTER_SPOTS[pose];
  const z = pose === 'cheering' ? 1.2 : groundZ(x, y);
  const sit = pose === 'resting';
  const lz = z;
  const body: Box[] = [];
  if (sit) {
    body.push({ x: x + 0.05, y: y - 0.05, z: lz + 0.3, w: 0.18, d: 0.42, h: 0.18, color: COMMON.pants });
    body.push({ x: x + 0.27, y: y - 0.05, z: lz + 0.3, w: 0.18, d: 0.42, h: 0.18, color: COMMON.pants });
  } else {
    body.push({ x: x + 0.05, y: y + 0.05, z: lz, w: 0.18, d: 0.18, h: 0.55, color: COMMON.pants });
    body.push({ x: x + 0.27, y: y + 0.05, z: lz, w: 0.18, d: 0.18, h: 0.55, color: COMMON.pants });
  }
  const bz = sit ? lz + 0.3 : lz + 0.55;
  body.push({ x, y: y + 0.02, z: bz, w: 0.5, d: 0.26, h: 0.55, color: COMMON.shirt });
  body.push({ x: x + 0.02, y: y + 0.02, z: bz + 0.48, w: 0.46, d: 0.27, h: 0.1, color: '#d8b04a' }); // шарф
  body.push({ x: x + 0.03, y: y - 0.06, z: bz + 0.58, w: 0.44, d: 0.42, h: 0.42, color: COMMON.skin });
  body.push({ x: x + 0.01, y: y - 0.08, z: bz + 0.9, w: 0.48, d: 0.46, h: 0.16, color: '#3f6f4f' }); // шапка
  body.push({ x: x + 0.19, y: y + 0.08, z: bz + 1.06, w: 0.12, d: 0.12, h: 0.1, color: '#d8b04a' });
  const arm: Box[] = [
    { x: x + 0.5, y: y + 0.06, z: bz + 0.05, w: 0.16, d: 0.18, h: 0.5, color: COMMON.shirt },
  ];
  if (pose === 'building' || pose === 'working') {
    arm.push({ x: x + 0.52, y: y + 0.12, z: bz - 0.25, w: 0.06, d: 0.06, h: 0.35, color: COMMON.plankDark });
    arm.push({ x: x + 0.47, y: y + 0.08, z: bz - 0.32, w: 0.18, d: 0.14, h: 0.1, color: COMMON.metal });
  }
  body.unshift({ x: x - 0.16, y: y + 0.06, z: bz + 0.05, w: 0.16, d: 0.18, h: 0.5, color: COMMON.shirt });
  return { body, arm };
}
