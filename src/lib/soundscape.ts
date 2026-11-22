import type { AmbienceLayer } from './ambience';
import type { BiomeId } from './biomes';
import type { TimeOfDay } from './daycycle';

type Scape = { day: AmbienceLayer[]; dusk: AmbienceLayer[]; night: AmbienceLayer[] };

/** Звуковой пейзаж каждого места: днём, на закате и ночью. */
const SCAPES: Record<BiomeId, Scape> = {
  meadow: { day: ['birds', 'stream', 'leaves'], dusk: ['stream', 'fire'], night: ['night', 'stream'] },
  cherry: { day: ['birds', 'stream'], dusk: ['stream', 'leaves'], night: ['night', 'stream'] },
  forest: { day: ['birds', 'leaves', 'wind'], dusk: ['wind', 'fire'], night: ['night', 'wind'] },
  autumn: { day: ['leaves', 'wind', 'birds'], dusk: ['leaves', 'fire'], night: ['fire', 'wind'] },
  desert: { day: ['wind'], dusk: ['wind', 'fire'], night: ['fire', 'wind'] },
  snow: { day: ['wind'], dusk: ['wind', 'fire'], night: ['fire', 'wind'] },
  tropical: { day: ['waves', 'birds'], dusk: ['waves'], night: ['waves', 'night'] },
  mushroom: { day: ['drips', 'stream'], dusk: ['drips'], night: ['drips', 'night'] },
};

export function soundscape(biome: BiomeId, time: TimeOfDay, weather: 'clear' | 'rain' | 'snow'): AmbienceLayer[] {
  const scape = SCAPES[biome];
  let layers = [...(time === 'night' ? scape.night : time === 'sunset' ? scape.dusk : scape.day)];
  if (weather === 'rain') {
    layers = layers.filter((l) => l !== 'birds' && l !== 'night' && l !== 'leaves');
    layers.unshift('rain');
  }
  if (weather === 'snow') {
    layers = layers.filter((l) => l !== 'birds' && l !== 'stream');
    if (!layers.includes('wind')) layers.push('wind');
  }
  return [...new Set(layers)];
}
