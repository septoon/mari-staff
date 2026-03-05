import type { AppointmentItem, ClientItem, ServiceItem, StaffItem } from './types';
import {
  asArray,
  dayNameToIso,
  normalizeDay,
  toNullableString,
  toNumber,
  toRecord,
  toString,
} from './helpers';

export function parseStaff(value: unknown): StaffItem | null {
  const record = toRecord(value);
  if (!record) {
    return null;
  }
  const id = toString(record.id);
  const name = toString(record.name);
  const role = toString(record.role) as StaffItem['role'] | undefined;
  if (!id || !name || !role) {
    return null;
  }
  const positionRecord = toRecord(record.position);
  return {
    id,
    name,
    role,
    phoneE164: toString(record.phoneE164) || toString(record.phone) || '',
    email: toNullableString(record.email),
    avatarUrl:
      toNullableString(record.avatarUrl) ||
      toNullableString(record.photoUrl) ||
      toNullableString(record.imageUrl),
    isActive: Boolean(record.isActive ?? true),
    positionName: toNullableString(positionRecord?.name),
  };
}

export function parseClient(value: unknown): ClientItem | null {
  const record = toRecord(value);
  if (!record) {
    return null;
  }
  const id = toString(record.id);
  const name = toString(record.name) || toString(record.fullName);
  if (!id || !name) {
    return null;
  }
  return {
    id,
    name,
    phone: toString(record.phoneE164) || toString(record.phone) || '',
  };
}

export function parseService(value: unknown): ServiceItem | null {
  const record = toRecord(value);
  if (!record) {
    return null;
  }
  const id = toString(record.id);
  const name = toString(record.name);
  const categoryRecord = toRecord(record.category);
  const categoryId = toString(categoryRecord?.id) || 'uncategorized';
  const categoryName = toString(categoryRecord?.name) || 'Без категории';
  if (!id || !name) {
    return null;
  }
  return {
    id,
    name,
    categoryId,
    categoryName,
    nameOnline: toNullableString(record.nameOnline),
    description: toNullableString(record.description),
    imageUrl:
      toNullableString(record.imageUrl) ||
      toNullableString(record.photoUrl) ||
      toNullableString(record.pictureUrl),
    isActive: Boolean(record.isActive ?? true),
    durationSec: toNumber(record.durationSec) ?? 0,
    priceMin: toNumber(record.priceMin) ?? 0,
    priceMax: toNumber(record.priceMax) ?? toNumber(record.priceMin) ?? 0,
  };
}

