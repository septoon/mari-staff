import type { ScheduleInterval } from './types';

const DEFAULT_SLOT_STEP_MINUTES = 10;

export function timeValueToMinutes(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return NaN;
  }
  return hours * 60 + minutes;
}

export function isStartTimeAccepting(interval: ScheduleInterval, time: string) {
  const startMinutes = timeValueToMinutes(time);
  const bookingStartMinutes = timeValueToMinutes(interval.bookingStart);
  const bookingEndMinutes = timeValueToMinutes(interval.bookingEnd);

  if (
    !Number.isFinite(startMinutes) ||
    !Number.isFinite(bookingStartMinutes) ||
    !Number.isFinite(bookingEndMinutes)
  ) {
    return false;
  }

  if (startMinutes < bookingStartMinutes || startMinutes >= bookingEndMinutes) {
    return false;
  }

  if (interval.bookingSlots) {
    return interval.bookingSlots.includes(time);
  }

  return true;
}

export function isStaffAcceptingAt(
  intervals: ScheduleInterval[],
  time: string,
) {
  return intervals.some((interval) => isStartTimeAccepting(interval, time));
}

export function buildUnavailableBookingRanges(
  intervals: ScheduleInterval[],
  startMinutes: number,
  endMinutes: number,
  stepMinutes = DEFAULT_SLOT_STEP_MINUTES,
) {
  const ranges: Array<{ startMinutes: number; endMinutes: number }> = [];
  let activeStart: number | null = null;

  for (let cursor = startMinutes; cursor < endMinutes; cursor += stepMinutes) {
    const time = `${String(Math.floor(cursor / 60)).padStart(2, '0')}:${String(cursor % 60).padStart(2, '0')}`;
    const accepting = isStaffAcceptingAt(intervals, time);

    if (!accepting && activeStart === null) {
      activeStart = cursor;
    }

    if ((accepting || cursor + stepMinutes >= endMinutes) && activeStart !== null) {
      ranges.push({
        startMinutes: activeStart,
        endMinutes: accepting ? cursor : Math.min(cursor + stepMinutes, endMinutes),
      });
      activeStart = null;
    }
  }

  return ranges;
}
