/**
 * Генеративная фоновая музыка в духе спокойных «study with me» саундтреков.
 *
 * Вместо постоянно звучащих осцилляторов (они давали гул) музыка собирается из
 * отдельных затухающих нот: мягкое «фетровое» пианино, челеста, калимба, арфа,
 * маримба или стекло. Есть гармония (септаккорды лада), мелодия из мотивов
 * с повторами и вариациями, дыхание пауз между пьесами и мягкая реверберация.
 * Ни одна нота не тянется бесконечно — даже тихий пэд живёт только один аккорд.
 */
import type { BiomeId } from './biomes';

export type Instrument = 'felt' | 'celesta' | 'kalimba' | 'harp' | 'marimba' | 'glass';

export type MusicPreset = {
  /** Настроение — показывается в настройках. */
  mood: string;
  /** Тоника в MIDI. Мелодия звучит примерно на октаву выше. */
  tonic: number;
  /** Лад: интервалы от тоники. */
  scale: number[];
  /** Аккорды как ступени лада (септаккорды строятся по терциям лада). */
  progressions: number[][];
  bpm: number;
  lead: Instrument;
  keys: Instrument;
  /** Редкие «искорки» верхнего голоса. */
  sparkle?: Instrument;
  /** Уровень тихого пэда 0..1 (0 — без пэда). */
  pad: number;
  /** Срез верхних частот всей музыки, Гц. */
  brightness: number;
  /** Длина реверберации, с. */
  space: number;
  /** Вероятность ноты мелодии в такте 0..1. */
  density: number;
  /** Свинг 0..0.2 — доля восьмой. */
  swing: number;
};

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const LYDIAN = [0, 2, 4, 6, 7, 9, 11];
const DORIAN = [0, 2, 3, 5, 7, 9, 10];
const AEOLIAN = [0, 2, 3, 5, 7, 8, 10];
const MIXOLYDIAN = [0, 2, 4, 5, 7, 9, 10];

export const MUSIC: Record<BiomeId, MusicPreset> = {
  meadow: {
    mood: 'тёплое пианино, светлый мажор',
    tonic: 53, // F3
    scale: MAJOR,
    progressions: [
      [0, 5, 3, 4],
      [0, 3, 5, 4],
      [3, 4, 2, 5],
    ],
    bpm: 66,
    lead: 'felt',
    keys: 'felt',
    sparkle: 'celesta',
    pad: 0.5,
    brightness: 3200,
    space: 3.2,
    density: 0.75,
    swing: 0.04,
  },
  cherry: {
    mood: 'арфа и челеста, весенняя лидийская дымка',
    tonic: 50, // D3
    scale: LYDIAN,
    progressions: [
      [0, 1, 0, 4],
      [0, 5, 1, 4],
    ],
    bpm: 60,
    lead: 'harp',
    keys: 'felt',
    sparkle: 'celesta',
    pad: 0.55,
    brightness: 3600,
    space: 3.8,
    density: 0.7,
    swing: 0.02,
  },
  forest: {
    mood: 'глубокое пианино, дорийский лад, много воздуха',
    tonic: 50, // D3
    scale: DORIAN,
    progressions: [
      [0, 3, 0, 6],
      [0, 2, 3, 0],
    ],
    bpm: 56,
    lead: 'felt',
    keys: 'felt',
    pad: 0.7,
    brightness: 2400,
    space: 4.2,
    density: 0.55,
    swing: 0,
  },
  autumn: {
    mood: 'пианино у камина, мягкий минор',
    tonic: 50, // D3
    scale: AEOLIAN,
    progressions: [
      [0, 5, 2, 6],
      [5, 6, 0, 0],
      [0, 3, 5, 6],
    ],
    bpm: 62,
    lead: 'felt',
    keys: 'felt',
    sparkle: 'glass',
    pad: 0.45,
    brightness: 2800,
    space: 3.4,
    density: 0.7,
    swing: 0.05,
  },
  desert: {
    mood: 'калимба и тёплые паузы',
    tonic: 50, // D3
    scale: MIXOLYDIAN,
    progressions: [
      [0, 6, 0, 3],
      [0, 3, 6, 0],
    ],
    bpm: 70,
    lead: 'kalimba',
    keys: 'harp',
    pad: 0.35,
    brightness: 3000,
    space: 2.6,
    density: 0.65,
    swing: 0.08,
  },
  snow: {
    mood: 'музыкальная шкатулка в тихий снегопад',
    tonic: 52, // E3
    scale: MAJOR,
    progressions: [
      [0, 3, 5, 4],
      [5, 3, 0, 4],
    ],
    bpm: 54,
    lead: 'celesta',
    keys: 'felt',
    sparkle: 'glass',
    pad: 0.6,
    brightness: 3400,
    space: 4.6,
    density: 0.6,
    swing: 0,
  },
  tropical: {
    mood: 'маримба и лёгкий свинг',
    tonic: 48, // C3
    scale: MAJOR,
    progressions: [
      [0, 3, 4, 0],
      [0, 5, 1, 4],
    ],
    bpm: 76,
    lead: 'marimba',
    keys: 'kalimba',
    pad: 0.3,
    brightness: 3600,
    space: 2.4,
    density: 0.7,
    swing: 0.12,
  },
  mushroom: {
    mood: 'стеклянные колокольчики, сказочный лидийский',
    tonic: 51, // Eb3
    scale: LYDIAN,
    progressions: [
      [0, 1, 0, 4],
      [0, 5, 1, 0],
    ],
    bpm: 52,
    lead: 'glass',
    keys: 'felt',
    sparkle: 'celesta',
    pad: 0.65,
    brightness: 2600,
    space: 5,
    density: 0.55,
    swing: 0,
  },
};

