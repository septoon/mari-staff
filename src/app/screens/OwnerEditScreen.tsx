import { useRef, type ChangeEvent, type Dispatch, type SetStateAction } from 'react';
import clsx from 'clsx';
import { ArrowLeft, Loader2, UserRound } from 'lucide-react';
import { PHOTO_CROP_ASPECTS, usePhotoCropper } from '../components/shared/PhotoCropperDialog';
import { buildRuPhoneValue, getRuPhoneLocalDigits } from '../helpers';
import type { OwnerDraft } from '../types';

const DESKTOP_PANEL_CLASS =
  'rounded-[32px] border border-[#e2e6ed] bg-[#fcfcfd] p-6 shadow-[0_18px_40px_rgba(42,49,56,0.08)]';
const DESKTOP_INPUT_CLASS =
  'h-14 w-full rounded-2xl border border-[#dce2ea] bg-white px-4 text-base font-semibold text-ink outline-none transition placeholder:text-[#9aa2af] focus:border-[#b7c0cd]';

type OwnerEditScreenProps = {
  draft: OwnerDraft;
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
  readOnly?: boolean;
  type?: 'text' | 'email' | 'phone';
  onChange: (value: string) => void;
};

function FieldRow({ label, value, canEdit, readOnly = false, type = 'text', onChange }: FieldRowProps) {
  if (!canEdit || readOnly) {
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
      {type === 'phone' ? (
        <div className="flex w-full items-center gap-3 rounded-3xl border-[2px] border-line bg-screen px-6 py-4">
          <span className="shrink-0 text-[22px] font-medium text-ink">+7</span>
          <input
            value={getRuPhoneLocalDigits(value)}
            onChange={(event) => onChange(buildRuPhoneValue(event.target.value))}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="tel-national"
            className="min-w-0 w-full bg-transparent text-[22px] font-medium text-ink outline-none"
          />
        </div>
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          type={type}
          className="w-full rounded-3xl border-[2px] border-line bg-screen px-6 py-4 text-[22px] font-medium text-ink outline-none"
        />
      )}
    </label>
  );
}

