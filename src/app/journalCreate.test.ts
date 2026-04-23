import {
  buildJournalCreateAppointmentPayload,
  isJournalCreateStartAligned,
  JOURNAL_CREATE_STEP_MINUTES,
} from './journalCreate';

test('buildJournalCreateAppointmentPayload matches backend contract', () => {
  expect(
    buildJournalCreateAppointmentPayload({
      startAt: new Date('2026-03-20T10:30:00.000Z'),
      staffId: 'staff-1',
      serviceIds: ['service-1', 'service-2'],
      clientName: ' Анна ',
      clientPhone: ' +79780000000 ',
      comment: '  Комментарий к записи  ',
    }),
  ).toEqual({
    startAt: '2026-03-20T10:30:00.000Z',
    staffId: 'staff-1',
    anyStaff: false,
    serviceIds: ['service-1', 'service-2'],
    client: {
      name: 'Анна',
      phone: '+79780000000',
    },
    comment: 'Комментарий к записи',
  });
});

test('buildJournalCreateAppointmentPayload allows empty client fields', () => {
  expect(
    buildJournalCreateAppointmentPayload({
      startAt: new Date('2026-03-20T10:30:00.000Z'),
      staffId: 'staff-1',
      serviceIds: ['service-1'],
      clientName: '   ',
      clientPhone: '   ',
    }),
  ).toEqual({
    startAt: '2026-03-20T10:30:00.000Z',
    staffId: 'staff-1',
    anyStaff: false,
    serviceIds: ['service-1'],
    client: {
      name: '',
      phone: '',
    },
    comment: undefined,
  });
});

test(`isJournalCreateStartAligned accepts ${JOURNAL_CREATE_STEP_MINUTES}-minute slots only`, () => {
  expect(isJournalCreateStartAligned(new Date('2026-03-20T10:30:00.000Z'))).toBe(true);
  expect(isJournalCreateStartAligned(new Date('2026-03-20T10:35:00.000Z'))).toBe(false);
});
