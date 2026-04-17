import type { ScheduleInterval } from '../types';

export function isValidTime(value: string) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

export function parseSlot(slot: string) {
  const [start, end] = slot.split('-').map((value) => value.trim());
  if (!start || !end) {
    return null;
  }
  return { start, end };
}

export function createScheduleInterval(
  start = '10:00',
  end = '18:00',
  bookingStart = start,
  bookingEnd = end
): ScheduleInterval {
  return {
    start,
    end,
    bookingStart,
    bookingEnd,
  };
}

export function isScheduleIntervalValid(interval: ScheduleInterval) {
  if (
    !isValidTime(interval.start) ||
    !isValidTime(interval.end) ||
    !isValidTime(interval.bookingStart) ||
    !isValidTime(interval.bookingEnd)
  ) {
    return false;
  }
  if (interval.start >= interval.end) {
    return false;
  }
  if (interval.bookingStart >= interval.bookingEnd) {
    return false;
  }
  if (interval.bookingStart < interval.start || interval.bookingEnd > interval.end) {
    return false;
  }
  return true;
}

export function toFlatWorkingHours(hours: Record<number, ScheduleInterval[]>) {
  const items: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    bookingStartTime: string;
    bookingEndTime: string;
  }> = [];

  Object.entries(hours).forEach(([rawDay, intervals]) => {
    const day = Number(rawDay);
    if (!Number.isFinite(day) || day < 1 || day > 7) {
      return;
    }

    intervals.forEach((interval) => {
      if (!isScheduleIntervalValid(interval)) {
        return;
      }
      items.push({
        dayOfWeek: day === 7 ? 0 : day,
        startTime: interval.start,
        endTime: interval.end,
        bookingStartTime: interval.bookingStart,
        bookingEndTime: interval.bookingEnd,
      });
    });
  });

  return items;
}

export function deriveEditorInterval(hours: Record<string, ScheduleInterval[]>, days: number[]) {
  for (const day of days) {
    const interval = hours[String(day)]?.[0];
    if (interval) {
      return interval;
    }
  }

  const firstInterval = Object.values(hours).flatMap((items) => items)[0];
  return firstInterval || createScheduleInterval();
}

export function formatScheduleRangeLabel(interval: ScheduleInterval) {
  return `${interval.start}-${interval.end}`;
}

export function formatBookingRangeLabel(interval: ScheduleInterval) {
  return `${interval.bookingStart}-${interval.bookingEnd}`;
}

export function calculateScheduleIntervalHours(interval: ScheduleInterval) {
  const [startHour, startMinute] = interval.start.split(':').map(Number);
  const [endHour, endMinute] = interval.end.split(':').map(Number);
  if (![startHour, startMinute, endHour, endMinute].every(Number.isFinite)) {
    return 0;
  }
  let durationMin = endHour * 60 + endMinute - (startHour * 60 + startMinute);
  if (durationMin < 0) {
    durationMin += 24 * 60;
  }
  return durationMin / 60;
}
