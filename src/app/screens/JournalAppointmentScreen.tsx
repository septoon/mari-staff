import clsx from 'clsx';
import { useEffect, useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Clock3,
  Copy,
  CreditCard,
  History,
  List,
  Loader2,
  MessageCircle,
  MessageSquare,
  MoreHorizontal,
  Package2,
  Paperclip,
  Pencil,
  PhoneCall,
  Repeat2,
  Square,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import {
  formatAppointmentPrice,
  formatDateLabel,
  formatHistoryDate,
  formatRub,
  formatTime,
} from '../helpers';
import type { AppointmentItem, ClientItem, JournalClientDraft, StaffItem } from '../types';

type AppointmentStatus = 'PENDING' | 'ARRIVED' | 'NO_SHOW' | 'CONFIRMED';

type JournalAppointmentScreenProps = {
  appointment: AppointmentItem | null;
  client: ClientItem | null;
  clientDraft: JournalClientDraft;
  staff: StaffItem[];
  history: AppointmentItem[];
  historyLoading: boolean;
  historyOpen: boolean;
  loading: boolean;
  canEdit: boolean;
  canOpenClient: boolean;
  canViewClientPhone: boolean;
  visitsCount: number;
  noShowCount: number;
  onBack: () => void;
  onCloseHistory: () => void;
  onStatusChange: (status: AppointmentStatus) => void;
  onOpenClient: () => void;
  onOpenAppointment: (appointment: AppointmentItem) => void;
  onCall: () => void;
  onSms: () => void;
  onWhatsApp: () => void;
  onDelete: () => void;
};

type DesktopAppointmentDraft = {
  staffId: string;
  dateValue: string;
  startTime: string;
  endTime: string;
  durationMin: number;
  technicalBreaks: string[];
  comment: string;
};

const STATUS_ITEMS: Array<{
  value: AppointmentStatus;
  label: string;
  activeClassName: string;
}> = [
  {
    value: 'PENDING',
    label: 'Ожидание',
    activeClassName:
      'border-[#434850] bg-[#434850] text-white shadow-[0_10px_24px_rgba(67,72,80,0.24)]',
  },
  {
    value: 'ARRIVED',
    label: 'Пришел',
    activeClassName: 'border-[#d8f0df] bg-[#eefaf1] text-[#1f7a38]',
  },
  {
    value: 'NO_SHOW',
    label: 'Не пришел',
    activeClassName: 'border-[#f6d6d6] bg-[#fff0f0] text-[#bf4b4b]',
  },
  {
    value: 'CONFIRMED',
    label: 'Подтвердил',
    activeClassName: 'border-[#dfe4ff] bg-[#eef1ff] text-[#5a59d6]',
  },
];

const DESKTOP_HISTORY_MONTHS = [
  'Января',
  'Февраля',
  'Марта',
  'Апреля',
  'Мая',
  'Июня',
  'Июля',
  'Августа',
  'Сентября',
  'Октября',
  'Ноября',
  'Декабря',
];

function getActiveStatus(value: string): AppointmentStatus {
  if (value === 'ARRIVED' || value === 'NO_SHOW' || value === 'CONFIRMED') {
    return value;
  }
  return 'PENDING';
}

function statusLabel(value: string) {
  if (value === 'ARRIVED') {
    return 'Пришел';
  }
  if (value === 'NO_SHOW') {
    return 'Не пришел';
  }
  if (value === 'CONFIRMED') {
    return 'Подтвержден';
  }
  return 'Ожидание';
}

function historyStatusClass(value: string) {
  if (value === 'ARRIVED') {
    return 'bg-[#e4f7e8] text-[#1f7a38]';
  }
  if (value === 'NO_SHOW') {
    return 'bg-[#fde9e9] text-[#bb4d4d]';
  }
  if (value === 'CONFIRMED') {
    return 'bg-[#e7edff] text-[#4168d0]';
  }
  return 'bg-[#fff4d8] text-[#986f00]';
}

function buildDateTitle(date: Date) {
  return `${formatDateLabel(date)} ${date.getFullYear()}`;
}

function formatDesktopHistoryDay(date: Date) {
  return `${String(date.getDate()).padStart(2, '0')} ${
    DESKTOP_HISTORY_MONTHS[date.getMonth()] || ''
  } ${date.getFullYear()}`;
}

function appointmentAmountValue(appointment: AppointmentItem) {
  return appointment.amountAfterDiscount ?? appointment.amountBeforeDiscount;
}

function appointmentPaidValue(appointment: AppointmentItem) {
  return appointment.paidAmount;
}

function formatOptionalRub(value: number | null) {
  return value === null ? '—' : formatRub(value);
}

function daysLabel(value: number) {
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (mod10 === 1 && mod100 !== 11) {
    return 'день';
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return 'дня';
  }
  return 'дней';
}

function formatDateDraftValue(date: Date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

function parseDateDraftValue(value: string) {
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) {
    return null;
  }
  const [, day, month, year] = match;
  const parsed = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function combineDraftDateTime(dateValue: string, timeValue: string) {
  const date = parseDateDraftValue(dateValue);
  const timeMatch = timeValue.match(/^(\d{2}):(\d{2})$/);
  if (!date || !timeMatch) {
    return null;
  }
  const [, hours, minutes] = timeMatch;
  date.setHours(Number(hours), Number(minutes), 0, 0);
  return date;
}

function formatDurationWords(value: number) {
  const safe = Math.max(0, value);
  const hours = Math.floor(safe / 60);
  const minutes = safe % 60;

  const hourWord =
    hours % 10 === 1 && hours % 100 !== 11
      ? 'час'
      : hours % 10 >= 2 && hours % 10 <= 4 && (hours % 100 < 12 || hours % 100 > 14)
        ? 'часа'
        : 'часов';
  const minuteWord =
    minutes % 10 === 1 && minutes % 100 !== 11
      ? 'минута'
      : minutes % 10 >= 2 && minutes % 10 <= 4 && (minutes % 100 < 12 || minutes % 100 > 14)
        ? 'минуты'
        : 'минут';

  if (hours > 0 && minutes > 0) {
    return `${hours} ${hourWord} ${minutes} ${minuteWord}`;
  }
  if (hours > 0) {
    return `${hours} ${hourWord}`;
  }
  return `${minutes} ${minuteWord}`;
}

function buildDesktopDraft(appointment: AppointmentItem): DesktopAppointmentDraft {
  const durationMin = Math.max(
    30,
    Math.round((appointment.endAt.getTime() - appointment.startAt.getTime()) / 60000),
  );

  return {
    staffId: appointment.staffId,
    dateValue: formatDateDraftValue(appointment.startAt),
    startTime: formatTime(appointment.startAt),
    endTime: formatTime(appointment.endAt),
    durationMin,
    technicalBreaks: [],
    comment: appointment.comment || '',
  };
}

function AppointmentAmount({
  appointment,
  className,
}: {
  appointment: AppointmentItem;
  className?: string;
}) {
  const value = appointmentAmountValue(appointment);
  if (value === null) {
    return <span className={clsx('text-[28px] font-semibold text-muted', className)}>—</span>;
  }
  return <span className={clsx('font-bold text-ink', className)}>{formatRub(value)}</span>;
}

function actionButtonClass(disabled: boolean) {
  return clsx(
    'rounded-xl border border-[#d8dee7] bg-[#f7f9fc] p-3 text-[#4c5563] transition',
    disabled ? 'cursor-not-allowed opacity-50' : 'hover:border-[#c6ceda] hover:bg-white',
  );
}

function infoTileTitle(label: string, value: string) {
  return (
    <div className="rounded-[20px] border border-[#e4e8ef] bg-[#fbfcfe] px-4 py-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#9ca4b2]">{label}</p>
      <p className="mt-2 text-[18px] font-extrabold leading-tight text-ink">{value}</p>
    </div>
  );
}

function LeftPanelField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <p className="text-[15px] font-medium text-[#737b88]">{label}</p>
      <div className="mt-3">{children}</div>
    </label>
  );
}

