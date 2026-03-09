import * as Switch from '@radix-ui/react-switch';
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
      className="mari-page-sheet--permissions"
      snapPoints={({ maxHeight }) => [
        Math.max(360, Math.min(maxHeight - 24, Math.round(maxHeight * 0.8))),
      ]}
      defaultSnap={({ snapPoints }) => snapPoints[0] ?? 0}
    >
      <section className="flex min-h-full flex-col overflow-hidden rounded-t-[30px] bg-screen">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h3 className="text-[29px] font-extrabold text-ink">Права доступа</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-[#e3e7ee] p-2 text-ink"
            aria-label="Закрыть"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="scrollbar-hidden flex-1 overflow-y-auto px-5 pb-8 pt-4">
          {Object.entries(grouped).map(([group, items]) => {
            if (items.length === 0) {
              return null;
            }
            return (
              <section key={group} className="mb-6">
                <h4 className="mb-3 text-[15px] font-semibold uppercase tracking-[0.04em] text-muted">
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
                        <div className="min-w-0 flex-1">
                          <p className="text-[17px] font-semibold leading-[1.2] text-ink">{item.title}</p>
                          <p className="mt-1 text-[13px] font-medium leading-[1.35] text-muted">
                            {item.description}
                          </p>
                        </div>
                        <Switch.Root
                          checked={isEnabled}
                          onCheckedChange={(checked) => onToggle(item.code, checked)}
                          disabled={isBusy}
                          className="relative mt-0.5 inline-flex h-[30px] w-[52px] shrink-0 cursor-pointer items-center rounded-full border border-transparent bg-[#d7dce5] p-0.5 shadow-[inset_0_1px_2px_rgba(15,23,42,0.08)] outline-none transition-[background-color,box-shadow] duration-200 data-[state=checked]:bg-accent focus-visible:ring-2 focus-visible:ring-[#f4c900]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f7f8fa] disabled:cursor-default disabled:opacity-70"
                        >
                          <Switch.Thumb
                            className="flex h-6 w-6 translate-x-0 items-center justify-center rounded-full bg-white shadow-[0_1px_4px_rgba(15,23,42,0.18)] transition-transform duration-200 will-change-transform data-[state=checked]:translate-x-5"
                          >
                            {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted" /> : null}
                          </Switch.Thumb>
                        </Switch.Root>
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
