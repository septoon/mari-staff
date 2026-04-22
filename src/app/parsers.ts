import type {
  AppointmentItem,
  ClientItem,
  ScheduleInterval,
  ServiceCategoryItem,
  ServiceSectionItem,
  ServiceItem,
  StaffItem,
} from './types';
import {
  asArray,
  dayNameToIso,
  normalizeDay,
  toDate,
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
    receivesAllAppointmentNotifications: Boolean(record.receivesAllAppointmentNotifications),
    avatarUrl:
      toNullableString(record.avatarUrl) ||
      toNullableString(record.photoUrl) ||
      toNullableString(record.imageUrl),
    avatarAssetId:
      toNullableString(record.avatarAssetId) ||
      toNullableString(record.photoAssetId),
    isActive: Boolean(record.isActive ?? true),
    hiredAt: toDate(record.hiredAt),
    firedAt: toDate(record.firedAt),
    deletedAt: toDate(record.deletedAt),
    positionName: toNullableString(positionRecord?.name),
    ratingAverage: toNumber(record.ratingAverage),
    ratingsCount: toNumber(record.ratingsCount) ?? 0,
    appointmentsCount: toNumber(record.appointmentsCount) ?? 0,
  };
}

export function parseClient(value: unknown): ClientItem | null {
  const record = toRecord(value);
  if (!record) {
    return null;
  }
  const discountRecord = toRecord(record.discount);
  const permanentDiscountRecord = toRecord(discountRecord?.permanent);
  const id = toString(record.id);
  const phone =
    toString(record.phoneE164) ||
    toString(record.phoneNumber) ||
    toString(record.phone) ||
    '';
  const name =
    toString(record.name) ||
    toString(record.fullName) ||
    phone ||
    'Клиент';
  if (!id) {
    return null;
  }
  return {
    id,
    name,
    phone,
    email: toString(record.email),
    comment: toString(record.comment),
    avatarUrl:
      toNullableString(record.avatarUrl) ||
      toNullableString(record.photoUrl) ||
      toNullableString(record.imageUrl),
    permanentDiscountType:
      toString(permanentDiscountRecord?.type) ||
      toString(record.discountType) ||
      'NONE',
    permanentDiscountValue:
      toNumber(permanentDiscountRecord?.value) ??
      toNumber(record.discountValue) ??
      null,
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
    imageAssetId: toNullableString(record.imageAssetId),
    imageUrl:
      toNullableString(record.imageUrl) ||
      toNullableString(categoryRecord?.imageUrl) ||
      toNullableString(record.photoUrl) ||
      toNullableString(record.pictureUrl),
    isActive: Boolean(record.isActive ?? true),
    durationSec: toNumber(record.durationSec) ?? 0,
    priceMin: toNumber(record.priceMin) ?? 0,
    priceMax: toNumber(record.priceMax) ?? toNumber(record.priceMin) ?? 0,
  };
}

export function parseServiceCategory(value: unknown): ServiceCategoryItem | null {
  const record = toRecord(value);
  if (!record) {
    return null;
  }
  const id = toString(record.id);
  const name = toString(record.name);
  const sectionRecord = toRecord(record.section);
  if (!id || !name) {
    return null;
  }
  return {
    id,
    name,
    count: toNumber(record.count) ?? 0,
    imageAssetId: toNullableString(record.imageAssetId),
    imageUrl:
      toNullableString(record.imageUrl) ||
      toNullableString(record.photoUrl) ||
      toNullableString(record.pictureUrl),
    sectionId:
      toNullableString(record.sectionId) ||
      toNullableString(sectionRecord?.id),
    sectionName:
      toNullableString(sectionRecord?.name) ||
      null,
  };
}

