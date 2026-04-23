import { ApiError } from '../api';

export const JOURNAL_CREATE_STEP_MINUTES = 10;

type BuildJournalCreateAppointmentPayloadInput = {
  clientName: string;
  clientPhone: string;
  comment?: string;
  serviceIds: string[];
  staffId: string;
  startAt: Date;
};

export function buildJournalCreateAppointmentPayload({
  clientName,
  clientPhone,
  comment,
  serviceIds,
  staffId,
  startAt,
}: BuildJournalCreateAppointmentPayloadInput) {
  return {
    startAt: startAt.toISOString(),
    staffId,
    anyStaff: false,
    serviceIds,
    client: {
      name: clientName.trim(),
      phone: clientPhone.trim(),
    },
    comment: comment?.trim() || undefined,
  };
}

export function isJournalCreateStartAligned(startAt: Date) {
  const stepMs = JOURNAL_CREATE_STEP_MINUTES * 60 * 1000;
  return startAt.getTime() % stepMs === 0;
}

function stringifyErrorDetails(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(stringifyErrorDetails).join(' ');
  }
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, entry]) => `${key} ${stringifyErrorDetails(entry)}`)
      .join(' ');
  }
  return '';
}

export function formatJournalCreateSaveError(error: unknown) {
  if (error instanceof ApiError) {
    const code = (error.code || '').toUpperCase();
    const message = error.message || '';
    const searchable = `${code} ${message} ${stringifyErrorDetails(error.details)}`.toLowerCase();

    if (error.status === 401 || code === 'AUTH_REQUIRED') {
      return 'Сессия истекла. Войдите снова и повторите создание записи.';
    }
    if (error.status === 403 || code === 'FORBIDDEN') {
      return 'У вас нет прав на создание записи. Обратитесь к администратору.';
    }
    if (error.status === 404 || code === 'NOT_FOUND') {
      if (searchable.includes('staff') || searchable.includes('master') || searchable.includes('employee')) {
        return 'Не удалось найти выбранного сотрудника. Выберите сотрудника заново.';
      }
      if (searchable.includes('service')) {
        return 'Не удалось найти выбранную услугу. Выберите услугу заново.';
      }
      return 'Не удалось найти часть данных для записи. Обновите страницу и попробуйте снова.';
    }
    if (
      error.status === 409 ||
      searchable.includes('conflict') ||
      searchable.includes('busy') ||
      searchable.includes('occupied') ||
      searchable.includes('overlap') ||
      searchable.includes('already')
    ) {
      return 'На это время уже есть запись или пересечение в расписании. Выберите другое время.';
    }
    if (
      searchable.includes('working') ||
      searchable.includes('schedule') ||
      searchable.includes('shift') ||
      searchable.includes('slot') ||
      searchable.includes('outside')
    ) {
      return 'Сотрудник не принимает запись в выбранное время. Проверьте график или выберите другой слот.';
    }
    if (searchable.includes('staffid') || searchable.includes('staff') || searchable.includes('master')) {
      return 'Выберите сотрудника для записи.';
    }
    if (searchable.includes('serviceids') || searchable.includes('service')) {
      return 'Выберите хотя бы одну услугу для записи.';
    }
    if (
      searchable.includes('startat') ||
      searchable.includes('start_at') ||
      searchable.includes('date') ||
      searchable.includes('time')
    ) {
      return `Проверьте дату и время записи. Время должно быть с шагом ${JOURNAL_CREATE_STEP_MINUTES} минут.`;
    }
    if (searchable.includes('duration') || searchable.includes('endat') || searchable.includes('end_at')) {
      return 'Проверьте длительность записи. Она должна быть больше 0 минут.';
    }
    if (searchable.includes('phone')) {
      return 'Телефон клиента указан в неверном формате. Исправьте номер или оставьте поле пустым.';
    }
    if (searchable.includes('client') || searchable.includes('name')) {
      return 'Проверьте данные клиента. Имя и телефон можно оставить пустыми, но без лишних символов.';
    }
    if (error.status >= 500) {
      return 'Сервер не смог создать запись. Попробуйте еще раз через минуту.';
    }
    if (error.status === 400 || error.status === 422 || code.includes('VALIDATION')) {
      return 'Не удалось создать запись: проверьте дату, время, сотрудника и выбранные услуги.';
    }
    return 'Не удалось создать запись. Проверьте данные и попробуйте снова.';
  }

  if (error instanceof TypeError && error.message.toLowerCase().includes('fetch')) {
    return 'Не удалось подключиться к серверу. Проверьте интернет и попробуйте снова.';
  }

  if (error instanceof Error && error.message.trim()) {
    return `Не удалось создать запись: ${error.message}`;
  }

  return 'Не удалось создать запись. Проверьте данные и попробуйте снова.';
}
