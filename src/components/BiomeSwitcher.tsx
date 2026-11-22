import { ChevronDown, Lock } from 'lucide-react';
import { useAppState } from '@/AppStateContext';
import { BIOMES, biomeDef } from '@/lib/biomes';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { BiomeEmblem } from './BiomeEmblem';

/** Быстрая смена атмосферы прямо из панели таймера — сессию это не прерывает. */
export function BiomeSwitcher() {
  const { biome, unlocked, stats, actions } = useAppState();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex min-w-0 items-center gap-1 rounded-md px-1 py-1 text-xs text-foreground/90 sm:gap-1.5 sm:px-1.5 transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none" aria-label={`Биом: ${biomeDef(biome).label}. Сменить`}>
        <BiomeEmblem biome={biome} size={18} />
        <span className="min-w-0 max-w-[10rem] text-left leading-tight">{biomeDef(biome).label}</span>
        <ChevronDown className="size-3.5 shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="pixel-label text-muted-foreground">Куда отправимся?</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {BIOMES.map((b) => {
          const open = unlocked.includes(b.id);
          return (
            <DropdownMenuItem key={b.id} disabled={!open} onSelect={() => open && actions.setBiome(b.id)} className="gap-2.5">
              <BiomeEmblem biome={b.id} size={22} locked={!open} />
              <span className="flex-1">{b.label}</span>
              {!open && (
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Lock className="size-3" />
                  {b.unlockAt - stats.completed}
                </span>
              )}
              {b.id === biome && <span className="size-1.5 rounded-full bg-primary" aria-hidden />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
