import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { Search, X } from 'lucide-react';
import type { ClientItem } from '../../types';
import { PageSheet } from './PageSheet';

type ClientsExportSheetProps = {
  open: boolean;
  clients: ClientItem[];
  loading?: boolean;
  onClose: () => void;
  onExport: (clients: ClientItem[]) => Promise<void> | void;
};

export function ClientsExportSheet({
  open,
  clients,
  loading = false,
  onClose,
  onExport,
}: ClientsExportSheetProps) {
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setSearch('');
    setSelectedIds([]);
  }, [open]);

  const normalizedQuery = search.trim().toLowerCase();
  const normalizedDigits = search.replace(/\D/g, '');

  const filteredClients = useMemo(() => {
    if (!normalizedQuery) {
      return clients;
    }
    return clients.filter((item) => {
      const name = item.name.toLowerCase();
      const phone = item.phone.toLowerCase();
      const phoneDigits = item.phone.replace(/\D/g, '');
      return (
        name.includes(normalizedQuery) ||
        phone.includes(normalizedQuery) ||
        (normalizedDigits.length > 0 && phoneDigits.includes(normalizedDigits))
      );
    });
  }, [clients, normalizedDigits, normalizedQuery]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allFilteredSelected =
    filteredClients.length > 0 &&
    filteredClients.every((item) => selectedSet.has(item.id));

  const toggleOne = (clientId: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(clientId)) {
        return prev.filter((id) => id !== clientId);
      }
      return [...prev, clientId];
    });
  };

  const toggleAllFiltered = () => {
    setSelectedIds((prev) => {
      const prevSet = new Set(prev);
      if (allFilteredSelected) {
        return prev.filter((id) => !filteredClients.some((client) => client.id === id));
      }
      filteredClients.forEach((client) => prevSet.add(client.id));
      return Array.from(prevSet);
    });
  };

  const selectedClients = useMemo(
    () => clients.filter((item) => selectedSet.has(item.id)),
    [clients, selectedSet],
  );

  if (!open) {
    return null;
  }

  return (
    <PageSheet
      open={open}
      onDismiss={onClose}
      snapPoints={({ maxHeight }) => [Math.min(maxHeight - 12, maxHeight)]}
      defaultSnap={({ snapPoints }) => snapPoints[snapPoints.length - 1] ?? snapPoints[0] ?? 0}
      maxHeight={typeof window !== 'undefined' ? window.innerHeight - 8 : undefined}
      className="mari-page-sheet--calendar"
    >
      <section className="bg-screen">
        <div className="flex items-center justify-between px-4 pb-3 pt-1">
          <h2 className="text-[56px] font-extrabold leading-none text-ink">
            <span className="text-[52%]">Экспортировать</span>
          </h2>
          <button type="button" onClick={onClose} className="rounded-full bg-[#e3e7ee] p-2 text-ink">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="px-4 pb-3">
          <label className="flex items-center gap-3 rounded-3xl border-[3px] border-line bg-screen px-4 py-3 text-muted">
            <Search className="h-6 w-6 text-[#97a0ad]" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Номер телефона или email"
              className="w-full bg-transparent text-[18px] font-semibold text-ink outline-none placeholder:text-[#97a0ad]"
            />
          </label>
        </div>

        <button
          type="button"
          onClick={toggleAllFiltered}
          className="flex w-full items-center justify-between border-t border-line px-4 py-4 text-left"
        >
          <span className="text-[20px] font-semibold text-ink">Выбрать все</span>
          <span
            className={clsx(
              'inline-flex h-10 w-10 items-center justify-center rounded-[14px] border-2',
              allFilteredSelected
                ? 'border-accent bg-accent'
                : 'border-[#d0d5de] bg-transparent',
            )}
          >
            {allFilteredSelected ? <span className="text-xl leading-none text-[#222b33]">✓</span> : null}
          </span>
        </button>

        <ul className="max-h-[48dvh] overflow-y-auto border-t border-line">
          {filteredClients.map((client) => {
            const selected = selectedSet.has(client.id);
            return (
              <li key={client.id}>
                <button
                  type="button"
                  onClick={() => toggleOne(client.id)}
                  className="flex w-full items-center justify-between border-b border-line px-4 py-4 text-left"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[18px] font-semibold text-ink">
                      {client.name}
                    </span>
                    <span className="mt-0.5 block truncate text-[16px] font-medium text-muted">
                      {client.phone || 'нет телефона'}
                    </span>
                  </span>
                  <span
                    className={clsx(
                      'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border-2',
                      selected ? 'border-accent bg-accent' : 'border-[#d0d5de] bg-transparent',
                    )}
                  >
                    {selected ? <span className="text-xl leading-none text-[#222b33]">✓</span> : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="px-4 py-4">
          <button
            type="button"
            disabled={loading || selectedClients.length === 0}
            onClick={() => void onExport(selectedClients)}
            className="w-full rounded-[24px] bg-accent py-4 text-[22px] font-extrabold text-[#222b33] disabled:opacity-50"
          >
            {loading ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </section>
    </PageSheet>
  );
}
