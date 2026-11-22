/**
 * Процедурные звуки природы. Всё синтезируется из розового и коричневого шума
 * и коротких нот — без аудиофайлов. Принципы:
 *  - никаких постоянных синусов: только шумовые текстуры и короткие события;
 *  - события случайны во времени и панораме, поэтому звук не «зацикливается»;
 *  - высокие частоты приглушены, громкость каждого слоя подобрана для долгого фона;
 *  - слои появляются и исчезают за 2.5 секунды.
 */

export type AmbienceLayer = 'rain' | 'wind' | 'stream' | 'birds' | 'fire' | 'leaves' | 'waves' | 'night' | 'drips';

export const AMBIENCE_LABELS: Record<AmbienceLayer, string> = {
  rain: 'дождь',
  wind: 'ветер',
  stream: 'ручей',
  birds: 'птицы',
  fire: 'костёр',
  leaves: 'листва',
  waves: 'прибой',
  night: 'ночные сверчки',
  drips: 'капли',
};

const AMBIENCE_MAX = 0.55;
const LAYER_FADE = 2.5;

type LayerGraph = {
  out: GainNode;
  nodes: AudioNode[];
  sources: Set<AudioScheduledSourceNode>;
  timers: number[];
  stopTimer: number | null;
};

/** Розовый шум (фильтр Пола Келлета): мягче белого, похож на дождь и воду. */
function pinkNoise(ctx: BaseAudioContext, seconds = 6): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < len; i += 1) {
    const w = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179;
    b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.969 * b2 + w * 0.153852;
    b3 = 0.8665 * b3 + w * 0.3104856;
    b4 = 0.55 * b4 + w * 0.5329522;
    b5 = -0.7616 * b5 - w * 0.016898;
    d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
    b6 = w * 0.115926;
  }
  // мягкая сшивка конца с началом, чтобы петля не щёлкала
  const fade = Math.floor(ctx.sampleRate * 0.05);
  for (let i = 0; i < fade; i += 1) {
    const k = i / fade;
    d[len - fade + i] = d[len - fade + i] * (1 - k) + d[i] * k;
  }
  return buf;
}

/** Коричневый шум: глубокий и тёплый — основа ветра, прибоя и гула огня. */
function brownNoise(ctx: BaseAudioContext, seconds = 6): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i += 1) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    d[i] = last * 3.2;
  }
  const fade = Math.floor(ctx.sampleRate * 0.05);
  for (let i = 0; i < fade; i += 1) {
    const k = i / fade;
    d[len - fade + i] = d[len - fade + i] * (1 - k) + d[i] * k;
  }
  return buf;
}

function whiteNoise(ctx: BaseAudioContext, seconds = 1): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i += 1) d[i] = Math.random() * 2 - 1;
  return buf;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

export class AmbienceEngine {
  private readonly ctx: BaseAudioContext;
  private readonly bus: GainNode;
  private readonly pink: AudioBuffer;
  private readonly brown: AudioBuffer;
  private readonly white: AudioBuffer;
  private readonly layers = new Map<AmbienceLayer, LayerGraph>();
  private volume = 0.5;

  constructor(ctx: BaseAudioContext, destination?: AudioNode) {
    this.ctx = ctx;
    this.bus = ctx.createGain();
    this.bus.gain.value = 0;
    // общий мягкий срез верха: природа звучит «за окном», а не в ухе
    const soft = ctx.createBiquadFilter();
    soft.type = 'lowpass';
    soft.frequency.value = 7000;
    soft.Q.value = 0.4;
    // и мягко убираем самый низ — он и давал ощущение гула
    const lowCut = ctx.createBiquadFilter();
    lowCut.type = 'highpass';
    lowCut.frequency.value = 110;
    lowCut.Q.value = 0.5;
    this.bus.connect(lowCut);
    lowCut.connect(soft);
    soft.connect(destination ?? ctx.destination);
    this.pink = pinkNoise(ctx);
    this.brown = brownNoise(ctx);
    this.white = whiteNoise(ctx);
  }

  private busTarget() {
    return Math.pow(Math.min(1, Math.max(0, this.volume)), 1.4) * AMBIENCE_MAX;
  }

  setVolume(volume: number) {
    this.volume = volume;
    const now = this.ctx.currentTime;
    this.bus.gain.cancelScheduledValues(now);
    this.bus.gain.setValueAtTime(this.bus.gain.value, now);
    this.bus.gain.linearRampToValueAtTime(this.layers.size ? this.busTarget() : 0, now + 0.3);
  }

