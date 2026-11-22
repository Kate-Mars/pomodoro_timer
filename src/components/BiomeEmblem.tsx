import type { BiomeId } from '@/lib/biomes';
import { biomeDef } from '@/lib/biomes';
import { PALETTES } from '@/lib/world';
import { cn } from '@/lib/utils';

/** Маленький воксельный «кусочек» биома: земля, слой почвы и характерный объект сверху. */
export function BiomeEmblem({ biome, size = 32, locked = false, className }: { biome: BiomeId; size?: number; locked?: boolean; className?: string }) {
  const p = PALETTES[biome];
  const d = biomeDef(biome);
  const feature = biome === 'mushroom' ? '#b8423c' : biome === 'cherry' ? p.leaves : biome === 'desert' ? '#5d8f3a' : biome === 'snow' ? '#35614b' : d.swatch2;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden
      className={cn('shrink-0', locked && 'opacity-45 grayscale', className)}
      shapeRendering="crispEdges"
    >
      {/* земля */}
      <polygon points="16,9 28,15 16,21 4,15" fill={biome === 'tropical' ? p.top : p.top} />
      <polygon points="4,15 16,21 16,29 4,23" fill={p.soil} />
      <polygon points="16,21 28,15 28,23 16,29" fill={p.soilDeep} />
      <polygon points="4,15 16,21 16,23 4,17" fill={p.top} opacity="0.75" />
      <polygon points="16,21 28,15 28,17 16,23" fill={p.top} opacity="0.55" />
      {/* объект сверху */}
      <polygon points="17,5 23,8 17,11 11,8" fill={feature} />
      <polygon points="11,8 17,11 17,15 11,12" fill={feature} opacity="0.82" />
      <polygon points="17,11 23,8 23,12 17,15" fill={feature} opacity="0.66" />
      {biome === 'tropical' && <polygon points="16,13 21,15.5 16,18 11,15.5" fill="#4fd1c5" />}
      {biome === 'mushroom' && <rect x="15" y="6.5" width="3" height="1.5" fill="#f1ece4" />}
    </svg>
  );
}
