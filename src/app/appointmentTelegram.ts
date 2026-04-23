import { asArray, formatRub, toNumber, toRecord, toString } from './helpers';
import type { JournalCreateDraft, ServiceItem, StaffItem } from './types';

const TELEGRAM_BOT_ID = process.env.REACT_APP_BOT_ID?.trim() || '';
const TELEGRAM_CHANNEL_ID = process.env.REACT_APP_CHANNEL_ID?.trim() || '';
const SALON_TIME_ZONE = 'Europe/Simferopol';
const SALON_NAME = 'Mari Beauty';

const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Ожидание',
  CONFIRMED: 'Подтвержден',
  ARRIVED: 'Пришел',
  NO_SHOW: 'Не пришел',
  CANCELLED: 'Отменен',
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Ожидает оплаты',
  PAID: 'Оплачено',
  PARTIAL: 'Частично оплачено',
  UNPAID: 'Не оплачено',
  REFUNDED: 'Возврат',
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Наличные',
  CARD: 'Карта',
  ONLINE: 'Онлайн',
  SBP: 'СБП',
  TRANSFER: 'Перевод',
  MIXED: 'Смешанная',
};

const appointmentDateTimeFormatter = new Intl.DateTimeFormat('ru-RU', {
  timeZone: SALON_TIME_ZONE,
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const sentAtFormatter = new Intl.DateTimeFormat('ru-RU', {
  timeZone: SALON_TIME_ZONE,
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

function formatDuration(durationSec: number) {
  const totalMinutes = Math.max(1, Math.round(durationSec / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours} ч ${minutes} мин`;
  }
  if (hours > 0) {
    return `${hours} ч`;
  }
  return `${minutes} мин`;
}

function formatAppointmentDateTime(value: string) {
  return appointmentDateTimeFormatter.format(new Date(value));
}

function formatSentAt() {
  return sentAtFormatter.format(new Date());
}

function formatServiceAmount(service: ServiceItem | null) {
  if (!service) {
    return 'Не указана';
  }
  if (service.priceMin > 0 && service.priceMax > 0 && service.priceMin !== service.priceMax) {
    return `от ${formatRub(service.priceMin)} до ${formatRub(service.priceMax)}`;
  }
  const singlePrice = service.priceMax || service.priceMin;
  return singlePrice > 0 ? formatRub(singlePrice) : 'Не указана';
}

function buildServicesBlock({
  appointmentRecord,
  fallbackServices,
}: {
  appointmentRecord: Record<string, unknown> | null;
  fallbackServices: ServiceItem[];
}) {
  const appointmentServices = asArray(appointmentRecord?.services)
    .map((item) => toRecord(item))
    .filter(Boolean) as Array<Record<string, unknown>>;

  if (appointmentServices.length > 0) {
    return appointmentServices
      .map((service, index) => {
        const durationSec = toNumber(service.durationSec) ?? 0;
        const basePrice =
          toNumber(service.price) ??
          toNumber(service.basePrice) ??
          toNumber(service.priceMin) ??
          null;
        const finalPrice =
          toNumber(service.priceWithDiscount) ??
          toNumber(service.finalPrice) ??
          toNumber(service.priceMax) ??
          basePrice;
        const priceLabel =
          basePrice !== null && finalPrice !== null && finalPrice < basePrice
            ? `${formatRub(finalPrice)} вместо ${formatRub(basePrice)}`
            : finalPrice !== null
              ? formatRub(finalPrice)
              : 'Не указана';

        return `${index + 1}. ${toString(service.name) || 'Услуга'}
   Длительность: ${formatDuration(durationSec)}
   Стоимость: ${priceLabel}`;
      })
      .join('\n');
  }

  if (fallbackServices.length === 0) {
    return `1. Услуга
   Длительность: ${formatDuration(0)}
   Стоимость: Не указана`;
  }

  return fallbackServices
    .map(
      (service, index) => `${index + 1}. ${service.name || 'Услуга'}
   Длительность: ${formatDuration(service.durationSec ?? 0)}
   Стоимость: ${formatServiceAmount(service)}`,
    )
    .join('\n');
}

function buildTelegramAppointmentMessage({
  created,
  draft,
  staff,
  services,
  createdByName,
}: {
  created: unknown;
  draft: JournalCreateDraft;
  staff: StaffItem | null;
  services: ServiceItem[];
  createdByName?: string | null;
}) {
  const root = toRecord(created);
  const appointmentRecord = toRecord(root?.appointment) ?? root;
  const paymentRecord = toRecord(appointmentRecord?.payment);
  const pricesRecord = toRecord(appointmentRecord?.prices);
  const promoRecord = toRecord(appointmentRecord?.promo);
  const appointmentStatus = toString(appointmentRecord?.status) || 'PENDING';
  const paymentStatus = toString(paymentRecord?.status) || 'UNPAID';
  const paymentMethod = toString(paymentRecord?.method) || '';
  const appointmentId =
    toString(appointmentRecord?.externalId) || toString(appointmentRecord?.id) || 'Не указан';
  const startAt =
    toString(appointmentRecord?.startAt) ||
    toString(appointmentRecord?.startsAt) ||
    new Date(`${draft.dateValue}T${draft.startTime}:00`).toISOString();

  const durationSecFromServices = asArray(appointmentRecord?.services).reduce<number>(
    (total, item) => {
      const serviceRecord = toRecord(item);
      return total + (toNumber(serviceRecord?.durationSec) ?? 0);
    },
    0,
  );
  const durationSec =
    durationSecFromServices ||
    services.reduce((total, service) => total + Math.max(60, Math.round(service.durationSec)), 0) ||
    Math.max(60, Math.round(draft.durationMin * 60));

  const baseTotal =
    toNumber(pricesRecord?.baseTotal) ??
    toNumber(appointmentRecord?.baseAmount) ??
    services.reduce((total, service) => total + Math.max(service.priceMax || service.priceMin, 0), 0) ??
    0;
  const discountAmount = toNumber(pricesRecord?.discountAmount) ?? 0;
  const finalTotal =
    toNumber(pricesRecord?.finalTotal) ??
    toNumber(appointmentRecord?.totalAmount) ??
    Math.max(0, baseTotal - discountAmount);
  const paidAmount = toNumber(paymentRecord?.paidAmount) ?? 0;
  const promoCode = toString(promoRecord?.code) || '';
  const adminName = createdByName?.trim() || 'Не указан';

  const lines = [
    'Новая запись из админ-панели',
    '',
    `Салон: ${SALON_NAME}`,
    `Оформлено: ${formatSentAt()}`,
    `Администратор: ${adminName}`,
    '',
    'Запись:',
    `- Номер: ${appointmentId}`,
    `- Статус: ${APPOINTMENT_STATUS_LABELS[appointmentStatus] || appointmentStatus || 'Не указан'}`,
    `- Дата и время: ${formatAppointmentDateTime(startAt)}`,
    `- Специалист: ${staff?.name || toString(toRecord(appointmentRecord?.staff)?.name) || 'Не указан'}`,
    `- Общая длительность: ${formatDuration(durationSec)}`,
    '',
    'Клиент:',
    `- Имя: ${draft.clientName.trim() || 'Не указано'}`,
    `- Телефон: ${draft.clientPhone.trim() || 'Не указан'}`,
    '',
    'Услуги:',
    buildServicesBlock({ appointmentRecord, fallbackServices: services }),
    '',
    'Стоимость:',
    `- Базовая сумма: ${formatRub(baseTotal)}`,
    `- Скидка: ${formatRub(discountAmount)}`,
    `- К оплате: ${formatRub(finalTotal)}`,
    '',
    'Оплата:',
    `- Статус: ${PAYMENT_STATUS_LABELS[paymentStatus] || paymentStatus || 'Не указан'}`,
    `- Способ: ${PAYMENT_METHOD_LABELS[paymentMethod] || paymentMethod || 'Не указан'}`,
    `- Оплачено: ${formatRub(paidAmount)}`,
  ];

  if (promoCode) {
    lines.push('', `Промокод: ${promoCode}`);
  }

  return lines.join('\n');
}

export async function sendAppointmentToTelegramChannel({
  created,
  draft,
  staff,
  services,
  createdByName,
}: {
  created: unknown;
  draft: JournalCreateDraft;
  staff: StaffItem | null;
  services: ServiceItem[];
  createdByName?: string | null;
}) {
  if (!TELEGRAM_BOT_ID || !TELEGRAM_CHANNEL_ID) {
    return false;
  }

  const body = new URLSearchParams({
    chat_id: TELEGRAM_CHANNEL_ID,
    text: buildTelegramAppointmentMessage({ created, draft, staff, services, createdByName }),
    disable_web_page_preview: 'true',
  });

  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_ID}/sendMessage`, {
    method: 'POST',
    mode: 'no-cors',
    body,
  });

  return true;
}
