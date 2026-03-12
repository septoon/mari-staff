import type { ReactNode } from 'react';

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-shell px-0 py-0 md:p-6">
      <div className="relative mx-auto flex min-h-screen w-full flex-col bg-screen md:min-h-[calc(var(--app-min-height)-3rem)] md:overflow-hidden md:rounded-[34px] md:shadow-shell">
        {children}
      </div>
    </div>
  );
}
