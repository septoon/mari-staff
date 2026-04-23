import type { ReactNode } from 'react';

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="h-[var(--app-min-height)] min-h-screen overflow-hidden bg-shell px-0 py-0 md:p-6">
      <div className="relative mx-auto flex h-full min-h-0 w-full flex-col overflow-hidden bg-screen md:rounded-[34px] md:shadow-shell">
        {children}
      </div>
    </div>
  );
}