/* ---------- инструменты ---------- */

type Partial = { ratio: number; amp: number; decay: number };
type InstrumentDef = {
  partials: Partial[];
  attack: number;
  /** Базовое время затухания основного тона на 220 Гц, с. */
  decay: number;
  level: number;
  /** Множитель частоты среза фильтра на ноту. */
  tone: number;
};

const INSTRUMENTS: Record<Instrument, InstrumentDef> = {
  felt: {
    partials: [
      { ratio: 1, amp: 1, decay: 1 },
      { ratio: 2, amp: 0.36, decay: 0.55 },
      { ratio: 3, amp: 0.12, decay: 0.35 },
      { ratio: 4.01, amp: 0.05, decay: 0.25 },
    ],
    attack: 0.012,
    decay: 3.2,
    level: 0.16,
    tone: 5,
  },
  celesta: {
    partials: [
      { ratio: 1, amp: 1, decay: 1 },
      { ratio: 4, amp: 0.22, decay: 0.3 },
      { ratio: 2, amp: 0.1, decay: 0.6 },
    ],
    attack: 0.004,
    decay: 1.8,
    level: 0.075,
    tone: 7,
  },
  kalimba: {
    partials: [
      { ratio: 1, amp: 1, decay: 1 },
      { ratio: 5.4, amp: 0.14, decay: 0.12 },
      { ratio: 2.02, amp: 0.08, decay: 0.4 },
    ],
    attack: 0.003,
    decay: 1.4,
    level: 0.13,
    tone: 6,
  },
  harp: {
    partials: [
      { ratio: 1, amp: 1, decay: 1 },
      { ratio: 2, amp: 0.3, decay: 0.6 },
      { ratio: 3, amp: 0.14, decay: 0.4 },
      { ratio: 5, amp: 0.04, decay: 0.2 },
    ],
    attack: 0.006,
    decay: 2.4,
    level: 0.12,
    tone: 6,
  },
  marimba: {
    partials: [
      { ratio: 1, amp: 1, decay: 1 },
      { ratio: 3.93, amp: 0.2, decay: 0.18 },
      { ratio: 9.2, amp: 0.04, decay: 0.07 },
    ],
    attack: 0.004,
    decay: 0.95,
    level: 0.15,
    tone: 8,
  },
  glass: {
    partials: [
      { ratio: 1, amp: 1, decay: 1 },
      { ratio: 2.76, amp: 0.16, decay: 0.45 },
      { ratio: 5.4, amp: 0.05, decay: 0.2 },
    ],
    attack: 0.03,
    decay: 3,
    level: 0.08,
    tone: 6,
  },
};

