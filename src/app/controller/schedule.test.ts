import { toFlatWorkingHours } from './schedule';

test('toFlatWorkingHours keeps weekdays and normalizes sunday to backend format', () => {
  expect(
    toFlatWorkingHours({
      1: ['10:00-18:00'],
      7: ['11:00-16:00'],
    }),
  ).toEqual([
    {
      dayOfWeek: 1,
      startTime: '10:00',
      endTime: '18:00',
    },
    {
      dayOfWeek: 0,
      startTime: '11:00',
      endTime: '16:00',
    },
  ]);
});
