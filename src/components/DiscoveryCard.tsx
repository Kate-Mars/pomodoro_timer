import { Compass } from 'lucide-react';
import type { BiomeId } from '@/lib/biomes';
import { biomeDef } from '@/lib/biomes';
import { Button } from '@/components/ui/button';
import { BiomeEmblem } from './BiomeEmblem';

/** Ненавязчивое сообщение об открытии нового биома: всплывает снизу, не блокирует экран. */
export function DiscoveryCard({ biome, onGo, onLater }: { biome: BiomeId; onGo: () => void; onLater: () => void }) {
  const def = biomeDef(biome);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[92px] z-40 flex justify-center px-3 lg:bottom-8" role="status" aria-live="polite">
      <div className="discovery panel pointer-events-auto flex w-full max-w-[440px] items-center gap-4 rounded-lg p-4" style={{ ['--glow' as string]: def.swatch }}>
        <div className="discovery-emblem relative grid size-16 shrink-0 place-items-center rounded-md bg-input/40">
          <BiomeEmblem biome={biome} size={48} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="pixel-label text-accent">Новое место</p>
          <p className="mt-1 text-base font-bold">{def.label}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{def.blurb}</p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={onGo}>
              <Compass /> Отправиться
            </Button>
            <Button size="sm" variant="ghost" onClick={onLater}>
              Позже
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
