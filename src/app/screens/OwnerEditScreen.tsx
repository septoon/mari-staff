import type { Dispatch, SetStateAction } from 'react';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import type { OwnerDraft } from '../types';

type OwnerEditScreenProps = {
  draft: OwnerDraft;
  loading: boolean;
  onBack: () => void;
  onDraftChange: Dispatch<SetStateAction<OwnerDraft>>;
  onSave: () => void;
};

export function OwnerEditScreen({
  draft,
  loading,
  onBack,
  onDraftChange,
  onSave,
}: OwnerEditScreenProps) {
  return (
    <div className="pb-4 pt-4">
      <div className="mb-4 flex items-center justify-between">
        <button type="button" onClick={onBack} className="rounded-lg p-2 text-ink">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-[24px] font-extrabold text-ink">Владелец</h1>
        <div className="w-10" />
      </div>

      <section className="rounded-2xl border border-line bg-white p-4">
        <p className="text-[13px] font-semibold text-muted">
          Режим редактирования владельца
        </p>

        <div className="mt-3 space-y-2">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted">Имя</span>
            <input
              value={draft.name}
              onChange={(event) =>
                onDraftChange((prev) => ({ ...prev, name: event.target.value }))
              }
              className="w-full rounded-xl border border-line px-3 py-2 text-sm font-semibold text-ink outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted">Телефон</span>
            <input
              value={draft.phone}
              onChange={(event) =>
                onDraftChange((prev) => ({ ...prev, phone: event.target.value }))
              }
              className="w-full rounded-xl border border-line px-3 py-2 text-sm font-semibold text-ink outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted">Email</span>
            <input
              value={draft.email}
              onChange={(event) =>
                onDraftChange((prev) => ({ ...prev, email: event.target.value }))
              }
              className="w-full rounded-xl border border-line px-3 py-2 text-sm font-semibold text-ink outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted">Специализация</span>
            <input
              value={draft.positionName}
              onChange={(event) =>
                onDraftChange((prev) => ({ ...prev, positionName: event.target.value }))
              }
              className="w-full rounded-xl border border-line px-3 py-2 text-sm font-semibold text-ink outline-none"
            />
          </label>
        </div>

        <button
          type="button"
          onClick={onSave}
          disabled={loading}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-extrabold text-[#222b33] disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Сохранить
        </button>
      </section>
    </div>
  );
}
