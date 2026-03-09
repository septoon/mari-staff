import { useRef, type ChangeEvent, type Dispatch, type SetStateAction } from 'react';
import clsx from 'clsx';
import { ArrowLeft, Loader2, UserRound } from 'lucide-react';
import { roleLabel } from '../helpers';
import type { OwnerDraft, StaffRole } from '../types';

type OwnerEditScreenProps = {
  draft: OwnerDraft;
  role: StaffRole;
  canEdit: boolean;
  loading: boolean;
  avatarUrl: string;
  canDeleteAvatar: boolean;
  onBack: () => void;
  onDraftChange: Dispatch<SetStateAction<OwnerDraft>>;
  onSave: () => void;
  onAvatarFilePick: (file: File) => void;
  onDeleteAvatar: () => void;
};

type FieldRowProps = {
  label: string;
  value: string;
  canEdit: boolean;
  onChange: (value: string) => void;
};

function FieldRow({ label, value, canEdit, onChange }: FieldRowProps) {
  if (!canEdit) {
    return (
      <div>
        <span className="mb-2 block text-[18px] font-medium text-muted">{label}</span>
        <div className="w-full rounded-3xl bg-[#e6e9ef] px-6 py-4 text-[22px] font-medium text-ink">
          {value.trim() || '—'}
        </div>
      </div>
    );
  }

  return (
    <label className="block">
      <span className="mb-2 block text-[18px] font-medium text-muted">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-3xl border-[2px] border-line bg-screen px-6 py-4 text-[22px] font-medium text-ink outline-none"
      />
    </label>
  );
}

export function OwnerEditScreen({
  draft,
  role,
  canEdit,
  loading,
  avatarUrl,
  canDeleteAvatar,
  onBack,
  onDraftChange,
  onSave,
  onAvatarFilePick,
  onDeleteAvatar,
}: OwnerEditScreenProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const pickAvatar = () => {
    if (!canEdit) {
      return;
    }
    fileInputRef.current?.click();
  };

  const handleAvatarFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!canEdit) {
      return;
    }
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    onAvatarFilePick(file);
    event.target.value = '';
  };

  return (
    <div className="pb-6 pt-4">
      <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
        <button type="button" onClick={onBack} className="rounded-lg p-2 text-ink">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-[24px] font-extrabold text-ink">Профиль</h1>
        <div className="w-10" />
      </div>

      <div className="flex flex-col items-center pb-4 pt-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleAvatarFileChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={pickAvatar}
          disabled={!canEdit}
          className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-[#e3e0f8] text-[#9a97ec] disabled:cursor-default"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="Фото профиля" className="h-full w-full object-cover" />
          ) : (
            <UserRound className="h-12 w-12" />
          )}
        </button>
        {canEdit ? (
          <button type="button" onClick={pickAvatar} className="mt-3 text-[20px] font-semibold text-muted">
            Изменить фото
          </button>
        ) : null}
        {canEdit && canDeleteAvatar ? (
          <button
            type="button"
            onClick={onDeleteAvatar}
            className="mt-1 text-[14px] font-semibold text-[#8a929f]"
          >
            Удалить аватар
          </button>
        ) : null}
        <p className="mt-3 text-[22px] font-semibold text-ink">{draft.name || 'Профиль'}</p>
        <p className="mt-1 text-[16px] font-medium text-muted">{roleLabel(role)}</p>
        <p
          className={clsx(
            'mt-1 text-[14px] font-semibold',
            canEdit ? 'text-[#2d8358]' : 'text-muted',
          )}
        >
          {canEdit ? 'Редактирование доступно' : 'Только просмотр'}
        </p>
      </div>

      <div className="space-y-4">
        <FieldRow
          label="Имя"
          value={draft.name}
          canEdit={canEdit}
          onChange={(value) => onDraftChange((prev) => ({ ...prev, name: value }))}
        />
        <FieldRow
          label="Номер телефона"
          value={draft.phone}
          canEdit={canEdit}
          onChange={(value) => onDraftChange((prev) => ({ ...prev, phone: value }))}
        />
        <FieldRow
          label="Email"
          value={draft.email}
          canEdit={canEdit}
          onChange={(value) => onDraftChange((prev) => ({ ...prev, email: value }))}
        />
        <FieldRow
          label="Специализация"
          value={draft.positionName}
          canEdit={canEdit}
          onChange={(value) => onDraftChange((prev) => ({ ...prev, positionName: value }))}
        />

        {canEdit ? (
          <button
            type="button"
            onClick={onSave}
            disabled={loading}
            className="mt-2 w-full rounded-3xl bg-[#f2df8f] py-4 text-[22px] font-bold text-[#7c8696] disabled:opacity-60"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Сохранение...
              </span>
            ) : (
              'Сохранить'
            )}
          </button>
        ) : null}
      </div>
    </div>
  );
}
