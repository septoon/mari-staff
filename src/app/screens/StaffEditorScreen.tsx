import * as Switch from '@radix-ui/react-switch';
import { useRef, type ChangeEvent, type Dispatch, type SetStateAction } from 'react';
import clsx from 'clsx';
import { ArrowLeft, ChevronDown, ChevronRight, Loader2, Trash2, UserRound } from 'lucide-react';
import { buildRuPhoneValue, getRuPhoneLocalDigits, roleLabel } from '../helpers';
import type { StaffCreateRole, StaffDraft, StaffPermissionCatalogItem } from '../types';

const DESKTOP_PANEL_CLASS =
  'rounded-[32px] border border-[#e2e6ed] bg-[#fcfcfd] p-6 shadow-[0_18px_40px_rgba(42,49,56,0.08)]';
const DESKTOP_INPUT_CLASS =
  'h-14 w-full rounded-2xl border border-[#dce2ea] bg-white px-4 text-base font-semibold text-ink outline-none transition placeholder:text-[#9aa2af] focus:border-[#b7c0cd]';
const PERMISSION_GROUP_TITLE: Record<StaffPermissionCatalogItem['group'], string> = {
  workspace: 'Разделы приложения',
  finance: 'Финансы',
  marketing: 'Маркетинг',
  content: 'Контент и медиа',
};

