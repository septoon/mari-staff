import type { ScheduleInterval } from '../types';

export const ONLINE_BOOKING_SLOT_STEP_MINUTES = 10;

export function isValidTime(value: string) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

export function timeValueToMinutes(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  if (![hours, minutes].every(Number.isFinite)) {
    return NaN;
  }
  return hours * 60 + minutes;
}

export function minutesToTimeValue(value: number) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function buildBookingSlotTimes(
  start: string,
  end: string,
  stepMinutes = ONLINE_BOOKING_SLOT_STEP_MINUTES,
  includeEnd = false,
) {
  if (!isValidTime(start) || !isValidTime(end)) {
    return [] as string[];
  }

  const startMinutes = timeValueToMinutes(start);
  const endMinutes = timeValueToMinutes(end);
  if (!Number.isFinite(startMinutes) || !Number.isFinite(endMinutes) || endMinutes <= startMinutes) {
    return [] as string[];
  }

  const result: string[] = [];
  for (
    let cursor = startMinutes;
    includeEnd ? cursor <= endMinutes : cursor < endMinutes;
    cursor += stepMinutes
  ) {
    result.push(minutesToTimeValue(cursor));
  }

  return result;
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
  bookingEnd = end,
  bookingSlots?: string[] | null
): ScheduleInterval {
  return {
    start,
    end,
    bookingStart,
    bookingEnd,
    bookingSlots: bookingSlots ?? null,
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
  if (interval.bookingSlots) {
    const slotStart = timeValueToMinutes(interval.bookingStart);
    const slotEnd = timeValueToMinutes(interval.bookingEnd);
    if (
      interval.bookingSlots.some((slot) => {
        if (!isValidTime(slot)) {
          return true;
        }
        const minutes = timeValueToMinutes(slot);
        return (
          !Number.isFinite(minutes) ||
          minutes < slotStart ||
          minutes >= slotEnd ||
          minutes % ONLINE_BOOKING_SLOT_STEP_MINUTES !== 0
        );
      })
    ) {
      return false;
    }
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

export function buildScheduleTemplateDates(
  startDate: Date,
  isoDays: number[],
  weeksAhead: number,
) {
  const days = new Set(
    isoDays.filter((day) => Number.isFinite(day) && day >= 1 && day <= 7),
  );
  const totalDays = Math.max(1, Math.floor(weeksAhead)) * 7;
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const result: Date[] = [];

  for (let offset = 0; offset < totalDays; offset += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + offset);
    const isoDay = date.getDay() === 0 ? 7 : date.getDay();
    if (days.has(isoDay)) {
      result.push(date);
    }
  }

  return result;
}

function clampTimeRange(start: number, end: number, min: number, max: number) {
  return {
    start: Math.max(start, min),
    end: Math.min(end, max),
  };
}

function buildSegmentFromInterval(
  interval: ScheduleInterval,
  segmentStart: number,
  segmentEnd: number,
): ScheduleInterval | null {
  if (segmentEnd <= segmentStart) {
    return null;
  }

  const bookingRange = clampTimeRange(
    timeValueToMinutes(interval.bookingStart),
    timeValueToMinutes(interval.bookingEnd),
    segmentStart,
    segmentEnd,
  );
  const start = minutesToTimeValue(segmentStart);
  const end = minutesToTimeValue(segmentEnd);

  if (bookingRange.end <= bookingRange.start) {
    return createScheduleInterval(start, end, start, end, []);
  }

  const bookingStart = minutesToTimeValue(bookingRange.start);
  const bookingEnd = minutesToTimeValue(bookingRange.end);
  const bookingSlots = interval.bookingSlots
    ? interval.bookingSlots.filter((slot) => {
        const minutes = timeValueToMinutes(slot);
        return minutes >= bookingRange.start && minutes < bookingRange.end;
      })
    : null;

  return createScheduleInterval(start, end, bookingStart, bookingEnd, bookingSlots);
}

export function subtractBreakFromScheduleIntervals(
  intervals: ScheduleInterval[],
  breakStart: string,
  breakEnd: string,
) {
  if (!isValidTime(breakStart) || !isValidTime(breakEnd)) {
    return null;
  }

  const breakStartMinutes = timeValueToMinutes(breakStart);
  const breakEndMinutes = timeValueToMinutes(breakEnd);
  if (breakEndMinutes <= breakStartMinutes) {
    return null;
  }

  const next: ScheduleInterval[] = [];
  let changed = false;

  intervals.forEach((interval) => {
    const intervalStart = timeValueToMinutes(interval.start);
    const intervalEnd = timeValueToMinutes(interval.end);
    if (!Number.isFinite(intervalStart) || !Number.isFinite(intervalEnd)) {
      return;
    }

    if (breakEndMinutes <= intervalStart || breakStartMinutes >= intervalEnd) {
      next.push(interval);
      return;
    }

    changed = true;
    const before = buildSegmentFromInterval(
      interval,
      intervalStart,
      Math.min(breakStartMinutes, intervalEnd),
    );
    const after = buildSegmentFromInterval(
      interval,
      Math.max(breakEndMinutes, intervalStart),
      intervalEnd,
    );

    if (before) {
      next.push(before);
    }
    if (after) {
      next.push(after);
    }
  });

  return changed ? next : null;
}

function isOnlineOpen(interval: ScheduleInterval) {
  return interval.bookingSlots == null || interval.bookingSlots.length > 0;
}

function explicitSlotTimesForInterval(interval: ScheduleInterval) {
  if (interval.bookingSlots != null) {
    return interval.bookingSlots;
  }
  return buildBookingSlotTimes(interval.bookingStart, interval.bookingEnd);
}

function mergeBookingSlots(
  left: ScheduleInterval,
  right: ScheduleInterval,
  bookingStart: string,
  bookingEnd: string,
  breakStart: string,
  breakEnd: string,
) {
  if (left.bookingSlots == null && right.bookingSlots == null) {
    return null;
  }

  const slots = new Set<string>();
  explicitSlotTimesForInterval(left).forEach((slot) => slots.add(slot));
  explicitSlotTimesForInterval(right).forEach((slot) => slots.add(slot));

  if (isOnlineOpen(left) && isOnlineOpen(right)) {
    buildBookingSlotTimes(
      breakStart > bookingStart ? breakStart : bookingStart,
      breakEnd < bookingEnd ? breakEnd : bookingEnd,
    ).forEach((slot) => slots.add(slot));
  }

  return Array.from(slots).sort((leftSlot, rightSlot) => leftSlot.localeCompare(rightSlot));
}

export function restoreBreakInScheduleIntervals(
  intervals: ScheduleInterval[],
  breakStart: string,
  breakEnd: string,
) {
  if (!isValidTime(breakStart) || !isValidTime(breakEnd)) {
    return null;
  }
  if (timeValueToMinutes(breakEnd) <= timeValueToMinutes(breakStart)) {
    return null;
  }

  const leftIndex = intervals.findIndex((interval) => interval.end === breakStart);
  const rightIndex = intervals.findIndex((interval) => interval.start === breakEnd);
  if (leftIndex < 0 || rightIndex < 0 || leftIndex === rightIndex) {
    return null;
  }

  const left = intervals[leftIndex]!;
  const right = intervals[rightIndex]!;
  const activeBookingStarts = [left, right]
    .filter(isOnlineOpen)
    .map((interval) => interval.bookingStart)
    .sort((leftTime, rightTime) => leftTime.localeCompare(rightTime));
  const activeBookingEnds = [left, right]
    .filter(isOnlineOpen)
    .map((interval) => interval.bookingEnd)
    .sort((leftTime, rightTime) => rightTime.localeCompare(leftTime));
  const bookingStart = activeBookingStarts[0] ?? left.start;
  const bookingEnd = activeBookingEnds[0] ?? right.end;
  const bookingSlots =
    activeBookingStarts.length === 0
      ? []
      : mergeBookingSlots(left, right, bookingStart, bookingEnd, breakStart, breakEnd);

  const merged = createScheduleInterval(left.start, right.end, bookingStart, bookingEnd, bookingSlots);
  const next = intervals
    .filter((_, index) => index !== leftIndex && index !== rightIndex)
    .concat(merged)
    .sort((leftInterval, rightInterval) => leftInterval.start.localeCompare(rightInterval.start));

  return next;
}
