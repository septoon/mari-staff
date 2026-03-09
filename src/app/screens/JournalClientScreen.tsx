import type { Dispatch, SetStateAction } from 'react';
import { ArrowLeft, ChevronRight, Loader2 } from 'lucide-react';
import { formatHistoryDate, formatRub, formatTime } from '../helpers';
import type { AppointmentItem, ClientItem, JournalClientDraft } from '../types';

type JournalClientScreenProps = {
  client: ClientItem | null;
  draft: JournalClientDraft;
  appointments: AppointmentItem[];
  loading: boolean;
  saving: boolean;
  canEdit: boolean;
  onBack: () => void;
  onDraftChange: Dispatch<SetStateAction<JournalClientDraft>>;
  onSave: () => void;
  onOpenAppointment: (appointment: AppointmentItem) => void;
};

type FieldRowProps = {
  label: string;
  value: string;
  canEdit: boolean;
  placeholder?: string;
  onChange: (value: string) => void;
};

function FieldRow({ label, value, canEdit, placeholder, onChange }: FieldRowProps) {
  return (
    <label className="block border-b border-line px-4 py-3 last:border-b-0">
      <span className="block text-[16px] font-medium text-muted">{label}</span>
      <input
        value={value}
        readOnly={!canEdit}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full bg-transparent text-[24px] font-medium text-ink outline-none placeholder:text-[#a5adba]"
      />
    </label>
  );
}

function statusLabel(value: string) {
  if (value === 'ARRIVED') {
    return 'Пришёл';
  }
  if (value === 'NO_SHOW') {
    return 'Не пришёл';
  }
  if (value === 'CONFIRMED') {
    return 'Подтвердил';
  }
  if (value === 'CANCELLED') {
    return 'Отменён';
  }
  return 'Ожидание';
}

function appointmentAmount(item: AppointmentItem) {
  const value = item.amountAfterDiscount ?? item.amountBeforeDiscount;
  return value === null ? '—' : formatRub(value);
}

export function JournalClientScreen({
  client,
  draft,
  appointments,
  loading,
  saving,
  canEdit,
  onBack,
  onDraftChange,
  onSave,
  onOpenAppointment,
}: JournalClientScreenProps) {
  return (
    <div className="pb-6 pt-4">
      <div className="mb-4 flex items-center gap-3 border-b border-line pb-3">
        <button type="button" onClick={onBack} className="rounded-lg p-2 text-ink">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-[26px] font-extrabold text-ink">Клиент</h1>
      </div>

      <section className="overflow-hidden rounded-3xl border border-line bg-screen">
        <FieldRow
          label="Телефон"
          value={draft.phone}
          canEdit={canEdit}
          onChange={(value) => onDraftChange((prev) => ({ ...prev, phone: value }))}
        />
        <FieldRow
          label="Имя"
          value={draft.name}
          canEdit={canEdit}
          onChange={(value) => onDraftChange((prev) => ({ ...prev, name: value }))}
        />
        <FieldRow
          label="Email"
          value={draft.email}
          canEdit={canEdit}
          placeholder="example@email.com"
          onChange={(value) => onDraftChange((prev) => ({ ...prev, email: value }))}
        />
        <label className="block px-4 py-3">
          <span className="block text-[16px] font-medium text-muted">Комментарий</span>
          <textarea
            value={draft.comment}
            readOnly={!canEdit}
            onChange={(event) => onDraftChange((prev) => ({ ...prev, comment: event.target.value }))}
            placeholder="Примечание о клиенте"
            className="mt-1 h-24 w-full resize-none bg-transparent text-[20px] font-medium text-ink outline-none placeholder:text-[#a5adba]"
          />
        </label>
      </section>

      {canEdit ? (
        <button
          type="button"
          onClick={onSave}
          disabled={saving || loading || !client}
          className="mt-4 w-full rounded-3xl bg-accent py-4 text-[22px] font-extrabold text-[#222b33] disabled:opacity-60"
        >
          {saving ? 'Сохраняю...' : 'Продолжить'}
        </button>
      ) : null}

      <section className="mt-6 space-y-3">
        <h2 className="text-[24px] font-extrabold text-ink">История посещений</h2>
        {loading ? (
          <div className="flex items-center gap-2 text-[14px] font-semibold text-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            Загружаю историю...
          </div>
        ) : null}
        {!loading && appointments.length === 0 ? (
          <p className="text-[16px] font-semibold text-muted">Нет посещений</p>
        ) : null}

        <div className="space-y-3">
          {appointments.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onOpenAppointment(item)}
              className="w-full rounded-2xl border border-line bg-screen p-4 text-left"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[16px] font-semibold text-muted">{formatHistoryDate(item.startAt)}</p>
                  <p className="text-[22px] font-semibold text-ink">{item.serviceName}</p>
                  <p className="mt-1 text-[16px] font-medium text-muted">
                    {`${formatTime(item.startAt)}-${formatTime(item.endAt)} · ${item.staffName}`}
                  </p>
                  <p className="mt-1 text-[16px] font-medium text-[#59616e]">{statusLabel(item.status)}</p>
                </div>
                <div className="flex items-center gap-2 text-[#8c95a3]">
                  <span className="text-[20px] font-semibold">{appointmentAmount(item)}</span>
                  <ChevronRight className="h-5 w-5" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