type StaffEditorScreenProps = {
  mode: 'create' | 'edit';
  draft: StaffDraft;
  serviceCount: number;
  permissionSummary: string;
  permissionCatalog: StaffPermissionCatalogItem[];
  permissionCodes: string[];
  permissionBusyCode: string | null;
  hasAccess: boolean;
  canDelete: boolean;
  loading: boolean;
  onBack: () => void;
  onDraftChange: Dispatch<SetStateAction<StaffDraft>>;
  onAccessChange: (value: boolean) => void;
  onOpenServices: () => void;
  onOpenPermissions: () => void;
  onTogglePermission: (code: string, enabled: boolean) => void;
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
  permissionCatalog,
  permissionCodes,
  permissionBusyCode,
  hasAccess,
  canDelete,
  loading,
  onBack,
  onDraftChange,
  onAccessChange,
  onOpenServices,
  onOpenPermissions,
  onTogglePermission,
  onSave,
  onDelete,
  avatarUrl,
  canDeleteAvatar,
  onAvatarFilePick,
  onDeleteAvatar,
}: StaffEditorScreenProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const enabledPermissions = new Set(permissionCodes);
  const groupedPermissionCatalog = permissionCatalog.reduce<
    Record<StaffPermissionCatalogItem['group'], StaffPermissionCatalogItem[]>
  >(
    (acc, item) => {
      acc[item.group].push(item);
      return acc;
    },
    { workspace: [], finance: [], marketing: [], content: [] },
  );

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
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleAvatarFileChange}
        className="hidden"
      />

      <div className="pb-6 pt-4 md:hidden">
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
            className="mt-2 w-full rounded-3xl bg-[#f4c900] py-4 text-[22px] font-bold text-black disabled:opacity-60"
          >
            {loading ? 'Сохранение...' : mode === 'create' ? 'Добавить' : 'Сохранить'}
          </button>
        </div>
      </div>

      <div className="hidden pb-6 md:block">
        <section className={DESKTOP_PANEL_CLASS}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8d95a1]">Команда</p>
              <h1 className="mt-3 text-[44px] font-extrabold leading-[0.94] tracking-[-0.04em] text-ink">
                {mode === 'create' ? 'Новый сотрудник' : draft.name || 'Карточка сотрудника'}
              </h1>
              <p className="mt-4 max-w-[760px] text-[15px] font-semibold leading-6 text-[#7c8491]">
                Настрой профиль, роль, контактные данные и доступ к сервису. Дополнительные
                права и услуги открываются из карточки.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onBack}
                className="inline-flex h-12 items-center gap-2 rounded-2xl border border-[#dde3eb] bg-[#f6f8fb] px-4 text-sm font-semibold text-ink"
              >
                <ArrowLeft className="h-4 w-4 text-[#8892a2]" />
                Назад
              </button>
              {canDelete ? (
                <button
                  type="button"
                  onClick={onDelete}
                  disabled={loading}
                  className="inline-flex h-12 items-center gap-2 rounded-2xl border border-[#f2d4d4] bg-white px-4 text-sm font-semibold text-[#a14d4d] disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" />
                  Уволить
                </button>
              ) : null}
              <button
                type="button"
                onClick={onSave}
                disabled={loading}
                className="inline-flex h-12 items-center gap-2 rounded-2xl bg-[#f4c900] px-5 text-sm font-extrabold text-[#222b33] shadow-[0_12px_26px_rgba(244,201,0,0.28)] disabled:opacity-60"
              >
                {mode === 'create' ? 'Добавить сотрудника' : 'Сохранить изменения'}
              </button>
            </div>
          </div>
        </section>

        <div className="mt-5 grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
          <div className="space-y-5">
            <section className={DESKTOP_PANEL_CLASS}>
              <div className="flex flex-col items-center text-center">
                <button
                  type="button"
                  onClick={pickAvatar}
                  className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full bg-[#e3e0f8] text-[#9a97ec]"
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Фото сотрудника" className="h-full w-full object-cover" />
                  ) : (
                    <UserRound className="h-14 w-14" />
                  )}
                </button>
                <p className="mt-5 text-[24px] font-extrabold text-ink">{draft.name || 'Без имени'}</p>
                <p className="mt-2 text-sm font-semibold text-[#7d8693]">
                  {draft.positionName || roleLabel(draft.role)}
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <span className="rounded-full bg-[#f4f6f9] px-3 py-2 text-sm font-bold text-ink">
                    {serviceCount} услуг
                  </span>
                  <span
                    className={clsx(
                      'rounded-full px-3 py-2 text-sm font-bold',
                      hasAccess ? 'bg-[#e4f4e8] text-[#267a45]' : 'bg-[#f4e6e6] text-[#a34f4f]',
                    )}
                  >
                    {hasAccess ? 'Доступ включен' : 'Доступ отключен'}
                  </span>
                </div>
                <div className="mt-5 flex w-full flex-col gap-3">
                  <button
                    type="button"
                    onClick={pickAvatar}
                    className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#dde3eb] bg-white px-4 text-sm font-semibold text-ink"
                  >
                    Изменить фото
                  </button>
                  {canDeleteAvatar ? (
                    <button
                      type="button"
                      onClick={onDeleteAvatar}
                      className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#dde3eb] bg-[#f6f8fb] px-4 text-sm font-semibold text-[#6f7784]"
                    >
                      Удалить аватар
                    </button>
                  ) : null}
                </div>
              </div>
            </section>

            <section className={DESKTOP_PANEL_CLASS}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8d95a1]">Доступ</p>
                  <p className="mt-3 text-[24px] font-extrabold text-ink">Аккаунт сотрудника</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-[#7c8491]">
                    Управляет входом в систему и набором доступных действий.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onAccessChange(!hasAccess)}
                  className={clsx(
                    'relative h-10 w-20 shrink-0 overflow-hidden rounded-full transition-colors',
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
            </section>

            <button
              type="button"
              onClick={onOpenServices}
              className={`${DESKTOP_PANEL_CLASS} block w-full text-left transition hover:border-[#f4c900]`}
            >
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8d95a1]">Услуги</p>
              <div className="mt-3 flex items-center justify-between gap-4">
                <div>
                  <p className="text-[24px] font-extrabold text-ink">Оказываемые услуги</p>
                  <p className="mt-2 text-sm font-semibold text-[#7d8693]">{serviceCount} услуг</p>
                </div>
                <ChevronRight className="h-5 w-5 text-[#9ca5b2]" />
              </div>
            </button>
          </div>

          <section className={DESKTOP_PANEL_CLASS}>
            <div className="grid gap-5 xl:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-bold uppercase tracking-[0.16em] text-[#8d95a1]">
                  Имя
                </span>
                <input
                  value={draft.name}
                  onChange={(event) =>
                    onDraftChange((prev) => ({ ...prev, name: event.target.value }))
                  }
                  className={DESKTOP_INPUT_CLASS}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold uppercase tracking-[0.16em] text-[#8d95a1]">
                  Должность
                </span>
                <div className="relative">
                  <select
                    value={draft.role}
                    onChange={(event) =>
                      onDraftChange((prev) => ({
                        ...prev,
                        role: event.target.value as StaffCreateRole,
                      }))
                    }
                    className={`${DESKTOP_INPUT_CLASS} appearance-none pr-11`}
                  >
                    <option value="MASTER">{roleLabel('MASTER')}</option>
                    <option value="DEVELOPER">{roleLabel('DEVELOPER')}</option>
                    <option value="SMM">{roleLabel('SMM')}</option>
                    <option value="ADMIN">{roleLabel('ADMIN')}</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8f97a3]" />
                </div>
              </label>

              <label className="block xl:col-span-2">
                <span className="mb-2 block text-sm font-bold uppercase tracking-[0.16em] text-[#8d95a1]">
                  Специализация
                </span>
                <input
                  value={draft.positionName}
                  onChange={(event) =>
                    onDraftChange((prev) => ({ ...prev, positionName: event.target.value }))
                  }
                  className={DESKTOP_INPUT_CLASS}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold uppercase tracking-[0.16em] text-[#8d95a1]">
                  Номер телефона
                </span>
                <div className="flex h-14 items-center gap-3 rounded-2xl border border-[#dce2ea] bg-white px-4">
                  <span className="shrink-0 text-base font-semibold text-[#717986]">+7</span>
                  <input
                    value={getRuPhoneLocalDigits(draft.phone)}
                    onChange={(event) =>
                      onDraftChange((prev) => ({ ...prev, phone: buildRuPhoneValue(event.target.value) }))
                    }
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="tel-national"
                    className="min-w-0 w-full bg-transparent text-base font-semibold text-ink outline-none"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold uppercase tracking-[0.16em] text-[#8d95a1]">
                  Email
                </span>
                <input
                  value={draft.email}
                  onChange={(event) =>
                    onDraftChange((prev) => ({ ...prev, email: event.target.value }))
                  }
                  className={DESKTOP_INPUT_CLASS}
                />
              </label>

              <div className="xl:col-span-2 rounded-[24px] border border-[#f0d98b] bg-[#fffdf3] px-5 py-4">
                <div className="min-w-0">
                  <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#8d95a1]">
                    Права доступа
                  </p>
                  <p className="mt-2 text-[24px] font-extrabold text-ink">Управление доступом</p>
                  <p className="mt-2 text-sm font-semibold text-[#7d8693]">
                    {mode === 'create'
                      ? 'Сначала сохраните сотрудника, затем настройте права доступа.'
                      : permissionSummary}
                  </p>
                </div>

                {mode === 'create' ? (
                  <div className="mt-5 rounded-2xl border border-dashed border-[#e1c96e] bg-white/70 px-4 py-4 text-sm font-semibold leading-6 text-[#7c8491]">
                    После создания сотрудника здесь появится список доступов с переключателями.
                  </div>
                ) : permissionCatalog.length === 0 ? (
                  <div className="mt-5 rounded-2xl border border-[#ece5be] bg-white/70 px-4 py-4 text-sm font-semibold leading-6 text-[#7c8491]">
                    Права загружаются...
                  </div>
                ) : (
                  <div className="mt-5 space-y-5">
                    {Object.entries(groupedPermissionCatalog).map(([group, items]) => {
                      if (items.length === 0) {
                        return null;
                      }

                      return (
                        <section key={group}>
                          <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[#8d95a1]">
                            {PERMISSION_GROUP_TITLE[group as StaffPermissionCatalogItem['group']]}
                          </p>
                          <div className="space-y-2">
                            {items.map((item) => {
                              const isEnabled = enabledPermissions.has(item.code);
                              const isBusy = permissionBusyCode === item.code;

                              return (
                                <div
                                  key={item.code}
                                  className="flex items-start justify-between gap-4 rounded-2xl border border-[#e7e1bc] bg-white px-4 py-3"
                                >
                                  <div className="min-w-0 flex-1">
                                    <p className="text-[16px] font-bold leading-6 text-ink">
                                      {item.title}
                                    </p>
                                    <p className="mt-1 text-[13px] font-medium leading-5 text-[#7c8491]">
                                      {item.description}
                                    </p>
                                  </div>
                                  <Switch.Root
                                    checked={isEnabled}
                                    onCheckedChange={(checked) => onTogglePermission(item.code, checked)}
                                    disabled={isBusy}
                                    className="relative mt-0.5 inline-flex h-[30px] w-[52px] shrink-0 cursor-pointer items-center rounded-full border border-transparent bg-[#d7dce5] p-0.5 shadow-[inset_0_1px_2px_rgba(15,23,42,0.08)] outline-none transition-[background-color,box-shadow] duration-200 data-[state=checked]:bg-accent focus-visible:ring-2 focus-visible:ring-[#f4c900]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-default disabled:opacity-70"
                                  >
                                    <Switch.Thumb className="flex h-6 w-6 translate-x-0 items-center justify-center rounded-full bg-white shadow-[0_1px_4px_rgba(15,23,42,0.18)] transition-transform duration-200 will-change-transform data-[state=checked]:translate-x-5">
                                      {isBusy ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted" />
                                      ) : null}
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
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