const midiToHz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

function createReverb(context: BaseAudioContext, seconds: number): AudioBuffer {
  const rate = context.sampleRate;
  const length = Math.max(1, Math.floor(rate * seconds));
  const buffer = context.createBuffer(2, length, rate);
  for (let ch = 0; ch < 2; ch += 1) {
    const data = buffer.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < length; i += 1) {
      const t = i / length;
      // хвост темнеет со временем: однополюсный фильтр с растущим сглаживанием
      const smooth = 0.25 + t * 0.7;
      lp = lp * smooth + (Math.random() * 2 - 1) * (1 - smooth);
      const env = Math.pow(1 - t, 2.2) * (i < rate * 0.012 ? i / (rate * 0.012) : 1);
      data[i] = lp * env * 2.2;
    }
  }
  return buffer;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)];

/** Ритмы мотивов на два такта (позиция в долях, длительность в долях). */
const RHYTHMS: Array<Array<[number, number]>> = [
  [[0, 2], [2, 1], [3, 1], [4, 3]],
  [[0, 1.5], [1.5, 0.5], [2, 2], [6, 2]],
  [[1, 1], [2, 1], [3, 1], [4, 4]],
  [[0, 3], [4, 1], [5, 1], [6, 2]],
  [[0, 4], [6, 2]],
  [[0, 1], [1, 1], [2, 2], [5, 1], [6, 2]],
  [[2, 2], [4, 1], [5, 3]],
];

type Motif = { rhythm: Array<[number, number]>; steps: number[] };

function makeMotif(): Motif {
  const rhythm = pick(RHYTHMS);
  const steps = rhythm.map((_, i) => (i === 0 ? 0 : pick([-2, -1, -1, 1, 1, 2, 0, -3, 3])));
  return { rhythm, steps };
}

function varyMotif(m: Motif): Motif {
  const steps = [...m.steps];
  const i = 1 + Math.floor(Math.random() * Math.max(1, steps.length - 1));
  if (i < steps.length) steps[i] = steps[i] + pick([-1, 1]);
  return { rhythm: m.rhythm, steps };
}

/**
 * Движок живёт в одном AudioContext с окружением. Наружу — громкость, запуск и
 * остановка с плавными фейдами и смена пресета без обрыва.
 */
export class MusicEngine {
  private readonly ctx: BaseAudioContext;
  private readonly master: GainNode;
  private readonly bus: GainNode;
  private readonly tone: BiquadFilterNode;
  private readonly reverb: ConvolverNode;
  private readonly wet: GainNode;
  private preset: MusicPreset;
  private presetId: BiomeId;
  private timer: number | null = null;
  private running = false;
  private volume = 0.7;

  // состояние композиции
  private beat = 0; // длительность доли, с
  private nextBar = 0; // время начала следующего такта
  private barIndex = 0;
  private piece: { bars: number; progression: number[]; motifA: Motif; motifB: Motif } | null = null;
  private restUntil = 0;
  private lastPitch = 0;
  private pendingSwap: { id: BiomeId; at: number } | null = null;
  private readonly live = new Set<AudioScheduledSourceNode>();

  constructor(ctx: BaseAudioContext, destination: AudioNode, biome: BiomeId) {
    this.ctx = ctx;
    this.presetId = biome;
    this.preset = MUSIC[biome];

    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.bus = ctx.createGain();
    this.bus.gain.value = 1;
    this.tone = ctx.createBiquadFilter();
    this.tone.type = 'lowpass';
    this.tone.frequency.value = this.preset.brightness;
    this.tone.Q.value = 0.5;
    // мягко срезаем и самый низ, чтобы басы не превращались в гул
    const lowCut = ctx.createBiquadFilter();
    lowCut.type = 'highpass';
    lowCut.frequency.value = 70;
    lowCut.Q.value = 0.5;

    this.reverb = ctx.createConvolver();
    this.reverb.buffer = createReverb(ctx, this.preset.space);
    this.wet = ctx.createGain();
    this.wet.gain.value = 0.42;

    this.bus.connect(this.tone);
    this.tone.connect(lowCut);
    lowCut.connect(this.master);
    lowCut.connect(this.reverb);
    this.reverb.connect(this.wet);
    this.wet.connect(this.master);
    this.master.connect(destination);
  }