  get active(): AmbienceLayer[] {
    return [...this.layers].filter(([, g]) => g.stopTimer === null).map(([id]) => id);
  }

  /** Плавно приводит набор активных слоёв к нужному. */
  setLayers(wanted: AmbienceLayer[], volume: number) {
    this.volume = volume;
    const want = new Set(wanted);
    for (const [id, graph] of [...this.layers]) {
      if (!want.has(id)) this.fadeOut(id, graph);
    }
    const now = this.ctx.currentTime;
    for (const id of want) {
      const existing = this.layers.get(id);
      if (existing && existing.stopTimer === null) continue;
      if (existing) this.kill(id, existing);
      const graph = this.build(id);
      this.layers.set(id, graph);
      graph.out.gain.setValueAtTime(0, now);
      graph.out.gain.linearRampToValueAtTime(1, now + LAYER_FADE);
    }
    this.bus.gain.cancelScheduledValues(now);
    this.bus.gain.setValueAtTime(this.bus.gain.value, now);
    this.bus.gain.linearRampToValueAtTime(want.size ? this.busTarget() : 0, now + (want.size ? 1 : LAYER_FADE));
  }

  stopAll() {
    this.setLayers([], this.volume);
  }

  dispose() {
    for (const [id, graph] of [...this.layers]) this.kill(id, graph);
    this.bus.disconnect();
  }

  /* ---------- строительные блоки ---------- */

  private loop(graph: LayerGraph, buffer: AudioBuffer, rate = 1): AudioBufferSourceNode {
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    src.playbackRate.value = rate;
    src.start(this.ctx.currentTime, Math.random() * (buffer.duration - 0.1));
    graph.sources.add(src);
    return src;
  }

  private filter(graph: LayerGraph, type: BiquadFilterType, freq: number, q = 0.7): BiquadFilterNode {
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    graph.nodes.push(f);
    return f;
  }

  private gain(graph: LayerGraph, value: number): GainNode {
    const g = this.ctx.createGain();
    g.gain.value = value;
    graph.nodes.push(g);
    return g;
  }

  private panner(graph: LayerGraph, pan: number): AudioNode {
    if (typeof this.ctx.createStereoPanner !== 'function') return this.gain(graph, 1);
    const p = this.ctx.createStereoPanner();
    p.pan.value = pan;
    graph.nodes.push(p);
    return p;
  }

  /** Повторяет `fn` через случайные интервалы; в офлайн-рендере расписывает заранее. */
  private every(graph: LayerGraph, minMs: number, maxMs: number, fn: (t: number) => void, firstMs = 0) {
    if (typeof window === 'undefined') return;
    const run = () => {
      fn(this.ctx.currentTime + 0.05);
      graph.timers.push(window.setTimeout(run, rand(minMs, maxMs)));
    };
    graph.timers.push(window.setTimeout(run, firstMs || rand(minMs, maxMs) * 0.3));
  }

  /** Медленное «блуждание» параметра — естественнее синусоидального LFO. */
  private wander(graph: LayerGraph, param: AudioParam, min: number, max: number, minMs: number, maxMs: number) {
    this.every(graph, minMs, maxMs, (t) => param.setTargetAtTime(rand(min, max), t, (minMs / 1000) * 0.6), 10);
  }

