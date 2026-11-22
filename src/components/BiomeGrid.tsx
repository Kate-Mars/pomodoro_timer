import { Check, Lock } from 'lucide-react';
import { useAppState } from '@/AppStateContext';
import { BIOMES, STAGE_AT, STAGE_LABELS, biomeStage } from '@/lib/biomes';
import { BiomeEmblem } from './BiomeEmblem';
import { cn } from '@/lib/utils';

function sessionsWord(n: number) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return 'сессию';
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'сессии';
  return 'сессий';
}

/**
 * Атлас биомов: открытые можно выбрать, закрытые показывают, сколько осталось.
 * У каждого открытого — стадия развития по сессиям, проведённым именно там.
 */
export function BiomeGrid({ detailed = false }: { detailed?: boolean }) {
  const { biome, stats, atlas, unlocked, actions } = useAppState();
  const focusableBiome = unlocked.includes(biome) ? biome : unlocked[0];
  return (
    <div className={cn('grid gap-2.5', detailed ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2 lg:grid-cols-3')} role="radiogroup" aria-label="Биом">
      {BIOMES.map((b) => {
        const open = unlocked.includes(b.id);
        const here = atlas.byBiome[b.id] ?? 0;
        const stage = biomeStage(here);
        const selected = biome === b.id;
        const left = b.unlockAt - stats.completed;
        return (
          <button
            key={b.id}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={b.id === focusableBiome ? 0 : -1}
            aria-disabled={!open}
            disabled={!open}
            onClick={() => open && actions.setBiome(b.id)}
            onKeyDown={(event) => {
              const direction = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
              if (!direction) return;
              event.preventDefault();
              const options = Array.from(event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('button[role="radio"]:enabled') ?? []);
              const current = options.indexOf(event.currentTarget);
              const next = options[(current + direction + options.length) % options.length];
              next?.focus();
              next?.click();
            }}
            className={cn(
              'biome-tile group relative flex items-center gap-2 rounded-md border bg-input/20 p-2 sm:gap-3 sm:p-2.5 text-left transition-[background-color,border-color,transform] duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
              open ? 'hover:bg-muted' : 'cursor-not-allowed border-dashed border-border bg-background/30',
              selected && 'border-primary bg-primary/10',
            )}
            style={{ ['--tile' as string]: b.swatch }}
          >
            <BiomeEmblem biome={b.id} size={detailed ? 44 : 34} locked={!open} className={cn('shrink-0 transition-transform duration-300 group-hover:-translate-y-0.5', !detailed && 'size-7 min-[400px]:size-[34px]')} />
            <span className="min-w-0 flex-1">
              <span className={cn('block text-[13px] leading-snug font-semibold text-balance sm:text-sm', !open && 'text-foreground/90')}>{b.label}</span>
              {open ? (
                <span className="mt-1 flex items-center flex-wrap gap-x-1.5 text-xs text-muted-foreground">
                  <span className="hidden gap-0.5 min-[400px]:flex" aria-hidden>
                    {STAGE_AT.map((n, i) => (
                      <span key={n} className={cn('size-1.5 rounded-[1px]', i < stage ? 'bg-primary' : 'bg-border')} />
                    ))}
                  </span>
                  {detailed ? `${STAGE_LABELS[stage]} · ${here} ${sessionsWord(here)} здесь` : STAGE_LABELS[stage]}
                </span>
              ) : (
                <span className="mt-1 flex items-center gap-1 text-xs leading-snug text-muted-foreground">
                  <Lock className="size-3 shrink-0" aria-hidden /> ещё {left} {sessionsWord(left)}
                </span>
              )}
              {detailed && <span className="mt-1 block text-xs text-muted-foreground/90">{b.blurb}</span>}
            </span>
            {selected && <Check className="size-4 shrink-0 text-primary" aria-hidden />}
          </button>
        );
      })}
    </div>
  );
}