export function parseServiceSection(value: unknown): ServiceSectionItem | null {
  const record = toRecord(value);
  if (!record) {
    return null;
  }
  const id = toString(record.id);
  const name = toString(record.name);
  if (!id || !name) {
    return null;
  }

  return {
    id,
    name,
    imageAssetId: toNullableString(record.imageAssetId),
    imageUrl:
      toNullableString(record.imageUrl) ||
      toNullableString(record.photoUrl) ||
      toNullableString(record.pictureUrl),
    orderIndex: toNumber(record.orderIndex) ?? 0,
    categoriesCount: toNumber(record.categoriesCount) ?? 0,
    servicesCount: toNumber(record.servicesCount) ?? 0,
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

  const pricesRecord = toRecord(record.prices);
  const promoRecord = toRecord(record.promo);
  const paymentRecord = toRecord(record.payment);
  const discountRecord = toRecord(record.discount) || promoRecord;
  const discountType =
    toString(discountRecord?.type) || toString(discountRecord?.discountType);
  const discountValueRaw =
    toNumber(discountRecord?.value) ??
    toNumber(discountRecord?.discountValue) ??
    toNumber(record.discountPercent);

  const amountAfterDiscount =
    toNumber(pricesRecord?.finalTotal) ??
    toNumber(record.totalAmount) ??
    toNumber(record.finalAmount) ??
    toNumber(record.amountDue) ??
    toNumber(record.total) ??
    toNumber(record.sum) ??
    null;
  const amountBeforeDiscount =
    toNumber(pricesRecord?.baseTotal) ??
    toNumber(record.originalAmount) ??
    toNumber(record.baseAmount) ??
    toNumber(record.subtotal) ??
    toNumber(record.priceTotal) ??
    amountAfterDiscount;
  const paidAmount =
    toNumber(paymentRecord?.paidAmount) ??
    toNumber(record.paidAmount) ??
    null;

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
    paidAmount,
    createdAt: Number.isNaN(createdAt.getTime()) ? startAt : createdAt,
  };
}

const normalizeScheduleTimeValue = (input: string) => {
  const clean = input.trim();
  const match = clean.match(/([01]\d|2[0-3]):([0-5]\d)/);
  if (!match) {
    return '';
  }
  return `${match[1]}:${match[2]}`;
};

const parseScheduleIntervalString = (input: string) => {
  const normalized = input.replace(/[–—]/g, '-').replace(/\s+/g, '');
  const tokens = normalized.match(/([01]\d|2[0-3]):([0-5]\d)/g);
  if (!tokens || tokens.length < 2) {
    return null;
  }
  const start = normalizeScheduleTimeValue(tokens[0]);
  const end = normalizeScheduleTimeValue(tokens[1]);
  if (!start || !end) {
    return null;
  }
  return { start, end };
};

const createParsedScheduleInterval = (
  startRaw: string,
  endRaw: string,
  bookingStartRaw?: string,
  bookingEndRaw?: string,
  bookingSlotTimesRaw?: unknown,
): ScheduleInterval | null => {
  const start = normalizeScheduleTimeValue(startRaw);
  const end = normalizeScheduleTimeValue(endRaw);
  if (!start || !end || start >= end) {
    return null;
  }

  const bookingStart = normalizeScheduleTimeValue(bookingStartRaw || '') || start;
  const bookingEnd = normalizeScheduleTimeValue(bookingEndRaw || '') || end;
  if (bookingStart >= bookingEnd || bookingStart < start || bookingEnd > end) {
    return null;
  }

  const bookingSlotsSource = Array.isArray(bookingSlotTimesRaw) ? bookingSlotTimesRaw : [];
  const bookingSlots = bookingSlotsSource
    .map((value) => normalizeScheduleTimeValue(toString(value)))
    .filter(Boolean)
    .filter((value, index, items) => items.indexOf(value) === index)
    .filter((value) => value >= bookingStart && value < bookingEnd)
    .sort();

  return {
    start,
    end,
    bookingStart,
    bookingEnd,
    bookingSlots: Array.isArray(bookingSlotTimesRaw) ? bookingSlots : null,
  };
};

