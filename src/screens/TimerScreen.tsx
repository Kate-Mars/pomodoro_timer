import { TimerPanel } from '@/components/TimerPanel';

export function TimerScreen() {
  return (
    <div className="relative flex min-h-[calc(100dvh-64px)] flex-col justify-end px-3 pt-[clamp(216px,34dvh,286px)] pb-[88px] lg:pt-0 sm:px-6 md:pb-6 lg:justify-center lg:px-8 lg:pb-8">
      <h1 className="sr-only">Таймер и остров</h1>
      <div className="w-full max-w-[420px] self-center lg:self-start">
        <TimerPanel />
      </div>
    </div>
  );
}