  /** Короткий всплеск шума через полосовой фильтр — капля, треск, шорох. */
  private burst(graph: LayerGraph, t: number, freq: number, q: number, length: number, peak: number, pan: number, buffer = this.white) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = freq;
    bp.Q.value = q;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(peak, t + Math.min(0.004, length / 4));
    env.gain.setTargetAtTime(0, t + Math.min(0.004, length / 4), length / 3);
    const p = typeof ctx.createStereoPanner === 'function' ? ctx.createStereoPanner() : null;
    if (p) p.pan.value = pan;
    src.connect(bp).connect(env);
    if (p) env.connect(p).connect(graph.out);
    else env.connect(graph.out);
    src.start(t, Math.random() * (buffer.duration - 0.2));
    src.stop(t + length * 3 + 0.05);
    graph.sources.add(src);
    src.onended = () => {
      graph.sources.delete(src);
      bp.disconnect();
      env.disconnect();
      p?.disconnect();
    };
  }

  /** Короткая тональная нота с огибающей (птицы, капли, сверчки). */
  private tone(graph: LayerGraph, t: number, f0: number, f1: number, length: number, peak: number, pan: number, type: OscillatorType = 'sine') {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + length);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(peak, t + Math.min(0.02, length * 0.3));
    env.gain.setTargetAtTime(0, t + length * 0.5, length / 4);
    const p = typeof ctx.createStereoPanner === 'function' ? ctx.createStereoPanner() : null;
    if (p) p.pan.value = pan;
    osc.connect(env);
    if (p) env.connect(p).connect(graph.out);
    else env.connect(graph.out);
    osc.start(t);
    osc.stop(t + length * 2 + 0.05);
    graph.sources.add(osc);
    osc.onended = () => {
      graph.sources.delete(osc);
      env.disconnect();
      p?.disconnect();
    };
  }

  /* ---------- слои ---------- */

  private build(id: AmbienceLayer): LayerGraph {
    const ctx = this.ctx;
    const out = ctx.createGain();
    out.connect(this.bus);
    const graph: LayerGraph = { out, nodes: [], sources: new Set(), timers: [], stopTimer: null };

    switch (id) {
      case 'rain': {
        // шелест дождя: розовый шум в средней полосе + тёплый гул капель по крыше
        const hiss = this.loop(graph, this.pink);
        const hp = this.filter(graph, 'highpass', 380, 0.5);
        const lp = this.filter(graph, 'lowpass', 4200, 0.4);
        const level = this.gain(graph, 0.6);
        hiss.connect(hp).connect(lp).connect(level).connect(out);
        this.wander(graph, level.gain, 0.42, 0.68, 3000, 6000);
        const body = this.loop(graph, this.brown);
        const blp = this.filter(graph, 'lowpass', 520, 0.4);
        body.connect(blp).connect(this.gain(graph, 0.32)).connect(out);
        // отдельные капли рядом — тихие, разные по высоте и месту
        this.every(graph, 35, 140, (t) => this.burst(graph, t, rand(1800, 4200), 3, rand(0.006, 0.016), rand(0.03, 0.09), rand(-0.9, 0.9)));
        // редкие тяжёлые капли с карниза
        this.every(graph, 600, 2400, (t) => this.tone(graph, t, rand(900, 1300), rand(500, 700), 0.05, 0.03, rand(-0.6, 0.6)));
        break;
      }
      case 'wind': {
        const src = this.loop(graph, this.brown, 1);
        const bp = this.filter(graph, 'bandpass', 380, 0.6);
        const level = this.gain(graph, 0.35);
        const pan = this.panner(graph, 0);
        src.connect(bp).connect(level).connect(pan).connect(out);
        // порывы: громкость, тембр и положение медленно «гуляют»
        this.every(graph, 4000, 9000, (t) => {
          const strength = rand(0.25, 0.75);
          level.gain.setTargetAtTime(strength, t, 1.6);
          bp.frequency.setTargetAtTime(260 + strength * 520, t, 1.8);
          if ('pan' in pan) (pan as StereoPannerNode).pan.setTargetAtTime(rand(-0.6, 0.6), t, 2.5);
        }, 50);
        break;
      }
      case 'stream': {
        const src = this.loop(graph, this.pink);
        const bp = this.filter(graph, 'bandpass', 900, 0.8);
        const lp = this.filter(graph, 'lowpass', 2600, 0.4);
        const level = this.gain(graph, 0.32);
        src.connect(bp).connect(lp).connect(level).connect(out);
        this.wander(graph, bp.frequency, 700, 1300, 1200, 2600);
        // журчание: короткие «пузырьки» с резонансом
        this.every(graph, 45, 160, (t) => this.burst(graph, t, rand(500, 1500), 9, rand(0.03, 0.07), rand(0.04, 0.1), rand(-0.4, 0.4), this.pink));
        break;
      }
      case 'birds': {
        const lp = this.filter(graph, 'lowpass', 5200, 0.4);
        const echo = ctx.createDelay(0.5);
        echo.delayTime.value = 0.19;
        const fb = this.gain(graph, 0.18);
        graph.nodes.push(echo);
        // птицы поют в свою шину: лёгкое эхо «леса»
        const birdBus = this.gain(graph, 1);
        birdBus.connect(lp).connect(out);
        lp.connect(echo);
        echo.connect(fb).connect(echo);
        echo.connect(this.gain(graph, 0.35)).connect(out);
        const sing = (t: number, pan: number) => {
          const kind = Math.random();
          const base = rand(2000, 3000);
          if (kind < 0.4) {
            // посвист из двух нот
            this.toneTo(birdBus, graph, t, base, base * 1.18, 0.16, 0.045, pan);
            this.toneTo(birdBus, graph, t + 0.22, base * 0.92, base * 0.82, 0.22, 0.04, pan);
          } else if (kind < 0.75) {
            // короткая трель
            const n = 5 + Math.floor(Math.random() * 5);
            for (let i = 0; i < n; i += 1) this.toneTo(birdBus, graph, t + i * 0.055, base * 1.1, base * 0.95, 0.045, 0.028, pan);
          } else {
            // переливчатая фраза
            let f = base;
            for (let i = 0; i < 4; i += 1) {
              const nf = f * rand(0.85, 1.2);
              this.toneTo(birdBus, graph, t + i * 0.13, f, nf, 0.11, 0.035, pan);
              f = nf;
            }
          }
        };
        this.every(graph, 3500, 9500, (t) => {
          const pan = rand(-0.8, 0.8);
          sing(t, pan);
          // иногда отвечает другая птица с другой стороны
          if (Math.random() < 0.35) sing(t + rand(0.9, 1.8), -pan * 0.8);
        }, 1200);
        break;
      }
      case 'fire': {
        // мягкое «дыхание» пламени
        const roar = this.loop(graph, this.brown);
        const lp = this.filter(graph, 'lowpass', 420, 0.5);
        const level = this.gain(graph, 0.32);
        roar.connect(lp).connect(level).connect(out);
        this.wander(graph, level.gain, 0.3, 0.55, 500, 1400);
        // потрескивание: группы коротких щелчков
        this.every(graph, 90, 650, (t) => {
          const n = 1 + Math.floor(Math.random() * 3);
          const pan = rand(-0.25, 0.25);
          for (let i = 0; i < n; i += 1) this.burst(graph, t + i * rand(0.008, 0.03), rand(1500, 3200), 1.4, rand(0.002, 0.006), rand(0.06, 0.22), pan);
        });
        // редкие тёплые «хлопки» полена
        this.every(graph, 2500, 7000, (t) => this.burst(graph, t, rand(300, 600), 2, 0.03, 0.18, rand(-0.2, 0.2), this.brown));
        break;
      }
      case 'leaves': {
        // шорох листвы на ветру: волны шелеста
        const src = this.loop(graph, this.pink);
        const bp = this.filter(graph, 'bandpass', 2400, 0.5);
        const level = this.gain(graph, 0);
        src.connect(bp).connect(level).connect(out);
        this.every(graph, 5000, 11000, (t) => {
          const peak = rand(0.2, 0.36);
          level.gain.setTargetAtTime(peak, t, 1.2);
          level.gain.setTargetAtTime(0.02, t + rand(2.5, 4), 1.6);
        }, 300);
        break;
      }
      case 'waves': {
        const src = this.loop(graph, this.brown);
        const foam = this.loop(graph, this.pink);
        const lp = this.filter(graph, 'lowpass', 500, 0.5);
        const foamBp = this.filter(graph, 'bandpass', 1400, 0.5);
        const level = this.gain(graph, 0.1);
        const foamLevel = this.gain(graph, 0.0);
        src.connect(lp).connect(level).connect(out);
        foam.connect(foamBp).connect(foamLevel).connect(out);
        // каждая волна — нарастание, шипение пены и откат
        this.every(graph, 7000, 11000, (t) => {
          level.gain.setTargetAtTime(0.55, t, 1.2);
          lp.frequency.setTargetAtTime(1300, t, 1.4);
          foamLevel.gain.setTargetAtTime(0.14, t + 2.2, 0.5);
          level.gain.setTargetAtTime(0.12, t + 3.2, 1.6);
          lp.frequency.setTargetAtTime(450, t + 3.2, 1.8);
          foamLevel.gain.setTargetAtTime(0, t + 3.6, 1.2);
        }, 200);
        break;
      }
      case 'night': {
        // сверчки: тихие пульсирующие трели вдалеке, без резкого верха
        const crickets = this.gain(graph, 1);
        const lp = this.filter(graph, 'lowpass', 4600, 0.4);
        crickets.connect(lp).connect(out);
        this.every(graph, 700, 1900, (t) => {
          const f = rand(3600, 4100);
          const pan = rand(-0.9, 0.9);
          const pulses = 3 + Math.floor(Math.random() * 3);
          for (let i = 0; i < pulses; i += 1) this.toneTo(crickets, graph, t + i * 0.045, f, f * 0.995, 0.025, 0.012, pan);
        });
        // редкая сова
        this.every(graph, 22000, 48000, (t) => {
          const pan = rand(-0.7, 0.7);
          this.tone(graph, t, 410, 380, 0.42, 0.05, pan);
          this.tone(graph, t + 0.6, 400, 360, 0.6, 0.045, pan);
        }, 9000);
        break;
      }
      case 'drips': {
        // капли в тихом гроте: «плюх» с подъёмом высоты и эхом
        const echo = ctx.createDelay(1);
        echo.delayTime.value = 0.33;
        const fb = this.gain(graph, 0.32);
        const wet = this.gain(graph, 0.5);
        graph.nodes.push(echo);
        const dripBus = this.gain(graph, 1);
        dripBus.connect(out);
        dripBus.connect(echo);
        echo.connect(fb).connect(echo);
        echo.connect(wet).connect(out);
        const air = this.loop(graph, this.pink);
        air.connect(this.filter(graph, 'bandpass', 600, 0.4)).connect(this.gain(graph, 0.05)).connect(out);
        this.every(graph, 1400, 4800, (t) => this.toneTo(dripBus, graph, t, rand(700, 1000), rand(1400, 1900), 0.07, 0.05, rand(-0.6, 0.6)), 800);
        break;
      }
    }
    return graph;
  }

  /** Как tone, но в произвольную шину слоя. */
  private toneTo(dest: AudioNode, graph: LayerGraph, t: number, f0: number, f1: number, length: number, peak: number, pan: number) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + length);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(peak, t + Math.min(0.015, length * 0.3));
    env.gain.setTargetAtTime(0, t + length * 0.55, length / 4);
    const p = typeof ctx.createStereoPanner === 'function' ? ctx.createStereoPanner() : null;
    if (p) p.pan.value = pan;
    osc.connect(env);
    if (p) env.connect(p).connect(dest);
    else env.connect(dest);
    osc.start(t);
    osc.stop(t + length * 2 + 0.05);
    graph.sources.add(osc);
    osc.onended = () => {
      graph.sources.delete(osc);
      env.disconnect();
      p?.disconnect();
    };
  }

  private fadeOut(id: AmbienceLayer, graph: LayerGraph) {
    if (graph.stopTimer !== null) return;
    const now = this.ctx.currentTime;
    graph.out.gain.cancelScheduledValues(now);
    graph.out.gain.setValueAtTime(graph.out.gain.value, now);
    graph.out.gain.linearRampToValueAtTime(0, now + LAYER_FADE);
    graph.stopTimer = window.setTimeout(() => this.kill(id, graph), LAYER_FADE * 1000 + 150);
  }

  private kill(id: AmbienceLayer, graph: LayerGraph) {
    if (graph.stopTimer !== null) window.clearTimeout(graph.stopTimer);
    for (const timer of graph.timers) window.clearTimeout(timer);
    graph.timers = [];
    for (const source of graph.sources) {
      try {
        source.stop();
      } catch {
        // уже остановлен
      }
    }
    graph.sources.clear();
    for (const node of graph.nodes) node.disconnect();
    graph.out.disconnect();
    if (this.layers.get(id) === graph) this.layers.delete(id);
  }
}