export function parseAppointment(value: unknown): AppointmentItem | null {
  const record = toRecord(value);
  if (!record) {
    return null;
  }
  const id = toString(record.id);
  if (!id) {
    return null;
  }
  const staffRecord =
    toRecord(record.staff) ||
    toRecord(record.specialist) ||
    toRecord(record.master) ||
    toRecord(record.employee);
  const clientRecord =
    toRecord(record.client) ||
    toRecord(record.clientAccount) ||
    toRecord(record.customer);
  const servicesArray = asArray(record.services);
  const fallbackService = toRecord(record.service);
  const serviceCandidates =
    servicesArray.length > 0
      ? servicesArray
      : fallbackService
        ? [fallbackService]
        : [];
  const firstService = toRecord(serviceCandidates[0]);

  const startAtRaw =
    toString(record.startAt) ||
    toString(record.startsAt) ||
    toString(record.start) ||
    toString(record.startDate) ||
    toString(record.appointmentAt);
  const endAtRaw =
    toString(record.endAt) ||
    toString(record.finishAt) ||
    toString(record.end) ||
    toString(record.endDate) ||
    startAtRaw;
  const startAt = new Date(startAtRaw || '');
  const endAt = new Date(endAtRaw || '');
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
    return null;
  }

  const createdAtRaw =
    toString(record.createdAt) || toString(record.updatedAt) || startAt.toISOString();
  const createdAt = new Date(createdAtRaw);

  const discountRecord = toRecord(record.discount);
  const discountType = toString(discountRecord?.type);
  const discountValueRaw = toNumber(discountRecord?.value) ?? toNumber(record.discountPercent);

  const amountAfterDiscount =
    toNumber(record.totalAmount) ??
    toNumber(record.finalAmount) ??
    toNumber(record.amountDue) ??
    toNumber(record.total) ??
    toNumber(record.sum) ??
    null;
  const amountBeforeDiscount =
    toNumber(record.originalAmount) ??
    toNumber(record.baseAmount) ??
    toNumber(record.subtotal) ??
    toNumber(record.priceTotal) ??
    amountAfterDiscount;

  let discountPercent: number | null = null;
  if (discountType === 'PERCENT' && discountValueRaw !== null) {
    discountPercent = discountValueRaw;
  } else if (
    amountBeforeDiscount !== null &&
    amountAfterDiscount !== null &&
    amountBeforeDiscount > 0
  ) {
    discountPercent =
      Math.round(((amountBeforeDiscount - amountAfterDiscount) / amountBeforeDiscount) * 1000) / 10;
  } else if (discountValueRaw !== null) {
    discountPercent = discountValueRaw;
  }

  return {
    id,
    staffId:
      toString(staffRecord?.id) ||
      toString(record.staffId) ||
      toString(record.specialistId) ||
      toString(record.masterId) ||
      toString(record.employeeId) ||
      '',
    staffName:
      toString(staffRecord?.name) ||
      toString(staffRecord?.fullName) ||
      toString(record.staffName) ||
      toString(record.specialistName) ||
      toString(record.masterName) ||
      'Специалист',
    clientId: toString(clientRecord?.id) || toString(record.clientId) || '',
    startAt,
    endAt: endAt.getTime() >= startAt.getTime() ? endAt : new Date(startAt.getTime() + 3_600_000),
    status: toString(record.status) || 'PENDING',
    clientName:
      toString(clientRecord?.name) ||
      toString(clientRecord?.fullName) ||
      toString(record.clientName) ||
      toString(record.customerName) ||
      'Клиент',
    clientPhone:
      toString(clientRecord?.phoneE164) ||
      toString(clientRecord?.phone) ||
      toString(clientRecord?.phoneNumber) ||
      toString(record.phone) ||
      '',
    serviceName:
      toString(firstService?.name) ||
      toString(record.serviceName) ||
      toString(record.servicesLabel) ||
      toString(record.title) ||
      'Услуга',
    amountBeforeDiscount,
    discountPercent,
    amountAfterDiscount,
    createdAt: Number.isNaN(createdAt.getTime()) ? startAt : createdAt,
  };
}