export function OwnerEditScreen({
  draft,
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
  const { openPhotoCropper, cropperDialog } = usePhotoCropper();

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
    openPhotoCropper(file, {
      title: 'Фото профиля',
      aspect: PHOTO_CROP_ASPECTS.square,
      onCrop: onAvatarFilePick,
    });
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
          <h1 className="text-[24px] font-extrabold text-ink">Профиль</h1>
          <div className="w-10" />
        </div>

        <div className="flex flex-col items-center pb-4 pt-2">
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
            type="phone"
            onChange={(value) => onDraftChange((prev) => ({ ...prev, phone: value }))}
          />
          <FieldRow
            label="Email"
            value={draft.email}
            canEdit={canEdit}
            type="email"
            onChange={(value) => onDraftChange((prev) => ({ ...prev, email: value }))}
          />
          <FieldRow
            label="Специализация"
            value={draft.positionName}
            canEdit={false}
            readOnly
            onChange={() => {}}
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

      <div className="hidden pb-6 pt-6 md:block">
        <section className={DESKTOP_PANEL_CLASS}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8d95a1]">Профиль</p>
              <h1 className="mt-3 text-[44px] font-extrabold leading-[0.94] tracking-[-0.04em] text-ink">
                {draft.name || 'Профиль'}
              </h1>
              <p className="mt-4 max-w-[760px] text-[15px] font-semibold leading-6 text-[#7c8491]">
                Здесь можно изменить только личные контактные данные и аватар.
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
              {canEdit ? (
                <button
                  type="button"
                  onClick={onSave}
                  disabled={loading}
                  className="inline-flex h-12 items-center gap-2 rounded-2xl bg-[#f4c900] px-5 text-sm font-extrabold text-[#222b33] shadow-[0_12px_26px_rgba(244,201,0,0.28)] disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Сохранение...
                    </>
                  ) : (
                    'Сохранить профиль'
                  )}
                </button>
              ) : null}
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
                  disabled={!canEdit}
                  className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full bg-[#e3e0f8] text-[#9a97ec] disabled:cursor-default"
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Фото профиля" className="h-full w-full object-cover" />
                  ) : (
                    <UserRound className="h-14 w-14" />
                  )}
                </button>
                <p className="mt-5 text-[24px] font-extrabold text-ink">{draft.name || 'Профиль'}</p>
                <p
                  className={clsx(
                    'mt-2 text-sm font-semibold',
                    canEdit ? 'text-[#2d8358]' : 'text-[#7d8693]',
                  )}
                >
                  {canEdit ? 'Редактирование доступно' : 'Только просмотр'}
                </p>
                <div className="mt-5 flex w-full flex-col gap-3">
                  {canEdit ? (
                    <button
                      type="button"
                      onClick={pickAvatar}
                      className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#dde3eb] bg-white px-4 text-sm font-semibold text-ink"
                    >
                      Изменить фото
                    </button>
                  ) : null}
                  {canEdit && canDeleteAvatar ? (
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
          </div>

          <section className={DESKTOP_PANEL_CLASS}>
            <div className="grid gap-5 xl:grid-cols-2">
              <div className="xl:col-span-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-bold uppercase tracking-[0.16em] text-[#8d95a1]">
                    Имя
                  </span>
                  {canEdit ? (
                    <input
                      value={draft.name}
                      onChange={(event) =>
                        onDraftChange((prev) => ({ ...prev, name: event.target.value }))
                      }
                      className={DESKTOP_INPUT_CLASS}
                    />
                  ) : (
                    <div className={`${DESKTOP_INPUT_CLASS} flex items-center bg-[#f6f8fb] text-[#5c6574]`}>
                      {draft.name.trim() || '—'}
                    </div>
                  )}
                </label>
              </div>

              <div>
                <label className="block">
                  <span className="mb-2 block text-sm font-bold uppercase tracking-[0.16em] text-[#8d95a1]">
                    Номер телефона
                  </span>
                  {canEdit ? (
                    <div className="flex h-14 items-center gap-3 rounded-2xl border border-[#dce2ea] bg-white px-4">
                      <span className="shrink-0 text-base font-semibold text-[#717986]">+7</span>
                      <input
                        value={getRuPhoneLocalDigits(draft.phone)}
                        onChange={(event) =>
                          onDraftChange((prev) => ({
                            ...prev,
                            phone: buildRuPhoneValue(event.target.value),
                          }))
                        }
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoComplete="tel-national"
                        className="min-w-0 w-full bg-transparent text-base font-semibold text-ink outline-none"
                      />
                    </div>
                  ) : (
                    <div className={`${DESKTOP_INPUT_CLASS} flex items-center bg-[#f6f8fb] text-[#5c6574]`}>
                      {draft.phone.trim() || '—'}
                    </div>
                  )}
                </label>
              </div>

              <div>
                <label className="block">
                  <span className="mb-2 block text-sm font-bold uppercase tracking-[0.16em] text-[#8d95a1]">
                    Email
                  </span>
                  {canEdit ? (
                    <input
                      value={draft.email}
                      onChange={(event) =>
                        onDraftChange((prev) => ({ ...prev, email: event.target.value }))
                      }
                      type="email"
                      className={DESKTOP_INPUT_CLASS}
                    />
                  ) : (
                    <div className={`${DESKTOP_INPUT_CLASS} flex items-center bg-[#f6f8fb] text-[#5c6574]`}>
                      {draft.email.trim() || '—'}
                    </div>
                  )}
                </label>
              </div>

              <div className="xl:col-span-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-bold uppercase tracking-[0.16em] text-[#8d95a1]">
                    Специализация
                  </span>
                  <div className={`${DESKTOP_INPUT_CLASS} flex items-center bg-[#f6f8fb] text-[#5c6574]`}>
                    {draft.positionName.trim() || '—'}
                  </div>
                </label>
              </div>
            </div>
          </section>
        </div>
      </div>
      {cropperDialog}
    </>
  );
}
