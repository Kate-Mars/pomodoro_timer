import { useEffect, useId, useState } from 'react';
import { MAX_DURATION_MINUTES, MIN_DURATION_MINUTES } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const PRESETS = [15, 25, 50];

type Props = {
  value: number;
  disabled: boolean;
  onChange: (minutes: number) => void;
};

export function DurationControl({ value, disabled, onChange }: Props) {
  const descriptionId = useId();
  const [draft, setDraft] = useState(String(value));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(String(value));
    setError(null);
  }, [value]);

  const commit = (raw: string) => {
    const trimmed = raw.trim();
    const n = Number(trimmed);
    if (!trimmed || !Number.isInteger(n) || n < MIN_DURATION_MINUTES || n > MAX_DURATION_MINUTES) {
      setError(`Целое число от ${MIN_DURATION_MINUTES} до ${MAX_DURATION_MINUTES}`);
      setDraft(String(value));
      return;
    }
    setError(null);
    if (n !== value) onChange(n);
  };

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Длительность сессии" aria-describedby={disabled || error ? descriptionId : undefined}>
        {PRESETS.map((m) => (
          <Button
            key={m}
            type="button"
            size="sm"
            variant={value === m ? 'secondary' : 'outline'}
            aria-pressed={value === m}
            disabled={disabled}
            onClick={() => onChange(m)}
            className={cn('h-10 w-10 tabular-nums disabled:opacity-75 sm:w-12', value === m && 'text-primary')}
          >
            {m}
          </Button>
        ))}
        <label className="ml-1 flex items-center gap-2 text-sm text-muted-foreground">
          <span className="sr-only sm:not-sr-only">Своё</span>
          <Input
            inputMode="numeric"
            aria-label="Своя длительность в минутах"
            aria-invalid={!!error}
            aria-describedby={disabled || error ? descriptionId : undefined}
            disabled={disabled}
            value={draft}
            onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, '').slice(0, 3))}
            onBlur={(e) => commit(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit((e.target as HTMLInputElement).value);
            }}
            className="h-10 w-14 text-center tabular-nums disabled:opacity-75 sm:w-16"
          />
          мин
        </label>
      </div>
      <div className="min-h-4 text-xs">
        {error ? (
          <p id={descriptionId} role="alert" className="font-medium text-destructive">{error}</p>
        ) : disabled ? (
          <p id={descriptionId} className="text-muted-foreground">Меняется после завершения или сброса сессии.</p>
        ) : null}
      </div>
    </div>
  );
}
