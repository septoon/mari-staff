import { toFlatWorkingHours } from './schedule';

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
