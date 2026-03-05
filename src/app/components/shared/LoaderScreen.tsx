import { Loader2 } from 'lucide-react';

export function LoaderScreen({ label }: { label: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-ink" />
        <p className="text-sm font-semibold text-muted">{label}</p>
      </div>
    </div>
  );
}
