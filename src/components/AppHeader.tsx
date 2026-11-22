import { NavLink } from 'react-router-dom';
import { BarChart3, Info, LogOut, Settings2, Timer, UserRound } from 'lucide-react';
import { useAppState } from '@/AppStateContext';
import { Logo } from '@/components/Logo';
import { formatClock } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const LINKS = [
  { to: '/', label: 'Таймер', short: 'Таймер', icon: Timer },
  { to: '/settings', label: 'Настройки', short: 'Настройки', icon: Settings2 },
  { to: '/progress', label: 'Прогресс', short: 'Прогресс', icon: BarChart3 },
  { to: '/about', label: 'О приложении', short: 'Инфо', icon: Info },
];

function UserMenu() {
  const { user, actions, status } = useAppState();
  const initial = user.name.trim().charAt(0).toUpperCase() || 'И';
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="icon" aria-label={`Аккаунт: ${user.name}`} className="font-bold">
          {initial}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <div className="flex items-center gap-2">
            <UserRound className="size-4 text-muted-foreground" />
            <div className="min-w-0">
              <p className="truncate font-semibold">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={actions.logout}>
          <LogOut />
          Выйти
          {status === 'running' && <span className="ml-auto text-xs text-muted-foreground">сессия остановится</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppHeader() {
  const { status, remainingMs } = useAppState();
  const active = status === 'running' || status === 'paused';
  return (
    <>
      <header className="relative z-20 flex items-center justify-between gap-4 px-4 pt-4 sm:px-6 lg:px-8">
        <NavLink to="/" className="rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none" aria-label="Остров — на главный экран">
          <Logo />
        </NavLink>

        <nav aria-label="Основная навигация" className="panel hidden items-center gap-1 rounded-lg p-1 md:flex">
          {LINKS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) =>
                cn(
                  'flex h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                  isActive && 'bg-secondary text-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.08),inset_0_-2px_0_rgb(0_0_0/0.25)]',
                )
              }
            >
              <Icon className="size-4" />
              {label}
              {to === '/' && active && (
                <span className="ml-1 rounded-[3px] bg-primary/20 px-1.5 text-xs tabular-nums text-primary">{formatClock(remainingMs)}</span>
              )}
            </NavLink>
          ))}
        </nav>

        <UserMenu />
      </header>

      {/* мобильная навигация снизу: крупные цели под большой палец */}
      <nav
        aria-label="Основная навигация"
        className="panel fixed inset-x-2 bottom-2 z-30 grid grid-cols-4 gap-1 rounded-lg p-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] md:hidden"
      >
        {LINKS.map(({ to, short, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end
            aria-label={short}
            className={({ isActive }) =>
              cn(
                'flex h-13 flex-col items-center justify-center gap-1 rounded-md text-[11px] font-semibold text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                isActive && 'bg-secondary text-foreground',
              )
            }
          >
            <Icon className="size-5" />
            {to === '/' && active ? <span className="tabular-nums text-primary">{formatClock(remainingMs)}</span> : short}
          </NavLink>
        ))}
      </nav>
    </>
  );
}
