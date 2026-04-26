import {
  buildUnavailableBookingRanges,
  isStaffAcceptingAt,
} from './scheduleAvailability';
import type { ScheduleInterval } from './types';

const interval = (
  overrides: Partial<ScheduleInterval> = {},
): ScheduleInterval => ({
  start: '10:00',
  end: '18:00',
  bookingStart: '11:00',
  bookingEnd: '17:00',
  bookingSlots: null,
  ...overrides,
});

test('uses booking interval instead of full shift for accepting time', () => {
  const intervals = [interval()];

  expect(isStaffAcceptingAt(intervals, '10:30')).toBe(false);
  expect(isStaffAcceptingAt(intervals, '11:00')).toBe(true);
  expect(isStaffAcceptingAt(intervals, '16:50')).toBe(true);
  expect(isStaffAcceptingAt(intervals, '17:00')).toBe(false);
});

test('respects explicit booking slot times', () => {
  const intervals = [interval({ bookingSlots: ['11:00', '11:20'] })];

  expect(isStaffAcceptingAt(intervals, '11:00')).toBe(true);
  expect(isStaffAcceptingAt(intervals, '11:10')).toBe(false);
  expect(isStaffAcceptingAt(intervals, '11:20')).toBe(true);
});

test('builds unavailable ranges at ten minute granularity', () => {
  const ranges = buildUnavailableBookingRanges(
    [interval({ bookingStart: '10:00', bookingEnd: '10:40', bookingSlots: ['10:10', '10:30'] })],
    10 * 60,
    11 * 60,
  );

  expect(ranges).toEqual([
    { startMinutes: 600, endMinutes: 610 },
    { startMinutes: 620, endMinutes: 630 },
    { startMinutes: 640, endMinutes: 660 },
  ]);
});