export function parseWorkingHours(value: unknown): Record<number, string[]> {
  const result: Record<number, string[]> = {};
  const dateToIsoDay = (raw: string) => {
    if (!raw) {
      return null;
    }
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }
    const day = parsed.getDay();
    return day === 0 ? 7 : day;
  };

  const normalizeTimeValue = (input: string) => {
    const clean = input.trim();
    const match = clean.match(/([01]\d|2[0-3]):([0-5]\d)/);
    if (!match) {
      return '';
    }
    return `${match[1]}:${match[2]}`;
  };

  const parseIntervalString = (input: string) => {
    const normalized = input.replace(/[–—]/g, '-').replace(/\s+/g, '');
    const tokens = normalized.match(/([01]\d|2[0-3]):([0-5]\d)/g);
    if (!tokens || tokens.length < 2) {
      return null;
    }
    const start = normalizeTimeValue(tokens[0]);
    const end = normalizeTimeValue(tokens[1]);
    if (!start || !end) {
      return null;
    }
    return {
      start,
      end,
    };
  };

  const pushRange = (day: number | null, startRaw: string, endRaw: string) => {
    if (!day) {
      return;
    }
    const start = normalizeTimeValue(startRaw);
    const end = normalizeTimeValue(endRaw);
    if (!start || !end) {
      return;
    }
    if (!result[day]) {
      result[day] = [];
    }
    const slot = `${start}-${end}`;
    if (!result[day].includes(slot)) {
      result[day].push(slot);
    }
  };

  const appendIntervalsFromValue = (day: number | null, source: unknown) => {
    if (!day) {
      return;
    }
    if (typeof source === 'string') {
      const parsed = parseIntervalString(source);
      if (parsed) {
        pushRange(day, parsed.start, parsed.end);
      }
      return;
    }

    if (Array.isArray(source)) {
      source.forEach((entry) => {
        appendIntervalsFromValue(day, entry);
      });
      return;
    }

    const record = toRecord(source);
    if (!record) {
      return;
    }

    const nestedIntervals =
      asArray(record.intervals).length > 0
        ? asArray(record.intervals)
        : asArray(record.slots).length > 0
          ? asArray(record.slots)
          : asArray(record.ranges).length > 0
            ? asArray(record.ranges)
            : asArray(record.times);
    if (nestedIntervals.length > 0) {
      nestedIntervals.forEach((entry) => appendIntervalsFromValue(day, entry));
      return;
    }

    const start =
      toString(record.startTime) ||
      toString(record.from) ||
      toString(record.start) ||
      toString(record.begin);
    const end =
      toString(record.endTime) ||
      toString(record.to) ||
      toString(record.end) ||
      toString(record.finish);

    if (start && end) {
      pushRange(day, start, end);
      return;
    }

    const slotText = toString(record.slot) || toString(record.interval) || toString(record.value);
    if (!slotText) {
      return;
    }
    const parsed = parseIntervalString(slotText);
    if (parsed) {
      pushRange(day, parsed.start, parsed.end);
    }
  };

  const dayFromRecord = (record: Record<string, unknown>) =>
    normalizeDay(
      toNumber(record.dayOfWeek) ??
        toNumber(record.weekday) ??
        toNumber(record.day) ??
        toNumber(record.isoDay) ??
        dayNameToIso(toString(record.dayOfWeek) || toString(record.weekday) || toString(record.day)) ??
        dateToIsoDay(
          toString(record.date) ||
            toString(record.dayDate) ||
            toString(record.workDate) ||
            toString(record.startAt) ||
            toString(record.start),
        ),
    );

  const appendRow = (row: unknown) => {
    const record = toRecord(row);
    if (!record) {
      return;
    }
    appendIntervalsFromValue(dayFromRecord(record), record);
  };

  let rows = extractItems(value);
  const valueRecord = toRecord(value);
  if (rows.length === 0 && valueRecord) {
    const workingHoursRows = extractItems(valueRecord.workingHours);
    const scheduleRows = extractItems(valueRecord.schedule);
    const daysRows = extractItems(valueRecord.days);
    if (workingHoursRows.length > 0) {
      rows = workingHoursRows;
    } else if (scheduleRows.length > 0) {
      rows = scheduleRows;
    } else if (daysRows.length > 0) {
      rows = daysRows;
    }
  }
  rows.forEach(appendRow);

  const mapCandidates = [
    valueRecord,
    toRecord(valueRecord?.workingHours),
    toRecord(valueRecord?.schedule),
    toRecord(valueRecord?.weekly),
    toRecord(valueRecord?.byDay),
    toRecord(valueRecord?.byWeekday),
    toRecord(valueRecord?.days),
  ].filter((item): item is Record<string, unknown> => Boolean(item));

  mapCandidates.forEach((mapValue) => {
    Object.entries(mapValue).forEach(([rawDay, dayValue]) => {
      const day = normalizeDay(toNumber(rawDay) ?? dayNameToIso(rawDay) ?? dateToIsoDay(rawDay));
      appendIntervalsFromValue(day, dayValue);
    });
  });

  return result;
}

export function extractItems(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }
  const record = toRecord(value);
  if (!record) {
    return [];
  }
  if (Array.isArray(record.items)) {
    return record.items;
  }
  if (Array.isArray(record.rows)) {
    return record.rows;
  }
  return [];
}
