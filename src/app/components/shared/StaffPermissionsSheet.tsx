import { Loader2, X } from 'lucide-react';
import type { StaffPermissionCatalogItem } from '../../types';
import { PageSheet } from './PageSheet';

type StaffPermissionsSheetProps = {
  open: boolean;
  catalog: StaffPermissionCatalogItem[];
  enabledCodes: string[];
  busyCode: string | null;
  onClose: () => void;
  onToggle: (code: string, enabled: boolean) => void;
};

const GROUP_TITLE: Record<StaffPermissionCatalogItem['group'], string> = {
  workspace: 'Разделы приложения',
  finance: 'Финансы',
  marketing: 'Маркетинг',
  content: 'Контент и медиа',
};

export function StaffPermissionsSheet({
  open,
  catalog,
  enabledCodes,
  busyCode,
  onClose,
  onToggle,
}: StaffPermissionsSheetProps) {
  if (!open) {
    return null;
  }

  const enabled = new Set(enabledCodes);
  const grouped = catalog.reduce<Record<StaffPermissionCatalogItem['group'], StaffPermissionCatalogItem[]>>(
    (acc, item) => {
      acc[item.group].push(item);
      return acc;
    },
    { workspace: [], finance: [], marketing: [], content: [] },
  );

  return (
    <PageSheet
      open={open}
      onDismiss={onClose}
      snapPoints={({ maxHeight }) => [Math.min(540, maxHeight), Math.min(760, maxHeight)]}
      defaultSnap={({ snapPoints }) => snapPoints[snapPoints.length - 1] ?? snapPoints[0] ?? 0}
    >
      <section className="max-h-[78vh] overflow-hidden rounded-t-[30px] bg-screen">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h3 className="text-[30px] font-extrabold text-ink">Права доступа</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-[#e3e7ee] p-2 text-ink"
            aria-label="Закрыть"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="scrollbar-hidden max-h-[calc(78vh-86px)] overflow-y-auto px-5 pb-8 pt-4">
          {Object.entries(grouped).map(([group, items]) => {
            if (items.length === 0) {
              return null;
            }
            return (
              <section key={group} className="mb-6">
                <h4 className="mb-3 text-[16px] font-semibold uppercase tracking-[0.04em] text-muted">
                  {GROUP_TITLE[group as StaffPermissionCatalogItem['group']]}
                </h4>
                <div className="space-y-2">
                  {items.map((item) => {
                    const isEnabled = enabled.has(item.code);
                    const isBusy = busyCode === item.code;
                    return (
                      <div
                        key={item.code}
                        className="flex items-start justify-between gap-3 rounded-2xl border border-line bg-[#f7f8fa] px-4 py-3"
                      >
                        <div>
                          <p className="text-[18px] font-semibold leading-[1.2] text-ink">{item.title}</p>
                          <p className="mt-1 text-[14px] font-medium leading-[1.35] text-muted">
                            {item.description}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onToggle(item.code, !isEnabled)}
                          disabled={isBusy}
                          className={`relative mt-1 h-8 w-14 rounded-full transition-colors ${
                            isEnabled ? 'bg-accent' : 'bg-[#d7dce5]'
                          } ${isBusy ? 'opacity-70' : ''}`}
                        >
                          <span
                            className={`absolute top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white transition-transform ${
                              isEnabled ? 'left-7' : 'left-1'
                            }`}
                          >
                            {isBusy ? <Loader2 className="h-4 w-4 animate-spin text-muted" /> : null}
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </section>
    </PageSheet>
  );
}
