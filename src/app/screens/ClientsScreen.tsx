import { Loader2, MoreVertical, Phone, Plus, Search } from 'lucide-react';
import type { ClientItem } from '../types';

type ClientsScreenProps = {
  clients: ClientItem[];
  query: string;
  loading: boolean;
  onQueryChange: (value: string) => void;
  onReload: () => void;
  onAdd: () => void;
  onOpenClientActions: (client: ClientItem) => void;
};

export function ClientsScreen({
  clients,
  query,
  loading,
  onQueryChange,
  onReload,
  onAdd,
  onOpenClientActions,
}: ClientsScreenProps) {
  return (
    <div className="pb-2 pt-5">
      <div className="flex items-center justify-between pb-4">
        <h1 className="text-[50px] font-extrabold leading-none text-ink">Клиенты</h1>
        <div className="flex items-center gap-4 text-ink">
          <button type="button" onClick={onReload} className="rounded-lg p-1">
            <MoreVertical className="h-8 w-8" />
          </button>
          <button type="button" onClick={onAdd} className="rounded-lg p-1">
            <Plus className="h-8 w-8" strokeWidth={2.2} />
          </button>
        </div>
      </div>

      <div className="mb-2 border-b border-line pb-4">
        <label className="flex items-center gap-3 rounded-3xl border-[4px] border-[#dce0e7] px-5 py-3 text-muted">
          <Search className="h-7 w-7 text-[#97a0ad]" />
          <input
            type="text"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Поиск"
            className="w-full bg-transparent text-[24px] font-semibold text-muted outline-none placeholder:text-muted"
          />
        </label>
      </div>

      <ul>
        {clients.map((client) => (
          <li key={client.id} className="flex items-center justify-between border-b border-line py-5">
            <div className="space-y-2">
              <p className="text-[24px] font-extrabold leading-none text-ink">{client.name}</p>
              <div className="flex items-center gap-2 text-[20px] font-semibold text-muted">
                <Phone className="h-5 w-5" />
                <span>{client.phone || 'нет телефона'}</span>
              </div>
            </div>
            <button
              type="button"
              className="p-2 text-ink"
              onClick={() => onOpenClientActions(client)}
            >
              <MoreVertical className="h-7 w-7" />
            </button>
          </li>
        ))}
      </ul>

      {loading ? (
        <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Загружаю клиентов...
        </div>
      ) : null}
      {!loading && clients.length === 0 ? (
        <p className="mt-3 text-[18px] font-semibold text-muted">Ничего не найдено</p>
      ) : null}
    </div>
  );
}