  get isRunning() {
    return this.running;
  }

  get biome() {
    return this.presetId;
  }

  private target() {
    return Math.pow(Math.min(1, Math.max(0, this.volume)), 1.4) * 1.7;
  }

  setVolume(volume: number, seconds = 0.25) {
    this.volume = volume;
    if (!this.running) return;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(this.master.gain.value, now);
    this.master.gain.linearRampToValueAtTime(this.target(), now + seconds);
  }

  /** Плавный старт: музыка вступает за ~2.5 с. */
  start(biome: BiomeId, volume: number) {
    this.volume = volume;
    const now = this.ctx.currentTime;
    if (!this.running) {
      this.applyPreset(biome);
      this.running = true;
      this.beat = 60 / this.preset.bpm;
      this.nextBar = now + 0.15;
      this.barIndex = 0;
      this.piece = null;
      this.restUntil = 0;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setValueAtTime(Math.max(0.0001, this.master.gain.value), now);
      this.master.gain.linearRampToValueAtTime(this.target(), now + 2.5);
      if (typeof window !== 'undefined') {
        this.timer = window.setInterval(() => this.tick(), 150);
      }
      this.tick();
      return;
    }
    if (biome !== this.presetId) this.crossTo(biome);
    else this.setVolume(volume, 0.6);
  }

  /** Плавная остановка: ноты дозвучивают, общий уровень уходит за ~1.8 с. */
  stop(seconds = 1.8) {
    if (!this.running) return;
    this.running = false;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(this.master.gain.value, now);
    this.master.gain.linearRampToValueAtTime(0, now + seconds);
    if (this.timer !== null && typeof window !== 'undefined') window.clearInterval(this.timer);
    this.timer = null;
    this.pendingSwap = null;
  }

  dispose() {
    this.stop(0.05);
    for (const s of this.live) {
      try {
        s.stop();
      } catch {
        // уже остановлен
      }
    }
    this.live.clear();
    this.master.disconnect();
  }

  /** Для офлайн-рендера: расписать музыку на `seconds` секунд вперёд без таймеров. */
  renderAhead(seconds: number) {
    const end = this.ctx.currentTime + seconds;
    while (this.nextBar < end) this.scheduleBar();
  }

  /** Смена биома: текущая фраза затихает за 1.5 с, новая музыка вступает с начала пьесы. */
  private crossTo(biome: BiomeId) {
    const now = this.ctx.currentTime;
    this.bus.gain.cancelScheduledValues(now);
    this.bus.gain.setValueAtTime(this.bus.gain.value, now);
    this.bus.gain.linearRampToValueAtTime(0, now + 1.5);
    this.pendingSwap = { id: biome, at: now + 1.6 };
  }

  private applyPreset(biome: BiomeId) {
    this.presetId = biome;
    this.preset = MUSIC[biome];
    const now = this.ctx.currentTime;
    this.tone.frequency.setTargetAtTime(this.preset.brightness, now, 0.4);
    this.reverb.buffer = createReverb(this.ctx, this.preset.space);
    this.lastPitch = this.preset.tonic + 19;
  }

  private tick() {
    if (!this.running) return;
    const now = this.ctx.currentTime;
    if (this.pendingSwap && now >= this.pendingSwap.at) {
      this.applyPreset(this.pendingSwap.id);
      this.pendingSwap = null;
      this.beat = 60 / this.preset.bpm;
      this.piece = null;
      this.restUntil = 0;
      this.nextBar = Math.max(this.nextBar, now + 0.1);
      this.bus.gain.cancelScheduledValues(now);
      this.bus.gain.setValueAtTime(0, now);
      this.bus.gain.linearRampToValueAtTime(1, now + 2);
    }
    if (this.pendingSwap) return;
    // планируем с запасом: фоновая вкладка может вызывать таймер раз в секунду
    while (this.nextBar < now + 1.8) this.scheduleBar();
  }

