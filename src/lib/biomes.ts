/**
 * Биомы острова. Три исходных (луг, пустыня, снег) открыты всегда — так не ломаются
 * данные первой версии. Остальные открываются по числу завершённых сессий.
 */

export type BiomeId = 'meadow' | 'cherry' | 'forest' | 'autumn' | 'desert' | 'snow' | 'tropical' | 'mushroom';

export type Particle = 'butterflies' | 'petals' | 'leaves' | 'sunbeams' | 'dust' | 'spores' | 'mist';

export type BiomeDef = {
  id: BiomeId;
  label: string;
  /** Короткое описание места. */
  blurb: string;
  /** Сколько завершённых сессий нужно для открытия (0 — открыт сразу). */
  unlockAt: number;
  /** Цвет образца в интерфейсе. */
  swatch: string;
  /** Второй цвет — для эмблемы и акцентов карточки. */
  swatch2: string;
  /** Частицы мира: днём и ночью. */
  particles: { day: Particle[]; night: Particle[] };
  /** Погода, которая бывает в этом месте; остальная заменяется на «ясно». */
  weathers: Array<'clear' | 'rain' | 'snow'>;
  /** Цвет лёгкой дымки поверх неба — своя атмосфера у каждого места. */
  haze: string;
};

export const BIOMES: BiomeDef[] = [
  {
    id: 'meadow',
    label: 'Цветущий луг',
    blurb: 'Холмы, полевые цветы, дубы и бабочки в тёплом солнце.',
    unlockAt: 0,
    swatch: '#7fb55a',
    swatch2: '#f2c94c',
    particles: { day: ['butterflies'], night: [] },
    weathers: ['clear', 'rain'],
    haze: '#fff1c9',
  },
  {
    id: 'desert',
    label: 'Пустыня',
    blurb: 'Дюны, оазис, пальмы и кактусы, тёплые закаты.',
    unlockAt: 0,
    swatch: '#e2c48b',
    swatch2: '#c9763f',
    particles: { day: ['dust'], night: [] },
    weathers: ['clear', 'rain'],
    haze: '#ffd8a3',
  },
  {
    id: 'snow',
    label: 'Заснеженные горы',
    blurb: 'Ели в снегу, лёд на пруду и холодное голубое утро.',
    unlockAt: 0,
    swatch: '#dfeaf4',
    swatch2: '#35614b',
    particles: { day: ['mist'], night: ['mist'] },
    weathers: ['clear', 'snow'],
    haze: '#d8ecff',
  },
  {
    id: 'cherry',
    label: 'Сакуровая роща',
    blurb: 'Розовые кроны, опадающие лепестки и тихий пруд.',
    unlockAt: 1,
    swatch: '#f0a8c4',
    swatch2: '#7cbf57',
    particles: { day: ['petals'], night: ['petals'] },
    weathers: ['clear', 'rain'],
    haze: '#ffd6e6',
  },
  {
    id: 'forest',
    label: 'Хвойный лес',
    blurb: 'Высокие ели, мох, папоротники и лучи между деревьями.',
    unlockAt: 3,
    swatch: '#3f7a4a',
    swatch2: '#9cc46a',
    particles: { day: ['sunbeams'], night: [] },
    weathers: ['clear', 'rain'],
    haze: '#d9f0c8',
  },
  {
    id: 'autumn',
    label: 'Осенний лес',
    blurb: 'Золото и багрянец, тыквы и кружащиеся листья.',
    unlockAt: 5,
    swatch: '#e0843a',
    swatch2: '#c4472e',
    particles: { day: ['leaves'], night: ['leaves'] },
    weathers: ['clear', 'rain'],
    haze: '#ffcf9c',
  },
  {
    id: 'tropical',
    label: 'Тропический остров',
    blurb: 'Пальмы, бирюзовая вода, песчаный берег и яркое солнце.',
    unlockAt: 8,
    swatch: '#3fc1c0',
    swatch2: '#f0d38a',
    particles: { day: ['butterflies'], night: [] },
    weathers: ['clear', 'rain'],
    haze: '#c8fbf2',
  },
  {
    id: 'mushroom',
    label: 'Грибной лес',
    blurb: 'Огромные грибы, светящийся мох, туман и огоньки спор.',
    unlockAt: 12,
    swatch: '#8f6fb8',
    swatch2: '#6fd0e8',
    particles: { day: ['spores', 'mist'], night: ['spores', 'mist'] },
    weathers: ['clear', 'rain'],
    haze: '#d7c8ff',
  },
];

export const BIOME_IDS = BIOMES.map((b) => b.id);

export const DEFAULT_BIOME: BiomeId = 'meadow';

export function isBiomeId(value: unknown): value is BiomeId {
  return typeof value === 'string' && (BIOME_IDS as string[]).includes(value);
}

export function biomeDef(id: BiomeId): BiomeDef {
  return BIOMES.find((b) => b.id === id) ?? BIOMES[0];
}

export function biomeLabel(id: BiomeId): string {
  return biomeDef(id).label;
}

/** Открыт ли биом при данном числе завершённых сессий. */
export function isUnlocked(id: BiomeId, completed: number): boolean {
  return completed >= biomeDef(id).unlockAt;
}

export function unlockedBiomes(completed: number): BiomeId[] {
  return BIOMES.filter((b) => completed >= b.unlockAt).map((b) => b.id);
}

/** Следующий закрытый биом и сколько сессий до него. */
export function nextUnlock(completed: number): { biome: BiomeDef; left: number } | null {
  const next = [...BIOMES].sort((a, b) => a.unlockAt - b.unlockAt).find((b) => b.unlockAt > completed);
  return next ? { biome: next, left: next.unlockAt - completed } : null;
}

/** Стадия развития биома по числу сессий, завершённых именно в нём: 0–3. */
export const STAGE_AT = [1, 3, 6] as const;
export const STAGE_LABELS = ['Новое место', 'Обжитое', 'Уютное', 'Любимое'] as const;

export function biomeStage(sessionsHere: number): number {
  return STAGE_AT.filter((n) => sessionsHere >= n).length;
}

export function effectiveWeather<W extends 'clear' | 'rain' | 'snow'>(biome: BiomeId, weather: W): W | 'clear' {
  return biomeDef(biome).weathers.includes(weather) ? weather : 'clear';
}