/** Мягкий колокольчик завершения: три ноты мажорного трезвучия с тёплым затуханием. */
export function playChime(ctx: BaseAudioContext, volume: number, destination?: AudioNode) {
  const level = Math.pow(Math.min(1, Math.max(0, volume)), 1.3) * 0.12;
  if (level <= 0) return;
  const out = destination ?? ctx.destination;
  const t0 = ctx.currentTime + 0.05;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 3800;
  lp.connect(out);
  const notes = [
    { f: 523.25, at: 0 }, // C5
    { f: 659.25, at: 0.18 }, // E5
    { f: 783.99, at: 0.36 }, // G5
    { f: 1046.5, at: 0.62 }, // C6, тише
  ];
  notes.forEach((note, n) => {
    for (const [mult, amp, dec] of [
      [1, 1, 2.4],
      [2, 0.18, 1.1],
      [3.01, 0.06, 0.6],
    ] as const) {
      const osc = ctx.createOscillator();
      osc.frequency.value = note.f * mult;
      const env = ctx.createGain();
      const t = t0 + note.at;
      const peak = level * amp * (n === 3 ? 0.55 : 1);
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(peak, t + 0.01);
      env.gain.setTargetAtTime(0, t + 0.01, dec / 4);
      osc.connect(env).connect(lp);
      osc.start(t);
      osc.stop(t + dec + 0.6);
      osc.onended = () => env.disconnect();
    }
  });
}
