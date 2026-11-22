/**
 * Минимальный voxel-движок для SVG: изометрическая проекция 2:1,
 * отсечение невидимых граней и сортировка «художника».
 * Камера смотрит сверху со стороны угла (+x, +y): видны верхняя грань,
 * грань +x (правая на экране) и грань +y (левая на экране).
 */

export const TW = 16; // половина ширины ромба клетки
export const TH = 8; // половина высоты ромба клетки
export const ZH = 18; // высота блока на экране

export type Point = { x: number; y: number };

export function project(x: number, y: number, z: number): Point {
  return { x: (x - y) * TW, y: (x + y) * TH - z * ZH };
}

export function pts(points: Point[]): string {
  return points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
}

export type FaceKind = 'top' | 'left' | 'right';

/** Особые поверхности, которые меняются от времени суток через CSS-переменные. */
export type Special = 'window' | 'lamp' | 'fire' | 'water' | 'ice' | 'glow';

export type Box = {
  x: number;
  y: number;
  z: number;
  w: number;
  d: number;
  h: number;
  color: string;
  /** Цвет верхней полосы боковых граней (трава на земле, снег на крыше). */
  cap?: string;
  special?: Special;
  /** Отсекать грани, закрытые соседями той же группы (только для единичных блоков). */
  cull?: boolean;
};

export type Face = {
  key: string;
  points: string;
  fill: string;
  kind: FaceKind;
  special?: Special;
  /** Для анимации появления: высота блока, чтобы строить снизу вверх. */
  z: number;
};

export type DrawItem = {
  key: string;
  sortA: number;
  sortB: number;
  faces: Face[];
};

/* ---------- цвет ---------- */

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function shade(hex: string, k: number): string {
  const [r, g, b] = hexToRgb(hex);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `#${((1 << 24) | (f(r) << 16) | (f(g) << 8) | f(b)).toString(16).slice(1)}`;
}

/** Детерминированный «шум» 0..1 по координатам — для фактуры блоков без текстур. */
export function hash3(x: number, y: number, z: number): number {
  let h = Math.imul(Math.floor(x * 7.3) + 374761393, 668265263) ^ Math.imul(Math.floor(y * 5.1) + 1442695041, 2246822519) ^ Math.imul(Math.floor(z * 3.7) + 3266489917, 3266489917);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

const LIGHT: Record<FaceKind, number> = { top: 1, left: 0.84, right: 0.68 };

/* ---------- построение граней ---------- */

function boxKey(b: Box) {
  return `${b.x},${b.y},${b.z}`;
}

/**
 * Превращает набор блоков одной группы в элементы отрисовки.
 * occluders — блоки, которые могут закрывать грани (обычно та же группа + земля).
 */
export function buildItems(group: string, boxes: Box[], occluders?: Set<string>): DrawItem[] {
  const solid = occluders ?? new Set(boxes.filter((b) => b.cull).map(boxKey));
  const items: DrawItem[] = [];

  boxes.forEach((b, index) => {
    const unit = b.cull && b.w === 1 && b.d === 1 && b.h === 1;
    const showTop = !unit || !solid.has(`${b.x},${b.y},${b.z + 1}`);
    const showRight = !unit || !solid.has(`${b.x + 1},${b.y},${b.z}`);
    const showLeft = !unit || !solid.has(`${b.x},${b.y + 1},${b.z}`);
    if (!showTop && !showRight && !showLeft) return;

    const n = 0.93 + hash3(b.x, b.y, b.z) * 0.12;
    const { x, y, z, w, d, h } = b;
    const faces: Face[] = [];
    const id = `${group}:${index}`;
    const plain = !b.special || b.special === 'glow';
    const fill = (kind: FaceKind) => (plain ? shade(b.color, LIGHT[kind] * n) : '');

    if (showLeft) {
      faces.push({
        key: `${id}:l`,
        kind: 'left',
        special: b.special,
        z,
        fill: fill('left'),
        points: pts([project(x, y + d, z + h), project(x + w, y + d, z + h), project(x + w, y + d, z), project(x, y + d, z)]),
      });
      if (b.cap) {
        const c = h * 0.32;
        faces.push({
          key: `${id}:lc`,
          kind: 'left',
          z,
          fill: shade(b.cap, LIGHT.left * n),
          points: pts([project(x, y + d, z + h), project(x + w, y + d, z + h), project(x + w, y + d, z + h - c), project(x, y + d, z + h - c)]),
        });
      }
    }
    if (showRight) {
      faces.push({
        key: `${id}:r`,
        kind: 'right',
        special: b.special,
        z,
        fill: fill('right'),
        points: pts([project(x + w, y, z + h), project(x + w, y + d, z + h), project(x + w, y + d, z), project(x + w, y, z)]),
      });
      if (b.cap) {
        const c = h * 0.32;
        faces.push({
          key: `${id}:rc`,
          kind: 'right',
          z,
          fill: shade(b.cap, LIGHT.right * n),
          points: pts([project(x + w, y, z + h), project(x + w, y + d, z + h), project(x + w, y + d, z + h - c), project(x + w, y, z + h - c)]),
        });
      }
    }
    if (showTop) {
      faces.push({
        key: `${id}:t`,
        kind: 'top',
        special: b.special,
        z,
        fill: plain ? shade(b.cap ?? b.color, LIGHT.top * n) : '',
        points: pts([project(x, y, z + h), project(x + w, y, z + h), project(x + w, y + d, z + h), project(x, y + d, z + h)]),
      });
    }

    items.push({
      key: id,
      // глубина: центр основания блока; при равенстве — ниже рисуется раньше
      sortA: x + w / 2 + y + d / 2,
      sortB: z,
      faces,
    });
  });

  return items;
}

export function sortItems<T extends { sortA: number; sortB: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.sortA - b.sortA || a.sortB - b.sortB);
}

export function boundsOf(boxes: Box[], pad = 0) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const b of boxes) {
    for (const [dx, dy, dz] of [
      [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1], [1, 0, 0], [1, 1, 0], [0, 1, 0],
    ]) {
      const p = project(b.x + dx * b.w, b.y + dy * b.d, b.z + dz * b.h);
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }
  }
  return { x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 };
}