const LEFT_PANEL_CONTROL_CLASS =
  'h-16 w-full rounded-[18px] border border-[#d7dde6] bg-white px-5 text-[17px] font-semibold text-ink outline-none transition focus:border-[#c0c8d4]';

const EMPTY_DESKTOP_DRAFT: DesktopAppointmentDraft = {
  staffId: '',
  dateValue: '',
  startTime: '10:00',
  endTime: '11:00',
  durationMin: 60,
  technicalBreaks: [],
  comment: '',
};

export function JournalAppointmentScreen({
  appointment,
  client,
  clientDraft,
  staff,
  history,
  historyLoading,
  historyOpen,
  loading,
  canEdit,
  canOpenClient,
  canViewClientPhone,
  visitsCount,
  noShowCount,
  onBack,
  onCloseHistory,
  onStatusChange,
  onOpenClient,
  onOpenAppointment,
  onCall,
  onSms,
  onWhatsApp,
  onDelete,
}: JournalAppointmentScreenProps) {
  const [desktopEditing, setDesktopEditing] = useState(false);
  const [desktopDraft, setDesktopDraft] = useState<DesktopAppointmentDraft>(() =>
    appointment ? buildDesktopDraft(appointment) : EMPTY_DESKTOP_DRAFT,
  );

  useEffect(() => {
    if (!appointment) {
      setDesktopEditing(false);
      setDesktopDraft(EMPTY_DESKTOP_DRAFT);
      return;
    }
    setDesktopEditing(false);
    setDesktopDraft(buildDesktopDraft(appointment));
  }, [appointment]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia('(min-width: 768px)').matches) {
      return;
    }

    const { body, documentElement } = document;
    const previousBodyOverflow = body.style.overflow;
    const previousHtmlOverflow = documentElement.style.overflow;

    body.style.overflow = 'hidden';
    documentElement.style.overflow = 'hidden';

    return () => {
      body.style.overflow = previousBodyOverflow;
      documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  if (!appointment) {
    return (
      <>
        <div className="pb-6 pt-4 md:hidden">
          <div className="mb-4 flex items-center gap-3 border-b border-line pb-3">
            <button type="button" onClick={onBack} className="rounded-lg p-2 text-ink">
              <ArrowLeft className="h-6 w-6" />
            </button>
            <h1 className="text-[26px] font-extrabold text-ink">Запись</h1>
          </div>
          <p className="text-[18px] font-medium text-muted">Запись не выбрана</p>
        </div>

        <div className="fixed inset-0 z-[80] hidden items-center justify-center bg-[rgba(34,43,51,0.38)] p-6 backdrop-blur-[2px] md:flex">
          <div className="w-full max-w-[480px] rounded-[32px] border border-[#dfe4ec] bg-[#f8fafc] p-8 text-center shadow-[0_30px_80px_rgba(34,43,51,0.18)]">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#949cab]">Запись</p>
            <h2 className="mt-4 text-[34px] font-extrabold leading-none text-ink">
              Ничего не выбрано
            </h2>
            <p className="mt-4 text-base font-semibold text-[#798190]">
              Закройте окно и откройте запись из списка.
            </p>
            <button
              type="button"
              onClick={onBack}
              className="mt-8 inline-flex h-12 items-center justify-center rounded-2xl bg-[#f4c900] px-6 text-sm font-extrabold text-[#222b33]"
            >
              Закрыть
            </button>
          </div>
        </div>
      </>
    );
  }

  const availableStaff = staff.filter(
    (item) => item.isActive && (item.role === 'MASTER' || item.id === appointment.staffId),
  );
  const selectedStaff =
    availableStaff.find((item) => item.id === desktopDraft.staffId) ||
    availableStaff.find((item) => item.id === appointment.staffId) ||
    null;
  const draftStartAt = combineDraftDateTime(desktopDraft.dateValue, desktopDraft.startTime);
  const draftEndAt = combineDraftDateTime(desktopDraft.dateValue, desktopDraft.endTime);
  const displayAppointmentStartAt = draftStartAt || appointment.startAt;
  const displayAppointmentEndAt =
    draftEndAt && draftEndAt.getTime() > displayAppointmentStartAt.getTime()
      ? draftEndAt
      : appointment.endAt;
  const displayDurationMinutes = Math.max(
    0,
    Math.round(
      (displayAppointmentEndAt.getTime() - displayAppointmentStartAt.getTime()) / 60000,
    ),
  );
  const durationOptions = [30, 45, 60, 90, 120, 150, 180, 210, 240].filter(
    (value) => value >= 30,
  );
  if (!durationOptions.includes(desktopDraft.durationMin)) {
    durationOptions.push(desktopDraft.durationMin);
    durationOptions.sort((left, right) => left - right);
  }
  const resetDesktopDraft = () => {
    setDesktopEditing(false);
    setDesktopDraft(buildDesktopDraft(appointment));
  };
  const handleStartTimeChange = (nextStartTime: string) => {
    setDesktopDraft((prev) => {
      const startDate = combineDraftDateTime(prev.dateValue, nextStartTime);
      if (!startDate) {
        return { ...prev, startTime: nextStartTime };
      }
      const nextEndDate = new Date(startDate.getTime() + prev.durationMin * 60000);
      return {
        ...prev,
        startTime: nextStartTime,
        endTime: formatTime(nextEndDate),
      };
    });
  };
  const handleEndTimeChange = (nextEndTime: string) => {
    setDesktopDraft((prev) => {
      const startDate = combineDraftDateTime(prev.dateValue, prev.startTime);
      const endDate = combineDraftDateTime(prev.dateValue, nextEndTime);
      if (!startDate || !endDate || endDate.getTime() <= startDate.getTime()) {
        return { ...prev, endTime: nextEndTime };
      }
      const nextDuration = Math.round((endDate.getTime() - startDate.getTime()) / 60000);
      return {
        ...prev,
        endTime: nextEndTime,
        durationMin: nextDuration,
      };
    });
  };
  const handleDurationChange = (nextDurationMin: number) => {
    setDesktopDraft((prev) => {
      const startDate = combineDraftDateTime(prev.dateValue, prev.startTime);
      if (!startDate) {
        return { ...prev, durationMin: nextDurationMin };
      }
      const nextEndDate = new Date(startDate.getTime() + nextDurationMin * 60000);
      return {
        ...prev,
        durationMin: nextDurationMin,
        endTime: formatTime(nextEndDate),
      };
    });
  };
  const displayStaffName = selectedStaff?.name || appointment.staffName;
  const displayStaffSubtitle =
    selectedStaff?.positionName?.trim() || appointment.serviceName || 'Специалист';
  const displayStaffAvatarUrl = selectedStaff?.avatarUrl || null;
  const actionTiles = [
    { title: 'Расширенные поля', icon: List },
    { title: 'Повторение записи', icon: Repeat2 },
    { title: 'Уведомления о визите', icon: Bell },
    { title: 'Списание расходников', icon: Package2 },
    { title: 'История изменений', icon: History },
  ];

  const activeStatus = getActiveStatus(appointment.status);
  const title = buildDateTitle(appointment.startAt);
  const amount = appointmentAmountValue(appointment);
  const sortedHistory = [...history].sort((left, right) => right.startAt.getTime() - left.startAt.getTime());
  const previousVisit =
    sortedHistory
      .filter((item) => item.id !== appointment.id && item.startAt.getTime() <= appointment.startAt.getTime())
      .sort((left, right) => right.startAt.getTime() - left.startAt.getTime())[0] ?? null;
  const durationMinutes = Math.max(
    0,
    Math.round((appointment.endAt.getTime() - appointment.startAt.getTime()) / 60000),
  );
  const displayClientName =
    clientDraft.name.trim() || client?.name || appointment.clientName || 'Клиент';
  const displayClientPhone = canViewClientPhone
    ? clientDraft.phone.trim() || client?.phone || appointment.clientPhone || ''
    : '';
  const daysSincePreviousVisit = previousVisit
    ? Math.max(
        0,
        Math.floor(
          (appointment.startAt.getTime() - previousVisit.startAt.getTime()) / (24 * 60 * 60 * 1000),
        ),
      )
    : null;
  const totalSold = sortedHistory.reduce((sum, item) => sum + (appointmentAmountValue(item) ?? 0), 0);
  const totalPaid = sortedHistory.reduce((sum, item) => sum + (appointmentPaidValue(item) ?? 0), 0);
  const historyGroups = sortedHistory.reduce<Array<{ day: string; date: Date; items: AppointmentItem[] }>>(
    (accumulator, item) => {
      const day = formatHistoryDate(item.startAt);
      const existing = accumulator.find((entry) => entry.day === day);
      if (existing) {
        existing.items.push(item);
        return accumulator;
      }
      accumulator.push({
        day,
        date: item.startAt,
        items: [item],
      });
      return accumulator;
    },
    [],
  );

  const handleCopyClientPhone = () => {
    if (!displayClientPhone || !navigator.clipboard) {
      return;
    }
    void navigator.clipboard.writeText(displayClientPhone).catch(() => undefined);
  };
  const openClientDetails = () => {
    if (!canOpenClient) {
      return;
    }
    onOpenClient();
  };

  return (
    <>
      <div className="pb-6 pt-4 md:hidden">
        <div className="mb-4 flex items-center gap-3 border-b border-line pb-3">
          <button type="button" onClick={onBack} className="rounded-lg p-2 text-ink">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-[26px] font-extrabold text-ink">{title}</h1>
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
            {canOpenClient ? (
              <button
                type="button"
                onClick={openClientDetails}
                className="text-left text-[42px] font-extrabold leading-none text-ink"
              >
                <span className="text-[52%]">{appointment.clientName || 'Клиент'}</span>
              </button>
            ) : (
              <p className="text-[42px] font-extrabold leading-none text-ink">
                <span className="text-[52%]">{appointment.clientName || 'Клиент'}</span>
              </p>
            )}
            {canViewClientPhone ? (
              <p className="mt-1 text-[20px] font-medium text-muted">
                {appointment.clientPhone || 'нет телефона'}
              </p>
            ) : null}
          </div>
          {canViewClientPhone ? (
            <div className="flex items-center gap-2">
              <button type="button" onClick={onCall} className="rounded-xl bg-[#e6e9ef] p-3 text-ink">
                <PhoneCall className="h-6 w-6" />
              </button>
              <button type="button" onClick={onSms} className="rounded-xl bg-[#e6e9ef] p-3 text-ink">
                <MessageSquare className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={onWhatsApp}
                className="rounded-xl bg-[#e6e9ef] p-3 text-ink"
              >
                <MessageCircle className="h-6 w-6" />
              </button>
            </div>
          ) : null}
        </div>

        <p className="mt-5 text-[20px] font-medium text-ink">{`Визитов: ${visitsCount} (${noShowCount} неявок)`}</p>

        <div className="mt-4 rounded-3xl border border-line bg-screen p-4">
          <p className="text-[16px] font-medium text-muted">Примечание о клиенте</p>
          <p className="mt-2 text-[18px] font-medium text-[#8f97a5]">
            Добавьте примечание в карточке клиента
          </p>
        </div>

        <div className="mt-5 rounded-3xl border border-line bg-screen p-4">
          <div className="flex items-center justify-between">
            <p className="text-[20px] font-semibold text-ink">{appointment.staffName}</p>
            <p className="text-[18px] font-semibold text-muted">{`${formatTime(
              appointment.startAt,
            )}-${formatTime(appointment.endAt)}`}</p>
          </div>
          <div className="mt-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-[28px] font-semibold leading-tight text-ink">
                {appointment.serviceName || 'Услуга'}
              </p>
              <p className="mt-2 text-[16px] font-medium text-muted">Статус оплаты уточняется</p>
            </div>
            <AppointmentAmount appointment={appointment} className="text-[40px]" />
          </div>
        </div>

        {appointment.comment.trim() ? (
          <div className="mt-5 rounded-3xl border border-line bg-screen p-4">
            <p className="text-[16px] font-medium text-muted">Комментарий к записи</p>
            <p className="mt-2 whitespace-pre-wrap break-words text-[18px] font-medium text-ink">
              {appointment.comment}
            </p>
          </div>
        ) : null}

        <div className="mt-5 rounded-3xl border border-line bg-screen p-4">
          <p className="text-[34px] font-bold text-ink">К оплате</p>
          <div className="mt-2">
            <AppointmentAmount appointment={appointment} className="text-[40px]" />
          </div>
        </div>

        {loading ? (
          <p className="mt-3 text-[15px] font-semibold text-muted">Сохраняю изменения...</p>
        ) : null}

        {canEdit ? (
          <button
            type="button"
            onClick={onDelete}
            disabled={loading}
            className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#f1d0c8] bg-[#fff4f0] px-4 text-sm font-semibold text-[#bc5941] disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            Удалить запись
          </button>
        ) : null}
      </div>

      <div
        className="fixed inset-0 z-[80] hidden bg-[rgba(34,43,51,0.3)] backdrop-blur-[2px] md:block"
        onClick={onBack}
      >
        <div className="relative flex h-full items-center justify-center p-6">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onBack();
              }}
              className="absolute right-6 top-6 z-20 rounded-full border border-[#dfe4ec] bg-white/92 p-2 text-[#8d95a1] shadow-[0_12px_30px_rgba(34,43,51,0.14)] transition hover:text-ink"
              aria-label="Закрыть"
            >
              <X className="h-6 w-6" />
            </button>

          <section
            className="relative h-[min(860px,calc(100vh-48px))] w-[min(1460px,calc(100vw-56px))] overflow-hidden rounded-[34px] border border-[#dfe4ec] bg-[#f7f9fc] shadow-[0_28px_80px_rgba(34,43,51,0.16)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className="flex h-full w-[200%] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{ transform: historyOpen ? 'translateX(-50%)' : 'translateX(0%)' }}
            >
              <div className="grid h-full w-1/2 shrink-0 grid-cols-[280px_minmax(0,1fr)_360px] bg-[#f7f9fc]">
                <aside className="min-h-0 overflow-y-auto overscroll-contain border-r border-[#e3e8ef] bg-[#f4f6fa] p-5">
                  <div className="space-y-6">
                    <section className="rounded-[28px] bg-[#e9edf3] p-5">
                      {!desktopEditing ? (
                        <>
                          <div className="flex items-start gap-4">
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[22px] bg-white text-[22px] font-extrabold leading-none text-[#7e8693] shadow-[0_10px_22px_rgba(115,123,138,0.14)]">
                              {displayStaffAvatarUrl ? (
                                <img
                                  src={displayStaffAvatarUrl}
                                  alt={displayStaffName}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                displayStaffName.slice(0, 2).toUpperCase() || 'ST'
                              )}
                            </div>
                            <div className="min-w-0 flex-1 pt-1">
                              <p className="break-words text-[24px] font-extrabold leading-[1.05] tracking-[-0.03em] text-ink">
                                {displayStaffName}
                              </p>
                              <p className="mt-2 break-words text-[15px] font-medium leading-[1.45] text-[#7f8794]">
                                {displayStaffSubtitle}
                              </p>
                            </div>
                          </div>

                          <div className="mt-7 space-y-5">
                            <div className="flex items-start gap-3 text-[#666f7d]">
                              <CalendarDays className="mt-0.5 h-6 w-6 shrink-0" />
                              <div>
                                <p className="text-[18px] font-bold text-ink">
                                  {formatDateLabel(displayAppointmentStartAt)}
                                </p>
                                <p className="mt-1 text-sm font-medium">
                                  {`${formatTime(displayAppointmentStartAt)}-${formatTime(
                                    displayAppointmentEndAt,
                                  )} · ${formatDurationWords(displayDurationMinutes)}`}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-start gap-3 text-[#666f7d]">
                              <Clock3 className="mt-0.5 h-6 w-6 shrink-0" />
                              <div>
                                <p className="text-[18px] font-bold text-ink">Создана</p>
                                <p className="mt-1 text-sm font-medium">
                                  {`${formatHistoryDate(appointment.createdAt)} · ${formatTime(
                                    appointment.createdAt,
                                  )}`}
                                </p>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setDesktopEditing(true)}
                            className="mt-7 inline-flex items-center gap-2 text-[16px] font-semibold text-[#6c7380] transition hover:text-ink"
                          >
                            <Pencil className="h-4 w-4" />
                            Редактировать
                          </button>
                        </>
                      ) : (
                        <div className="space-y-6">
                          <LeftPanelField label="Сотрудник">
                            <select
                              value={desktopDraft.staffId}
                              onChange={(event) =>
                                setDesktopDraft((prev) => ({
                                  ...prev,
                                  staffId: event.target.value,
                                }))
                              }
                              className={LEFT_PANEL_CONTROL_CLASS}
                            >
                              {availableStaff.map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.name}
                                </option>
                              ))}
                            </select>
                          </LeftPanelField>

                          <LeftPanelField label="Дата">
                            <div className="relative">
                              <input
                                value={desktopDraft.dateValue}
                                onChange={(event) =>
                                  setDesktopDraft((prev) => ({
                                    ...prev,
                                    dateValue: event.target.value,
                                  }))
                                }
                                placeholder="ДД.ММ.ГГГГ"
                                className={`${LEFT_PANEL_CONTROL_CLASS} pr-14`}
                              />
                              <CalendarDays className="pointer-events-none absolute right-5 top-1/2 h-6 w-6 -translate-y-1/2 text-[#8d95a1]" />
                            </div>
                          </LeftPanelField>

                          <LeftPanelField label="Время и Длительность записи">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="relative">
                                <input
                                  value={desktopDraft.startTime}
                                  onChange={(event) => handleStartTimeChange(event.target.value)}
                                  type="time"
                                  step={1800}
                                  className={`${LEFT_PANEL_CONTROL_CLASS} pr-12`}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleStartTimeChange(formatTime(appointment.startAt))}
                                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#7f8794]"
                                >
                                  <X className="h-5 w-5" />
                                </button>
                              </div>

                              <div className="relative">
                                <input
                                  value={desktopDraft.endTime}
                                  onChange={(event) => handleEndTimeChange(event.target.value)}
                                  type="time"
                                  step={1800}
                                  className={`${LEFT_PANEL_CONTROL_CLASS} pr-12`}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleEndTimeChange(formatTime(appointment.endAt))}
                                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#7f8794]"
                                >
                                  <X className="h-5 w-5" />
                                </button>
                              </div>
                            </div>

                            <select
                              value={desktopDraft.durationMin}
                              onChange={(event) => handleDurationChange(Number(event.target.value))}
                              className={`${LEFT_PANEL_CONTROL_CLASS} mt-3`}
                            >
                              {durationOptions.map((value) => (
                                <option key={value} value={value}>
                                  {formatDurationWords(value)}
                                </option>
                              ))}
                            </select>
                          </LeftPanelField>

                          <LeftPanelField label="Технический перерыв">
                            <button
                              type="button"
                              onClick={() =>
                                setDesktopDraft((prev) => ({
                                  ...prev,
                                  technicalBreaks: [...prev.technicalBreaks, 'Перерыв 15 мин'],
                                }))
                              }
                              className="inline-flex h-14 items-center rounded-[18px] border border-[#d7dde6] bg-white px-5 text-[17px] font-semibold text-ink transition hover:border-[#c2cad6]"
                            >
                              + Добавить перерыв
                            </button>

                            {desktopDraft.technicalBreaks.length > 0 ? (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {desktopDraft.technicalBreaks.map((value, index) => (
                                  <button
                                    key={`${value}-${index}`}
                                    type="button"
                                    onClick={() =>
                                      setDesktopDraft((prev) => ({
                                        ...prev,
                                        technicalBreaks: prev.technicalBreaks.filter(
                                          (_, breakIndex) => breakIndex !== index,
                                        ),
                                      }))
                                    }
                                    className="inline-flex items-center gap-2 rounded-full border border-[#d7dde6] bg-white px-3 py-2 text-sm font-semibold text-[#5d6572]"
                                  >
                                    {value}
                                    <X className="h-4 w-4" />
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </LeftPanelField>

                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={resetDesktopDraft}
                              className="inline-flex h-11 items-center justify-center rounded-2xl border border-[#d2d8e2] bg-white px-4 text-sm font-semibold text-[#58606d]"
                            >
                              Отмена
                            </button>
                            <button
                              type="button"
                              onClick={() => setDesktopEditing(false)}
                              className="inline-flex h-11 items-center justify-center rounded-2xl bg-[#222b33] px-4 text-sm font-extrabold text-white"
                            >
                              Готово
                            </button>
                          </div>
                        </div>
                      )}
                    </section>

                    <section>
                      <div className="flex items-center gap-2 text-[#39414d]">
                        <Paperclip className="h-5 w-5" />
                        <p className="text-[16px] font-extrabold">Закрепленные поля</p>
                      </div>

                      <div className="mt-4">
                        <label className="block">
                          <p className="text-[16px] font-medium text-[#6d7582]">Комментарий к записи</p>
                          <textarea
                            value={desktopDraft.comment}
                            onChange={(event) =>
                              setDesktopDraft((prev) => ({
                                ...prev,
                                comment: event.target.value,
                              }))
                            }
                            className="mt-3 h-[160px] w-full resize-none rounded-[22px] border border-[#d7dde6] bg-white px-4 py-4 text-[18px] font-medium text-ink outline-none transition focus:border-[#c0c8d4]"
                          />
                        </label>
                      </div>

                      <div className="mt-6 grid grid-cols-2 gap-3">
                        {actionTiles.map((item) => {
                          const Icon = item.icon;
                          return (
                            <button
                              key={item.title}
                              type="button"
                              className="flex min-h-[128px] flex-col items-center justify-center rounded-[24px] border border-[#d7dde6] bg-white px-4 py-5 text-center transition hover:border-[#c4ccd6] hover:bg-[#fbfcfd]"
                            >
                              <Icon className="h-7 w-7 text-[#3f4652]" />
                              <span className="mt-4 text-[16px] font-medium leading-tight text-ink">
                                {item.title}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  </div>
                </aside>

                <main className="min-h-0 overflow-y-auto overscroll-contain bg-[#f9fbfd]">
                  <div className="px-5 pb-6 pt-5">
                    <div className="flex flex-wrap gap-3">
                      {STATUS_ITEMS.map((item) => {
                        const active = item.value === activeStatus;
                        return (
                          <button
                            key={item.value}
                            type="button"
                            onClick={() => onStatusChange(item.value)}
                            disabled={loading || !canEdit}
                            className={clsx(
                              'inline-flex h-11 items-center rounded-2xl border px-5 text-[16px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-55',
                              active
                                ? item.activeClassName
                                : 'border-[#d8dee7] bg-[#eef2f6] text-[#444d5a] hover:border-[#c9d0db] hover:bg-white',
                            )}
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>

                    <section className="mt-5 rounded-[24px] border border-[#dde3eb] bg-white p-5 shadow-[0_10px_24px_rgba(42,49,56,0.05)]">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-[#8b93a0]">
                            {`${appointment.staffName} · ${durationMinutes} мин`}
                          </p>
                          <h2 className="mt-3 text-[34px] font-extrabold leading-none tracking-[-0.03em] text-ink">
                            {appointment.serviceName || 'Услуга'}
                          </h2>
                        </div>
                        <AppointmentAmount
                          appointment={appointment}
                          className="text-[38px] leading-none"
                        />
                      </div>

                      <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
                        <div className="rounded-[20px] border border-[#e4e8ef] bg-[#f7f9fc] px-4 py-4">
                          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#9ca4b2]">
                            Время визита
                          </p>
                          <p className="mt-2 text-[20px] font-extrabold text-ink">
                            {`${formatTime(appointment.startAt)}-${formatTime(appointment.endAt)}`}
                          </p>
                        </div>
                        <div className="rounded-[20px] border border-[#e4e8ef] bg-[#f7f9fc] px-4 py-4">
                          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#9ca4b2]">
                            Статус оплаты
                          </p>
                          <p className="mt-2 text-[20px] font-extrabold text-ink">
                            {amount !== null ? 'К оплате' : 'Не указано'}
                          </p>
                        </div>
                      </div>
                    </section>

                    <section className="mt-5 rounded-[24px] border border-[#dde3eb] bg-[#f4f7fb] p-5">
                      <div className="grid grid-cols-2 gap-2 rounded-[20px] bg-[#e9edf3] p-1">
                        <div className="rounded-[16px] bg-white px-4 py-3 text-center text-[18px] font-semibold text-ink">
                          Услуги
                        </div>
                        <div className="rounded-[16px] px-4 py-3 text-center text-[18px] font-semibold text-[#656d79]">
                          Товары
                        </div>
                      </div>

                      <div className="mt-4 rounded-[18px] border border-[#dde3eb] bg-white px-4 py-3 text-base font-semibold text-[#adb4c0]">
                        Поиск по услугам
                      </div>

                      <div className="mt-8">
                        <p className="text-base font-semibold text-[#818997]">
                          У записи пока одна услуга. Расширенное редактирование состава визита
                          оставлено на следующий шаг.
                        </p>
                        <button
                          type="button"
                          className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#59616e] shadow-[0_10px_24px_rgba(42,49,56,0.06)]"
                        >
                          Все услуги
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </section>

                    <section className="mt-5 rounded-[24px] border border-[#dde3eb] bg-white shadow-[0_10px_24px_rgba(42,49,56,0.05)]">
                      <div className="flex items-center justify-between border-b border-[#e7ebf0] px-5 py-4">
                        <div className="flex items-center gap-3">
                          <CreditCard className="h-5 w-5 text-[#68717f]" />
                          <p className="text-[18px] font-semibold text-[#5c6471]">К оплате</p>
                          <AppointmentAmount appointment={appointment} className="text-[26px]" />
                        </div>
                        <p className="text-sm font-semibold text-[#8f97a5]">Быстрая оплата</p>
                      </div>

                      <div className="grid gap-3 p-5 lg:grid-cols-3">
                        <div className="rounded-[22px] border border-[#f2c200] bg-[#fffdf3] px-4 py-4">
                          <p className="text-[20px] font-extrabold text-ink">Карта</p>
                          <p className="mt-2 text-sm font-semibold text-[#7f8794]">
                            Расчетный счет
                          </p>
                        </div>
                        <div className="rounded-[22px] border border-[#f2c200] bg-[#fffdf3] px-4 py-4">
                          <p className="text-[20px] font-extrabold text-ink">Наличные</p>
                          <p className="mt-2 text-sm font-semibold text-[#7f8794]">
                            Основная касса
                          </p>
                        </div>
                        <div className="rounded-[22px] border border-[#dfe4ec] bg-[#fafbfd] px-4 py-4">
                          <p className="text-[20px] font-extrabold text-ink">Все способы</p>
                          <p className="mt-2 text-sm font-semibold text-[#7f8794]">
                            Стандартный набор
                          </p>
                        </div>
                      </div>
                    </section>
                  </div>
                </main>

                <aside className="flex min-h-0 flex-col overflow-y-auto overscroll-contain border-l border-[#e3e8ef] bg-white px-5 pb-5 pt-5">
                  <div className="pr-10">
                    <p className="text-sm font-semibold text-[#8f97a5]">Клиент</p>
                    {canOpenClient ? (
                      <button
                        type="button"
                        onClick={openClientDetails}
                        className="mt-3 text-left text-[34px] font-extrabold leading-none tracking-[-0.03em] text-ink"
                      >
                        {displayClientName}
                      </button>
                    ) : (
                      <p className="mt-3 text-[34px] font-extrabold leading-none tracking-[-0.03em] text-ink">
                        {displayClientName}
                      </p>
                    )}
                    {canViewClientPhone ? (
                      <div className="mt-3 flex items-center gap-2 text-[18px] font-semibold text-[#6c7481]">
                        <span>{displayClientPhone || 'Телефон не указан'}</span>
                        {displayClientPhone ? (
                          <button
                            type="button"
                            onClick={handleCopyClientPhone}
                            className="rounded-lg p-1 text-[#8d95a1] transition hover:bg-[#f4f6fa] hover:text-ink"
                            aria-label="Скопировать телефон"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-5 flex items-center gap-2">
                    {canOpenClient ? (
                      <button type="button" onClick={openClientDetails} className={actionButtonClass(false)}>
                        <UserRound className="h-5 w-5" />
                      </button>
                    ) : null}
                    {canViewClientPhone ? (
                      <>
                        <button
                          type="button"
                          onClick={onCall}
                          disabled={!displayClientPhone}
                          className={actionButtonClass(!displayClientPhone)}
                        >
                          <PhoneCall className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={onSms}
                          disabled={!displayClientPhone}
                          className={actionButtonClass(!displayClientPhone)}
                        >
                          <MessageSquare className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={onWhatsApp}
                          disabled={!displayClientPhone}
                          className={actionButtonClass(!displayClientPhone)}
                        >
                          <MessageCircle className="h-5 w-5" />
                        </button>
                      </>
                    ) : null}
                  </div>

                  {canOpenClient ? (
                    <button
                      type="button"
                      onClick={openClientDetails}
                      className="mt-6 flex h-20 w-[120px] flex-col items-center justify-center rounded-[22px] border border-[#dde3eb] bg-white text-[#3f4652] transition hover:border-[#c8d0da] hover:bg-[#eef2f6]"
                    >
                      <History className="h-5 w-5" />
                      <span className="mt-2 text-center text-[16px] font-semibold leading-tight">
                        История посещений
                      </span>
                    </button>
                  ) : null}

                  <div className="mt-5 flex flex-wrap gap-2">
                    <span className="inline-flex rounded-xl bg-[#eef4ff] px-3 py-2 text-sm font-semibold text-[#305fd0]">
                      {previousVisit ? 'Постоянный клиент' : 'Новый клиент'}
                    </span>
                    <span className="inline-flex rounded-xl bg-[#f1ecff] px-3 py-2 text-sm font-semibold text-[#6356dd]">
                      {daysSincePreviousVisit !== null
                        ? `Не посещал ${daysSincePreviousVisit} ${daysLabel(daysSincePreviousVisit)}`
                        : 'Первый визит'}
                    </span>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2 md:grid-cols-1 xl:grid-cols-2">
                    {infoTileTitle(
                      'Последний визит',
                      previousVisit
                        ? `${formatHistoryDate(previousVisit.startAt)} ${formatTime(previousVisit.startAt)}`
                        : 'Нет данных',
                    )}
                    {infoTileTitle('Всего визитов', String(visitsCount))}
                    {infoTileTitle('Неявок', String(noShowCount))}
                    {infoTileTitle('Статус', statusLabel(activeStatus))}
                  </div>

                  <div className="mt-6 rounded-[24px] border border-[#e4e8ef] bg-[#f8fafc] px-4 py-4">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#9ca4b2]">По сети</p>
                    <div className="mt-4 space-y-4">
                      <div>
                        <p className="text-sm font-semibold text-[#8d95a1]">Сеть</p>
                        <p className="mt-1 text-[20px] font-extrabold text-ink">MARI beauty</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#8d95a1]">Сумма визита</p>
                        <p className="mt-1 text-[20px] font-extrabold text-ink">
                          {amount !== null ? formatRub(amount) : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#8d95a1]">Финальная цена</p>
                        <p className="mt-1 text-[16px] font-semibold text-[#646d7a]">
                          {formatAppointmentPrice(appointment)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto border-t border-[#e7ebf0] pt-4">
                    {historyLoading ? (
                      <div className="flex items-center gap-2 text-sm font-semibold text-[#7c8491]">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Загружаю историю клиента...
                      </div>
                    ) : null}
                    {loading ? (
                      <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-[#7c8491]">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Сохраняю изменения...
                      </div>
                    ) : null}

                    <div className="mt-4 flex items-center justify-end gap-3">
                      {canEdit ? (
                        <button
                          type="button"
                          onClick={onDelete}
                          disabled={loading}
                          className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#f1d0c8] bg-[#fff4f0] px-5 text-sm font-semibold text-[#bc5941] transition hover:border-[#e5b8ae] disabled:opacity-50"
                        >
                          Удалить запись
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={onBack}
                        className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#d7dde6] bg-white px-5 text-sm font-semibold text-[#4f5764] transition hover:border-[#c3cbd7]"
                      >
                        Закрыть
                      </button>
                      {canOpenClient ? (
                        <button
                          type="button"
                          onClick={openClientDetails}
                          className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#f4c900] px-5 text-sm font-extrabold text-[#222b33] shadow-[0_12px_26px_rgba(244,201,0,0.28)]"
                        >
                          История посещений
                        </button>
                      ) : null}
                    </div>
                  </div>
                </aside>
              </div>

              <div className="h-full w-1/2 shrink-0 bg-[#f3f5f8] p-4">
                <div className="grid h-full grid-cols-[420px_minmax(0,1fr)] gap-4">
                  <aside className="flex min-h-0 flex-col overflow-y-auto overscroll-contain rounded-[28px] border border-[#e1e6ee] bg-white p-5 shadow-[0_12px_28px_rgba(42,49,56,0.06)]">
                    <button
                      type="button"
                      onClick={onCloseHistory}
                      className="inline-flex items-center gap-2 self-start rounded-xl px-2 py-1 text-sm font-semibold text-[#767f8c] transition hover:bg-[#f5f7fa] hover:text-ink"
                    >
                      <ChevronRight className="h-4 w-4 rotate-180" />
                      Сменить клиента
                    </button>

                    <div className="mt-7 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[18px] font-extrabold text-ink">
                          {displayClientName}
                        </p>
                        {canViewClientPhone ? (
                          <div className="mt-2 flex items-center gap-2 text-[16px] font-semibold text-[#757e8a]">
                            <span>{displayClientPhone || 'Телефон не указан'}</span>
                            {displayClientPhone ? (
                              <button
                                type="button"
                                onClick={handleCopyClientPhone}
                                className="rounded-lg p-1 text-[#8d95a1] transition hover:bg-[#f4f6fa] hover:text-ink"
                                aria-label="Скопировать телефон"
                              >
                                <Copy className="h-4 w-4" />
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-2">
                        {canOpenClient ? (
                          <button type="button" onClick={openClientDetails} className={actionButtonClass(false)}>
                            <UserRound className="h-5 w-5" />
                          </button>
                        ) : null}
                        <button type="button" className={actionButtonClass(false)}>
                          <MoreHorizontal className="h-5 w-5" />
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={onCloseHistory}
                      className="mt-7 flex h-[84px] w-[118px] flex-col items-center justify-center rounded-[22px] border border-[#d7dde7] bg-[#dfe3eb] text-[#3c4250]"
                    >
                      <History className="h-5 w-5" />
                      <span className="mt-2 text-center text-[15px] font-semibold leading-tight">
                        История посещений
                      </span>
                    </button>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <span className="inline-flex rounded-xl bg-[#eef4ff] px-3 py-2 text-sm font-semibold text-[#305fd0]">
                        {previousVisit ? 'Постоянный клиент' : 'Новый клиент'}
                      </span>
                      <span className="inline-flex rounded-xl bg-[#f1ecff] px-3 py-2 text-sm font-semibold text-[#6356dd]">
                        {daysSincePreviousVisit !== null
                          ? `Не посещал ${daysSincePreviousVisit} ${daysLabel(daysSincePreviousVisit)}`
                          : 'Первый визит'}
                      </span>
                    </div>

                    <div className="mt-6 flex items-center gap-2 text-[15px] font-medium text-[#5e6673]">
                      <Square className="h-4 w-4 text-[#c0c7d1]" />
                      Записывает другого посетителя
                    </div>

                    <div className="mt-8">
                      <p className="text-[15px] font-extrabold text-ink">Дополнительно</p>
                      <button
                        type="button"
                        className="mt-4 inline-flex items-center gap-2 text-[16px] font-semibold text-[#7b8390]"
                      >
                        <span className="text-xl leading-none">+</span>
                        Добавить примечание
                      </button>

                      <div className="mt-5">
                        <p className="text-[15px] font-medium text-[#8a92a0]">Дополнительный телефон</p>
                        <p className="mt-2 text-[18px] font-semibold text-ink">-</p>
                      </div>
                    </div>

                    <div className="mt-8 border-t border-[#e7ebf1] pt-6">
                      <p className="text-[15px] font-extrabold text-ink">Данные по сети</p>
                      <p className="mt-5 text-[18px] font-semibold text-[#757d8a]">Сеть MARI beauty</p>

                      <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-5">
                        <div>
                          <p className="text-[14px] font-medium text-[#8a92a0]">Последний визит</p>
                          <p className="mt-2 text-[18px] font-semibold text-ink">
                            {previousVisit
                              ? `${formatHistoryDate(previousVisit.startAt)} ${formatTime(
                                  previousVisit.startAt,
                                )}`
                              : `${formatHistoryDate(appointment.startAt)} ${formatTime(
                                  appointment.startAt,
                                )}`}
                          </p>
                        </div>
                        <div>
                          <p className="text-[14px] font-medium text-[#8a92a0]">Всего визитов</p>
                          <p className="mt-2 text-[18px] font-semibold text-ink">{visitsCount}</p>
                        </div>
                        <div>
                          <p className="text-[14px] font-medium text-[#8a92a0]">Баланс</p>
                          <p className="mt-2 text-[18px] font-semibold text-ink">0</p>
                        </div>
                        <div>
                          <p className="text-[14px] font-medium text-[#8a92a0]">Продано</p>
                          <p className="mt-2 text-[18px] font-semibold text-ink">
                            {formatOptionalRub(totalSold || 0)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[14px] font-medium text-[#8a92a0]">Оплачено</p>
                          <p className="mt-2 text-[18px] font-semibold text-ink">
                            {formatOptionalRub(totalPaid || 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </aside>

                  <main className="min-h-0 overflow-y-auto overscroll-contain rounded-[28px] border border-[#e1e6ee] bg-white p-5 shadow-[0_12px_28px_rgba(42,49,56,0.06)]">
                    <div className="flex min-h-full flex-col">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef2f6] text-[#59616f]">
                            <History className="h-6 w-6" />
                          </div>
                          <h2 className="text-[24px] font-extrabold text-ink">История посещений</h2>
                        </div>

                        <button
                          type="button"
                          onClick={onCloseHistory}
                          className="inline-flex h-11 items-center justify-center rounded-2xl border border-[#d9dee6] bg-white px-5 text-sm font-semibold text-[#4e5663] transition hover:border-[#c4ccd6]"
                        >
                          Закрыть
                        </button>
                      </div>

                      <button
                        type="button"
                        className="mt-8 inline-flex h-14 w-[272px] items-center justify-between rounded-[18px] border border-[#dde3eb] bg-white px-5 text-[16px] font-semibold text-ink shadow-[0_8px_18px_rgba(42,49,56,0.04)]"
                      >
                        <span>Показать все записи</span>
                        <ChevronDown className="h-5 w-5 text-[#727b88]" />
                      </button>

                      <div className="mt-6 overflow-hidden rounded-[22px] bg-[#fbfcfd]">
                        <div className="grid grid-cols-[1.15fr_0.9fr_1.15fr_140px_120px] gap-4 rounded-[20px] bg-[#eff2f6] px-6 py-4 text-[14px] font-bold text-[#98a0ad]">
                          <span>Сотрудник</span>
                          <span>Статус</span>
                          <span>Услуга</span>
                          <span className="text-right">Стоимость</span>
                          <span className="text-right">Оплачено</span>
                        </div>

                        <div className="px-6 py-4">
                          {historyLoading ? (
                            <div className="flex items-center gap-2 text-sm font-semibold text-[#7b8390]">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Загружаю историю...
                            </div>
                          ) : null}

                          {!historyLoading && historyGroups.length === 0 ? (
                            <p className="text-base font-semibold text-[#7b8390]">Нет посещений</p>
                          ) : null}

                          <div className="space-y-6">
                            {historyGroups.map((group) => (
                              <section
                                key={group.day}
                                className="border-t border-[#edf1f5] pt-5 first:border-t-0 first:pt-1"
                              >
                                <p className="pb-4 text-[16px] font-semibold text-[#99a1ae]">
                                  {formatDesktopHistoryDay(group.date)}
                                </p>

                                <div className="space-y-3">
                                  {group.items.map((item) => {
                                    const rowAmount = appointmentAmountValue(item);
                                    const paidAmount = appointmentPaidValue(item);
                                    const activeRow = item.id === appointment.id;
                                    return (
                                      <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => onOpenAppointment(item)}
                                        className={clsx(
                                          'w-full rounded-[20px] border px-4 py-4 text-left transition',
                                          activeRow
                                            ? 'border-[#d9e2f1] bg-[#f8fafd]'
                                            : 'border-transparent bg-transparent hover:border-[#e2e7ef] hover:bg-[#fafbfd]',
                                        )}
                                      >
                                        <div className="grid grid-cols-[1.15fr_0.9fr_1.15fr_140px_120px] items-center gap-4">
                                          <div className="min-w-0">
                                            <p className="truncate text-[18px] font-extrabold text-ink">
                                              {item.staffName}
                                            </p>
                                            <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-[#818997]">
                                              <span>{formatTime(item.startAt)}</span>
                                              <span className="text-[#3367d7]">Подробнее</span>
                                              <ChevronRight className="h-4 w-4 text-[#3367d7]" />
                                            </div>
                                          </div>

                                          <div>
                                            <span
                                              className={clsx(
                                                'inline-flex rounded-full px-3 py-2 text-sm font-extrabold',
                                                historyStatusClass(getActiveStatus(item.status)),
                                              )}
                                            >
                                              {statusLabel(item.status)}
                                            </span>
                                          </div>

                                          <div className="min-w-0">
                                            <p className="truncate text-[17px] font-bold text-ink">
                                              {item.serviceName || 'Без услуги'}
                                            </p>
                                            <p className="mt-2 text-sm font-semibold text-[#8c95a3]">
                                              {`${formatTime(item.startAt)}-${formatTime(item.endAt)}`}
                                            </p>
                                          </div>

                                          <div className="text-right text-[18px] font-semibold text-ink">
                                            {formatOptionalRub(rowAmount)}
                                          </div>

                                          <div className="text-right text-[18px] font-semibold text-ink">
                                            {formatOptionalRub(paidAmount)}
                                          </div>
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              </section>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </main>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
