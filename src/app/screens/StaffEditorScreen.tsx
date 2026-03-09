import { useRef, type ChangeEvent, type Dispatch, type SetStateAction } from 'react';
import clsx from 'clsx';
import { ArrowLeft, ChevronDown, ChevronRight, Trash2, UserRound } from 'lucide-react';
import { buildRuPhoneValue, getRuPhoneLocalDigits, roleLabel } from '../helpers';
import type { StaffCreateRole, StaffDraft } from '../types';

type StaffEditorScreenProps = {
  mode: 'create' | 'edit';
  draft: StaffDraft;
  serviceCount: number;
  permissionSummary: string;
  hasAccess: boolean;
  canDelete: boolean;
  loading: boolean;
  onBack: () => void;
  onDraftChange: Dispatch<SetStateAction<StaffDraft>>;
  onAccessChange: (value: boolean) => void;
  onOpenServices: () => void;
  onOpenPermissions: () => void;
  onSave: () => void;
  onDelete: () => void;
  avatarUrl: string;
  canDeleteAvatar: boolean;
  onAvatarFilePick: (file: File) => void;
  onDeleteAvatar: () => void;
};

export function StaffEditorScreen({
  mode,
  draft,
  serviceCount,
  permissionSummary,
  hasAccess,
  canDelete,
  loading,
  onBack,
  onDraftChange,
  onAccessChange,
  onOpenServices,
  onOpenPermissions,
  onSave,
  onDelete,
  avatarUrl,
  canDeleteAvatar,
  onAvatarFilePick,
  onDeleteAvatar,
}: StaffEditorScreenProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const pickAvatar = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarFileChange = (event: ChangeEvent<HTMLInputElement>) => {
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
        <h1 className="text-[24px] font-extrabold text-ink">Сотрудник</h1>
        <button
          type="button"
          onClick={onDelete}
          disabled={!canDelete || loading}
          className="rounded-lg p-2 text-muted disabled:opacity-40"
        >
          <Trash2 className="h-6 w-6" />
        </button>
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
          className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-[#e3e0f8] text-[#9a97ec]"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="Фото сотрудника" className="h-full w-full object-cover" />
          ) : (
            <UserRound className="h-12 w-12" />
          )}
        </button>
        <button type="button" onClick={pickAvatar} className="mt-3 text-[20px] font-semibold text-muted">
          Изменить фото
        </button>
        {canDeleteAvatar ? (
          <button
            type="button"
            onClick={onDeleteAvatar}
            className="mt-1 text-[14px] font-semibold text-[#8a929f]"
          >
            Удалить аватар
          </button>
        ) : null}
      </div>

      <div className="space-y-4">
        <label className="block">
          <span className="mb-2 block text-[18px] font-medium text-muted">Имя</span>
          <input
            value={draft.name}
            onChange={(event) =>
              onDraftChange((prev) => ({ ...prev, name: event.target.value }))
            }
            className="w-full rounded-3xl border-[2px] border-line bg-screen px-6 py-4 text-[22px] font-medium text-ink outline-none"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-[18px] font-medium text-muted">Должность</span>
          <div className="relative">
            <select
              value={draft.role}
              onChange={(event) =>
                onDraftChange((prev) => ({
                  ...prev,
                  role: event.target.value as StaffCreateRole,
                }))
              }
              className="w-full appearance-none rounded-3xl border-[2px] border-line bg-screen px-6 py-4 text-[22px] font-medium text-ink outline-none"
            >
              <option value="MASTER">{roleLabel('MASTER')}</option>
              <option value="DEVELOPER">{roleLabel('DEVELOPER')}</option>
              <option value="SMM">{roleLabel('SMM')}</option>
              <option value="ADMIN">{roleLabel('ADMIN')}</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-5 top-1/2 h-6 w-6 -translate-y-1/2 text-muted" />
          </div>
        </label>

        <label className="block">
          <span className="mb-2 block text-[18px] font-medium text-muted">Специализация</span>
          <input
            value={draft.positionName}
            onChange={(event) =>
              onDraftChange((prev) => ({ ...prev, positionName: event.target.value }))
            }
            className="w-full rounded-3xl border-[2px] border-line bg-screen px-6 py-4 text-[22px] font-medium text-ink outline-none"
          />
        </label>

        <button
          type="button"
          onClick={onOpenServices}
          className="flex w-full items-center justify-between border-b border-line pb-4 pt-1 text-left"
        >
          <div>
            <p className="text-[22px] font-medium text-ink">Оказываемые услуги</p>
            <p className="text-[18px] font-medium text-muted">{serviceCount} услуг</p>
          </div>
          <ChevronRight className="h-7 w-7 text-muted" />
        </button>

        <button
          type="button"
          onClick={onOpenPermissions}
          className="flex w-full items-center justify-between border-b border-line pb-4 pt-1 text-left"
        >
          <div>
            <p className="text-[22px] font-medium text-ink">Права доступа</p>
            <p className="text-[18px] font-medium text-muted">{permissionSummary}</p>
          </div>
          <ChevronRight className="h-7 w-7 text-muted" />
        </button>

        <div className="flex items-center justify-between pt-1">
          <div>
            <p className="text-[22px] font-medium text-ink">Доступ к сервису</p>
            <p className="max-w-[260px] text-[16px] font-medium text-muted">
              Сотрудник сможет пользоваться системой в соответствии с установленной ролью
            </p>
          </div>
          <button
            type="button"
            onClick={() => onAccessChange(!hasAccess)}
            className={clsx(
              'relative h-10 w-20 rounded-full transition-colors',
              hasAccess ? 'bg-accent' : 'bg-[#d7dce5]',
            )}
          >
            <span
              className={clsx(
                'absolute top-1 h-8 w-8 rounded-full bg-white transition-transform',
                hasAccess ? 'left-[44px]' : 'left-1',
              )}
            />
          </button>
        </div>

        <label className="block">
          <span className="mb-2 block text-[18px] font-medium text-muted">Номер телефона</span>
          <div className="flex w-full items-center gap-3 rounded-3xl bg-[#e6e9ef] px-6 py-4">
            <span className="shrink-0 text-[22px] font-medium text-muted">+7</span>
            <input
              value={getRuPhoneLocalDigits(draft.phone)}
              onChange={(event) =>
                onDraftChange((prev) => ({ ...prev, phone: buildRuPhoneValue(event.target.value) }))
              }
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="tel-national"
              className="min-w-0 w-full bg-transparent text-[22px] font-medium text-muted outline-none"
            />
          </div>
        </label>

        <label className="block">
          <span className="mb-2 block text-[18px] font-medium text-muted">Email</span>
          <input
            value={draft.email}
            onChange={(event) =>
              onDraftChange((prev) => ({ ...prev, email: event.target.value }))
            }
            className="w-full rounded-3xl bg-[#e6e9ef] px-6 py-4 text-[22px] font-medium text-muted outline-none"
          />
        </label>

        {mode === 'edit' ? (
          <button
            type="button"
            onClick={onDelete}
            disabled={loading}
            className="mt-1 w-full rounded-3xl border-[2px] border-line py-4 text-[22px] font-medium text-ink"
          >
            Уволить сотрудника
          </button>
        ) : null}

        <button
          type="button"
          onClick={onSave}
          disabled={loading}
          className="mt-2 w-full rounded-3xl bg-[#f2df8f] py-4 text-[22px] font-bold text-[#7c8696] disabled:opacity-60"
        >
          {loading ? 'Сохранение...' : mode === 'create' ? 'Добавить' : 'Сохранить'}
        </button>
      </div>
    </div>
  );
}