  private chordNotes(degree: number): number[] {
    const { scale, tonic } = this.preset;
    const note = (d: number) => tonic + scale[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7);
    return [note(degree), note(degree + 2), note(degree + 4), note(degree + 6)];
  }

  private newPiece() {
    const motifA = makeMotif();
    this.piece = {
      bars: pick([16, 16, 24]),
      progression: pick(this.preset.progressions),
      motifA,
      motifB: Math.random() < 0.5 ? varyMotif(motifA) : makeMotif(),
    };
    this.barIndex = 0;
  }

  private scheduleBar() {
    const t0 = this.nextBar;
    const barLen = this.beat * 4;
    this.nextBar += barLen;

    if (t0 < this.restUntil) return; // дыхание между пьесами — звучит только природа
    if (!this.piece) this.newPiece();
    const piece = this.piece!;

    const chordIndex = Math.floor(this.barIndex / 2) % piece.progression.length;
    const degree = piece.progression[chordIndex];
    const chord = this.chordNotes(degree);
    const firstOfChord = this.barIndex % 2 === 0;
    const intro = this.barIndex < 2;
    const outro = this.barIndex >= piece.bars - 2;
    const dyn = 0.75 + 0.25 * Math.sin((this.barIndex / piece.bars) * Math.PI); // фраза дышит: тише — громче — тише

    // бас: одна мягкая нота в начале аккорда, не ниже ~90 Гц
    if (firstOfChord) {
      let bass = chord[0] - 12;
      while (midiToHz(bass) < 88) bass += 12;
      this.note(this.preset.keys, t0, bass, 0.55 * dyn, barLen * 2, -0.1);
      if (this.preset.pad > 0) this.pad(t0, chord, barLen * 2);
    }

    // аккорд «перебором» — ноты чуть разнесены во времени
    const voicing = [chord[1], chord[3], chord[2] + 12].sort((a, b) => a - b);
    const roll = firstOfChord ? rand(0.05, 0.09) : rand(0.08, 0.14);
    const chordVel = (firstOfChord ? 0.42 : 0.28) * dyn;
    const at = firstOfChord ? t0 : t0 + this.beat * 2;
    if (firstOfChord || Math.random() < 0.55) {
      voicing.forEach((n, i) => this.note(this.preset.keys, at + i * roll + rand(0, 0.015), n, chordVel * rand(0.85, 1.05), barLen * 1.5, -0.25 + i * 0.25));
    }

    // мелодия: мотив A — A — B — A' по два такта
    if (!intro && !outro && this.barIndex % 2 === 0 && Math.random() < this.preset.density) {
      const section = Math.floor(this.barIndex / 2) % 4;
      const motif = section === 2 ? piece.motifB : section === 3 ? varyMotif(piece.motifA) : piece.motifA;
      this.playMotif(motif, t0, degree, dyn);
    }

    // редкие искры высокого голоса — только в середине пьесы
    if (this.preset.sparkle && !intro && Math.random() < 0.18) {
      const n = chord[pick([1, 2, 3])] + 24;
      this.note(this.preset.sparkle, t0 + this.beat * pick([1.5, 2.5, 3]), n, 0.22 * dyn, 2, rand(-0.6, 0.6));
    }

    this.barIndex += 1;
    if (this.barIndex >= piece.bars) {
      // финальный аккорд и пауза 8–20 секунд, затем новая пьеса
      this.piece = null;
      this.restUntil = this.nextBar + rand(8, 20);
    }
  }