const pushScheduleInterval = (
  target: Record<string, ScheduleInterval[]>,
  key: string | number | null,
  interval: ScheduleInterval | null,
) => {
  const normalizedKey = key === null ? '' : String(key);
  if (!normalizedKey || !interval) {
    return;
  }
  if (!target[normalizedKey]) {
    target[normalizedKey] = [];
  }
  if (
    target[normalizedKey].some(
      (item) =>
        item.start === interval.start &&
        item.end === interval.end &&
        item.bookingStart === interval.bookingStart &&
        item.bookingEnd === interval.bookingEnd &&
        JSON.stringify(item.bookingSlots ?? null) === JSON.stringify(interval.bookingSlots ?? null),
    )
  ) {
    return;
  }
  target[normalizedKey].push(interval);
};

const readScheduleIntervalFromRecord = (record: Record<string, unknown>) => {
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

  if (!start || !end) {
    const slotText = toString(record.slot) || toString(record.interval) || toString(record.value);
    const parsed = slotText ? parseScheduleIntervalString(slotText) : null;
    return parsed ? createParsedScheduleInterval(parsed.start, parsed.end) : null;
  }

  return createParsedScheduleInterval(
    start,
    end,
    toString(record.bookingStartTime) ||
      toString(record.onlineStartTime) ||
      toString(record.availableStartTime) ||
      toString(record.bookingFrom),
    toString(record.bookingEndTime) ||
      toString(record.onlineEndTime) ||
      toString(record.availableEndTime) ||
      toString(record.bookingTo),
    record.bookingSlotTimes,
  );
};

export function parseWorkingHours(value: unknown): Record<string, ScheduleInterval[]> {
  const result: Record<string, ScheduleInterval[]> = {};
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

  const appendIntervalsFromValue = (day: number | null, source: unknown) => {
    if (!day) {
      return;
    }
    if (typeof source === 'string') {
      const parsed = parseScheduleIntervalString(source);
      if (parsed) {
        pushScheduleInterval(result, day, createParsedScheduleInterval(parsed.start, parsed.end));
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

    pushScheduleInterval(result, day, readScheduleIntervalFromRecord(record));
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

export function parseScheduleCalendar(value: unknown): Record<string, ScheduleInterval[]> {
  const result: Record<string, ScheduleInterval[]> = {};

  const normalizeDateKey = (raw: string) => {
    const clean = raw.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
      return clean;
    }
    const parsed = new Date(clean);
    if (Number.isNaN(parsed.getTime())) {
      return '';
    }
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const appendIntervalsFromValue = (dateKey: string, source: unknown) => {
    if (!dateKey) {
      return;
    }
    if (typeof source === 'string') {
      const parsed = parseScheduleIntervalString(source);
      if (parsed) {
        pushScheduleInterval(result, dateKey, createParsedScheduleInterval(parsed.start, parsed.end));
      }
      return;
    }

    if (Array.isArray(source)) {
      source.forEach((entry) => appendIntervalsFromValue(dateKey, entry));
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
      nestedIntervals.forEach((entry) => appendIntervalsFromValue(dateKey, entry));
      return;
    }

    pushScheduleInterval(result, dateKey, readScheduleIntervalFromRecord(record));
  };

  const appendRow = (row: unknown) => {
    const record = toRecord(row);
    if (!record) {
      return;
    }
    const dateKey = normalizeDateKey(
      toString(record.date) ||
        toString(record.dayDate) ||
        toString(record.workDate) ||
        toString(record.startAt) ||
        toString(record.start),
    );
    appendIntervalsFromValue(dateKey, record);
  };

  let rows = extractItems(value);
  const valueRecord = toRecord(value);
  if (rows.length === 0 && valueRecord) {
    const scheduleRows = extractItems(valueRecord.schedule);
    const daysRows = extractItems(valueRecord.days);
    if (scheduleRows.length > 0) {
      rows = scheduleRows;
    } else if (daysRows.length > 0) {
      rows = daysRows;
    }
  }
  rows.forEach(appendRow);

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
