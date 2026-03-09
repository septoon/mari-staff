import { ArrowLeft, MessageCircle, MessageSquare, PhoneCall } from 'lucide-react';
import { formatDateLabel, formatRub, formatTime } from '../helpers';
import type { AppointmentItem } from '../types';

type AppointmentStatus = 'PENDING' | 'ARRIVED' | 'NO_SHOW' | 'CONFIRMED';

type JournalAppointmentScreenProps = {
  appointment: AppointmentItem | null;
  loading: boolean;
  canEdit: boolean;
  visitsCount: number;
  noShowCount: number;
  onBack: () => void;
  onStatusChange: (status: AppointmentStatus) => void;
  onOpenClient: () => void;
  onCall: () => void;
  onSms: () => void;
  onWhatsApp: () => void;
};

const STATUS_ITEMS: Array<{ value: AppointmentStatus; label: string }> = [
  { value: 'PENDING', label: 'Ожидание' },
  { value: 'ARRIVED', label: 'Пришёл' },
  { value: 'NO_SHOW', label: 'Не пришёл' },
  { value: 'CONFIRMED', label: 'Подтвердил' },
];

function AppointmentAmount({ appointment }: { appointment: AppointmentItem }) {
  const value = appointment.amountAfterDiscount ?? appointment.amountBeforeDiscount;
  if (value === null) {
    return <span className="text-[28px] font-semibold text-muted">—</span>;
  }
  return <span className="text-[40px] font-bold text-ink">{formatRub(value)}</span>;
}

export function JournalAppointmentScreen({
  appointment,
  loading,
  canEdit,
  visitsCount,
  noShowCount,
  onBack,
  onStatusChange,
  onOpenClient,
  onCall,
  onSms,
  onWhatsApp,
}: JournalAppointmentScreenProps) {
  if (!appointment) {
    return (
      <div className="pb-6 pt-4">
        <div className="mb-4 flex items-center gap-3 border-b border-line pb-3">
          <button type="button" onClick={onBack} className="rounded-lg p-2 text-ink">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-[26px] font-extrabold text-ink">Запись</h1>
        </div>
        <p className="text-[18px] font-medium text-muted">Запись не выбрана</p>
      </div>
    );
  }

  const totalLabel = formatDateLabel(appointment.startAt);
  const activeStatus =
    appointment.status === 'ARRIVED' ||
    appointment.status === 'NO_SHOW' ||
    appointment.status === 'CONFIRMED'
      ? (appointment.status as AppointmentStatus)
      : 'PENDING';

  return (
    <div className="pb-6 pt-4">
      <div className="mb-4 flex items-center gap-3 border-b border-line pb-3">
        <button type="button" onClick={onBack} className="rounded-lg p-2 text-ink">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-[26px] font-extrabold text-ink">{`${totalLabel} ${appointment.startAt.getFullYear()}`}</h1>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[#e6e9ef] p-1">
        {STATUS_ITEMS.map((item) => {
          const active = item.value === activeStatus;
          return (
            <button
              key={item.value}
              type="button"
              disabled={loading || !canEdit}
              onClick={() => onStatusChange(item.value)}
              className={
                active
                  ? 'rounded-xl bg-[#222b33] px-3 py-2 text-[16px] font-semibold text-[#f6c400]'
                  : 'rounded-xl px-3 py-2 text-[16px] font-semibold text-ink disabled:opacity-60'
              }
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={onOpenClient}
            className="text-left text-[42px] font-extrabold leading-none text-ink"
          >
            <span className="text-[52%]">{appointment.clientName || 'Клиент'}</span>
          </button>
          <p className="mt-1 text-[20px] font-medium text-muted">{appointment.clientPhone || 'нет телефона'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onCall} className="rounded-xl bg-[#e6e9ef] p-3 text-ink">
            <PhoneCall className="h-6 w-6" />
          </button>
          <button type="button" onClick={onSms} className="rounded-xl bg-[#e6e9ef] p-3 text-ink">
            <MessageSquare className="h-6 w-6" />
          </button>
          <button type="button" onClick={onWhatsApp} className="rounded-xl bg-[#e6e9ef] p-3 text-ink">
            <MessageCircle className="h-6 w-6" />
          </button>
        </div>
      </div>

      <p className="mt-5 text-[20px] font-medium text-ink">{`Визитов: ${visitsCount} (${noShowCount} неявок)`}</p>

      <div className="mt-4 rounded-3xl border border-line bg-screen p-4">
        <p className="text-[16px] font-medium text-muted">Примечание о клиенте</p>
        <p className="mt-2 text-[18px] font-medium text-[#8f97a5]">Добавьте примечание в карточке клиента</p>
      </div>

      <div className="mt-5 rounded-3xl border border-line bg-screen p-4">
        <div className="flex items-center justify-between">
          <p className="text-[20px] font-semibold text-ink">{appointment.staffName}</p>
          <p className="text-[18px] font-semibold text-muted">{`${formatTime(appointment.startAt)}-${formatTime(appointment.endAt)}`}</p>
        </div>
        <div className="mt-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[28px] font-semibold leading-tight text-ink">{appointment.serviceName || 'Услуга'}</p>
            <p className="mt-2 text-[16px] font-medium text-muted">Статус оплаты уточняется</p>
          </div>
          <AppointmentAmount appointment={appointment} />
        </div>
      </div>

      <div className="mt-5 rounded-3xl border border-line bg-screen p-4">
        <p className="text-[34px] font-bold text-ink">К оплате</p>
        <div className="mt-2">
          <AppointmentAmount appointment={appointment} />
        </div>
      </div>

      {loading ? (
        <p className="mt-3 text-[15px] font-semibold text-muted">Сохраняю изменения...</p>
      ) : null}
    </div>
  );
}