  private playMotif(motif: Motif, t0: number, degree: number, dyn: number) {
    const { scale, tonic } = this.preset;
    // стартовая нота — ближайший к предыдущей звук аккорда в среднем регистре
    const chordPcs = this.chordNotes(degree).slice(0, 3).map((n) => ((n - tonic) % 12 + 12) % 12);
    const pool: number[] = [];
    for (let m = tonic + 12; m <= tonic + 31; m += 1) {
      const pc = ((m - tonic) % 12 + 12) % 12;
      if (scale.includes(pc)) pool.push(m);
    }
    const chordTones = pool.filter((m) => chordPcs.includes(((m - tonic) % 12 + 12) % 12));
    let idx = pool.indexOf(chordTones.reduce((best, m) => (Math.abs(m - this.lastPitch) < Math.abs(best - this.lastPitch) ? m : best), chordTones[0]));
    const swing = this.preset.swing * this.beat;

    motif.rhythm.forEach(([pos, dur], i) => {
      idx = Math.min(pool.length - 1, Math.max(0, idx + motif.steps[i]));
      let pitch = pool[idx];
      // длинные ноты и сильные доли — на звуки аккорда, чтобы не было «кислых» сочетаний
      if (dur >= 2 || pos % 2 === 0) {
        const near = chordTones.reduce((best, m) => (Math.abs(m - pitch) < Math.abs(best - pitch) ? m : best), chordTones[0]);
        if (Math.abs(near - pitch) <= 2) pitch = near;
      }
      this.lastPitch = pitch;
      const offbeat = pos % 1 !== 0 ? swing : 0;
      const t = t0 + pos * this.beat + offbeat + rand(-0.012, 0.012);
      const accent = pos === 0 ? 1 : 0.85;
      this.note(this.preset.lead, t, pitch, 0.62 * dyn * accent * rand(0.88, 1.05), dur * this.beat + 1.2, rand(-0.15, 0.25));
    });
  }

  private note(inst: Instrument, t: number, midi: number, velocity: number, maxLen: number, pan: number) {
    const ctx = this.ctx;
    const def = INSTRUMENTS[inst];
    const f = midiToHz(midi);
    const decay = Math.min(maxLen + 1.5, def.decay * Math.pow(220 / f, 0.3));
    const out = ctx.createGain();
    out.gain.value = def.level * velocity;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = Math.min(6000, f * def.tone);
    lp.Q.value = 0.3;
    let tail: AudioNode = lp;
    if (typeof ctx.createStereoPanner === 'function') {
      const p = ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan));
      lp.connect(p);
      tail = p;
    }
    out.connect(lp);
    tail.connect(this.bus);

    const end = t + decay + 0.1;
    def.partials.forEach((pt, i) => {
      const freq = f * pt.ratio;
      if (freq > 9000) return;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      if (i === 0) osc.detune.value = rand(-3, 3);
      const env = ctx.createGain();
      const d = Math.max(0.06, decay * pt.decay);
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(pt.amp, t + def.attack);
      env.gain.setTargetAtTime(0, t + def.attack, d / 4.5);
      osc.connect(env);
      env.connect(out);
      osc.start(t);
      osc.stop(end);
      this.live.add(osc);
      osc.onended = () => {
        this.live.delete(osc);
        env.disconnect();
        if (i === 0) {
          out.disconnect();
          lp.disconnect();
          if (tail !== lp) tail.disconnect();
        }
      };
    });
  }

  /** Тихий фон аккорда: два слегка расстроенных треугольника через тёмный фильтр, только на время аккорда. */
  private pad(t: number, chord: number[], len: number) {
    const ctx = this.ctx;
    const level = 0.018 * this.preset.pad;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(level, t + len * 0.35);
    out.gain.setValueAtTime(level, t + len * 0.65);
    out.gain.linearRampToValueAtTime(0, t + len + 1.2);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    lp.Q.value = 0.2;
    out.connect(lp);
    lp.connect(this.bus);
    const notes = [chord[1] + 12, chord[3]].map((m) => (midiToHz(m) < 180 ? m + 12 : m));
    const end = t + len + 1.4;
    let alive = 0;
    notes.forEach((m, i) => {
      for (const det of [-6, 6]) {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = midiToHz(m);
        osc.detune.value = det + i;
        osc.connect(out);
        osc.start(t);
        osc.stop(end);
        alive += 1;
        this.live.add(osc);
        osc.onended = () => {
          this.live.delete(osc);
          alive -= 1;
          if (alive === 0) {
            out.disconnect();
            lp.disconnect();
          }
        };
      }
    });
  }
}
