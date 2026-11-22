import type { ReactNode } from 'react';

export function PageShell({ title, lead, children }: { title: string; lead?: string; children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-3xl px-3 pt-6 pb-[96px] sm:px-6 md:pb-12">
      <header className="mb-6 px-1">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
        {lead && <p className="mt-1 text-sm text-muted-foreground">{lead}</p>}
      </header>
      <div className="grid gap-4">{children}</div>
    </div>
  );
}

/** Секция страницы. `bare` — без собственной панели: для групп секций внутри одной общей панели. */
export function Section({ title, description, children, bare = false, id }: { title: string; description?: string; children: ReactNode; bare?: boolean; id?: string }) {
  return (
    <section id={id} tabIndex={id ? -1 : undefined} aria-label={id ? title : undefined}
      className={bare ? 'p-4 sm:p-6' : 'panel scroll-mt-5 rounded-lg p-4 focus-visible:ring-2 focus-visible:ring-ring sm:p-6'}>
      <h2 className="pixel-label text-muted-foreground">{title}</h2>
      {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-4 grid gap-5">{children}</div>
    </section>
  );
}

export function Row({ label, hint, htmlFor, children }: { label: string; hint?: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <label htmlFor={htmlFor} className="text-sm font-semibold">
          {label}
        </label>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
