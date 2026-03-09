import { Loader2 } from 'lucide-react';

type GlobalLoaderOverlayProps = {
  label?: string;
};

export function GlobalLoaderOverlay({ label = 'Загрузка...' }: GlobalLoaderOverlayProps) {
  return (
    <div className="fixed inset-0 z-[180] flex justify-center bg-[#0d172133]">
      <div className="relative w-full max-w-[430px]">
        <div className="absolute inset-0 flex items-center justify-center px-6">
          <div className="flex min-w-[132px] flex-col items-center gap-3 rounded-2xl bg-white/90 px-5 py-4 shadow-lg backdrop-blur-sm">
            <Loader2 className="h-8 w-8 animate-spin text-ink" />
            <p className="text-sm font-semibold text-muted">{label}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
