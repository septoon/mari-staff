import {
  restoreBreakInScheduleIntervals,
  subtractBreakFromScheduleIntervals,
  toFlatWorkingHours,
} from './schedule';

test('toFlatWorkingHours keeps weekdays and normalizes sunday to backend format', () => {
  expect(
    toFlatWorkingHours({
      1: [{ start: '10:00', end: '18:00', bookingStart: '11:00', bookingEnd: '17:00' }],
      7: [{ start: '11:00', end: '16:00', bookingStart: '11:00', bookingEnd: '16:00' }],
    }),
  ).toEqual([
    {
      dayOfWeek: 1,
      startTime: '10:00',
      endTime: '18:00',
      bookingStartTime: '11:00',
      bookingEndTime: '17:00',
    },
    {
      dayOfWeek: 0,
      startTime: '11:00',
      endTime: '16:00',
      bookingStartTime: '11:00',
      bookingEndTime: '16:00',
    },
  ]);
});

test('subtractBreakFromScheduleIntervals splits shift around break', () => {
  expect(
    subtractBreakFromScheduleIntervals(
      [{ start: '10:00', end: '19:00', bookingStart: '10:00', bookingEnd: '19:00', bookingSlots: null }],
      '13:00',
      '14:00',
    ),
  ).toEqual([
    { start: '10:00', end: '13:00', bookingStart: '10:00', bookingEnd: '13:00', bookingSlots: null },
    { start: '14:00', end: '19:00', bookingStart: '14:00', bookingEnd: '19:00', bookingSlots: null },
  ]);
});

test('subtractBreakFromScheduleIntervals removes explicit online slots inside break', () => {
  expect(
    subtractBreakFromScheduleIntervals(
      [
        {
          start: '10:00',
          end: '15:00',
          bookingStart: '10:00',
          bookingEnd: '15:00',
          bookingSlots: ['10:00', '12:00', '14:00'],
        },
      ],
      '11:00',
      '13:00',
    ),
  ).toEqual([
    { start: '10:00', end: '11:00', bookingStart: '10:00', bookingEnd: '11:00', bookingSlots: ['10:00'] },
    { start: '13:00', end: '15:00', bookingStart: '13:00', bookingEnd: '15:00', bookingSlots: ['14:00'] },
  ]);
});

test('restoreBreakInScheduleIntervals merges split break back into shift', () => {
  expect(
    restoreBreakInScheduleIntervals(
      [
        { start: '10:00', end: '13:00', bookingStart: '10:00', bookingEnd: '13:00', bookingSlots: null },
        { start: '14:00', end: '19:00', bookingStart: '14:00', bookingEnd: '19:00', bookingSlots: null },
      ],
      '13:00',
      '14:00',
    ),
  ).toEqual([
    { start: '10:00', end: '19:00', bookingStart: '10:00', bookingEnd: '19:00', bookingSlots: null },
  ]);
});
