import { ArrowLeft, Trash2 } from 'lucide-react';

type ServiceCategoryEditorScreenProps = {
  title: string;
  name: string;
  loading: boolean;
  canDelete: boolean;
  onBack: () => void;
  onNameChange: (value: string) => void;
  onSave: () => void;
  onDelete: () => void;
};

export function ServiceCategoryEditorScreen({
  title,
  name,
  loading,
  canDelete,
  onBack,
  onNameChange,
  onSave,
  onDelete,
}: ServiceCategoryEditorScreenProps) {
  return (
    <div className="pb-6 pt-4">
      <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
        <button type="button" onClick={onBack} className="rounded-lg p-2 text-ink">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="truncate text-[26px] font-extrabold text-ink">{title}</h1>
        <button
          type="button"
          onClick={onDelete}
          disabled={!canDelete || loading}
          className="rounded-lg p-2 text-[#e16647] disabled:opacity-40"
        >
          <Trash2 className="h-6 w-6" />
        </button>
      </div>

      <label className="block rounded-3xl border-[2px] border-line bg-screen px-4 py-3">
        <span className="mb-1 block text-[14px] font-semibold text-muted">Название категории услуг</span>
        <input
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          className="w-full bg-transparent text-[22px] font-medium text-ink outline-none"
        />
      </label>

      <button
        type="button"
        onClick={onSave}
        disabled={loading}
        className="mt-6 w-full rounded-3xl bg-accent py-4 text-[22px] font-extrabold text-[#222b33] disabled:opacity-50"
      >
        Сохранить
      </button>
    </div>
  );
}
