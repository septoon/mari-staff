import type { Dispatch, SetStateAction } from 'react';
import { ApiError } from '../api';
import { MONTHS_RU, MONTHS_RU_GENITIVE, ROLE_LABELS } from './constants';
import type { AppointmentItem, ClientItem, LoadingState, StaffCreateRole, StaffRole } from './types';

export function monthRange(date: Date): [string, string] {
  const from = new Date(date.getFullYear(), date.getMonth(), 1);
  const to = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return [toISODate(from), toISODate(to)];
}

export function monthStrip(date: Date): Array<{ label: string; year: number }> {
  return Array.from({ length: 5 }).map((_, index) => {
    const candidate = new Date(date.getFullYear(), date.getMonth() + index, 1);
    const monthLabel = MONTHS_RU[candidate.getMonth()];
    return {
      label: monthLabel.length > 4 ? monthLabel.slice(0, 3) : monthLabel,
      year: candidate.getFullYear(),
    };
  });
}

export function getWeekDates(input: Date): Date[] {
  const current = new Date(input);
  const day = current.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  current.setDate(current.getDate() + diff);
  const dates: Date[] = [];
  for (let index = 0; index < 7; index += 1) {
    const next = new Date(current);
    next.setDate(current.getDate() + index);
    dates.push(next);
  }
  return dates;
}

export function formatDateLabel(date: Date): string {
  const month = MONTHS_RU_GENITIVE[date.getMonth()] || MONTHS_RU[date.getMonth()];
  return `${date.getDate()} ${month}`;
}

export function formatTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function formatHistoryDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

export function formatRub(amount: number): string {
  return `${Math.round(amount)}₽`;
}

export function formatGroupedNumber(value: number): string {
  return new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: 0,
  })
    .format(Math.round(value))
    .replace(/[\u00A0\u202F]/g, ' ');
}

export function formatGroupedRub(amount: number): string {
  return `${formatGroupedNumber(amount)}₽`;
}

export function formatAppointmentPrice(item: AppointmentItem): string {
  const base = item.amountBeforeDiscount ?? item.amountAfterDiscount;
  const finalAmount = item.amountAfterDiscount ?? item.amountBeforeDiscount;
  if (base === null || finalAmount === null) {
    return '—';
  }
  const discount =
    item.discountPercent !== null
      ? Math.max(0, item.discountPercent)
      : Math.max(0, Math.round(((base - finalAmount) / base) * 100));
  return `${formatRub(base)}- ${discount}%= ${formatRub(finalAmount)}`;
}

export function appointmentMatchesClient(
  appointment: AppointmentItem,
  client: Pick<ClientItem, 'id' | 'name' | 'phone'>,
): boolean {
  const normalizedClientId = client.id.trim();
  const normalizedAppointmentId = appointment.clientId.trim();
  const normalizedClientPhone = normalizePhoneForWhatsApp(client.phone);
  const normalizedAppointmentPhone = normalizePhoneForWhatsApp(appointment.clientPhone);
  const normalizedClientName = client.name.trim().toLowerCase();
  const normalizedAppointmentName = appointment.clientName.trim().toLowerCase();

  const sameClientId =
    normalizedClientId.length > 0 &&
    normalizedAppointmentId.length > 0 &&
    normalizedAppointmentId === normalizedClientId;
  const samePhone =
    normalizedClientPhone.length > 0 &&
    normalizedAppointmentPhone.length > 0 &&
    normalizedAppointmentPhone === normalizedClientPhone;
  const sameName =
    normalizedClientName.length > 0 &&
    normalizedAppointmentName.length > 0 &&
    normalizedAppointmentName === normalizedClientName;

  if (sameClientId || samePhone) {
    return true;
  }

  if (normalizedClientId.length === 0 && normalizedClientPhone.length === 0) {
    return sameName;
  }

  return false;
}

export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function toISODay(date: Date): number {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

export function dayNameToIso(raw?: string): number | null {
  if (!raw) {
    return null;
  }
  const normalized = raw
    .trim()
    .toUpperCase()
    .replace(/[Ё]/g, 'Е')
    .replace(/\./g, '');
  const map: Record<string, number> = {
    MONDAY: 1,
    MON: 1,
    MO: 1,
    ПН: 1,
    ПОНЕДЕЛЬНИК: 1,
    TUESDAY: 2,
    TUE: 2,
    TUES: 2,
    TU: 2,
    ВТ: 2,
    ВТОРНИК: 2,
    WEDNESDAY: 3,
    WED: 3,
    WE: 3,
    СР: 3,
    СРЕДА: 3,
    THURSDAY: 4,
    THU: 4,
    THUR: 4,
    TH: 4,
    ЧТ: 4,
    ЧЕТВЕРГ: 4,
    FRIDAY: 5,
    FRI: 5,
    FR: 5,
    ПТ: 5,
    ПЯТНИЦА: 5,
    SATURDAY: 6,
    SAT: 6,
    SA: 6,
    СБ: 6,
    СУББОТА: 6,
    SUNDAY: 7,
    SUN: 7,
    SU: 7,
    ВС: 7,
    ВОСКРЕСЕНЬЕ: 7,
  };
  return map[normalized] ?? null;
}

export function normalizeDay(value: number | null): number | null {
  if (value === null || !Number.isFinite(value)) {
    return null;
  }
  if (value >= 1 && value <= 7) {
    return value;
  }
  if (value >= 0 && value <= 6) {
    return value === 0 ? 7 : value;
  }
  return null;
}

export function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function toString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function toNullableString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return typeof value === 'string' ? value : String(value);
}

export function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function normalizePhoneForLink(phone: string): string {
  const value = phone.replace(/[^\d+]/g, '');
  if (value.startsWith('+')) {
    return value;
  }
  return `+${value}`;
}

export function getRuPhoneLocalDigits(phone: string): string {
  const normalized = phone.trim();
  const digits = phone.replace(/\D/g, '');
  if (!digits) {
    return '';
  }
  if (normalized.startsWith('+7')) {
    return digits.slice(1, 11);
  }
  if (digits.startsWith('8') && digits.length >= 11) {
    return digits.slice(1, 11);
  }
  if (digits.startsWith('7') && digits.length >= 11) {
    return digits.slice(1, 11);
  }
  return digits.slice(0, 10);
}

export function buildRuPhoneValue(localValue: string): string {
  const rawDigits = localValue.replace(/\D/g, '');
  if (!rawDigits) {
    return '';
  }
  const digits =
    rawDigits.length >= 11 && (rawDigits.startsWith('7') || rawDigits.startsWith('8'))
      ? rawDigits.slice(1, 11)
      : rawDigits.startsWith('7')
        ? rawDigits.slice(1, 11)
        : rawDigits.slice(0, 10);
  return digits ? `+7${digits}` : '';
}

export function normalizePhoneForWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `7${digits}`;
  }
  if (digits.startsWith('8') && digits.length === 11) {
    return `7${digits.slice(1)}`;
  }
  if (digits.startsWith('7') && digits.length === 11) {
    return digits;
  }
  return digits;
}

export function toErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code) {
      return `${error.code}: ${error.message}`;
    }
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Неизвестная ошибка';
}

export function setLoadingKey(
  setState: Dispatch<SetStateAction<LoadingState>>,
  key: keyof LoadingState,
  value: boolean,
) {
  setState((prev) => ({ ...prev, [key]: value }));
}

export function roleLabel(role: StaffRole | StaffCreateRole): string {
  return ROLE_LABELS[role as StaffRole] || role;
}
