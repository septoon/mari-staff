import {
  buildJournalCreateAppointmentPayload,
  formatJournalCreateDurationTime,
  formatJournalCreateSaveError,
  isJournalCreateStartAligned,
  JOURNAL_CREATE_STEP_MINUTES,
  parseJournalCreateDurationTime,
} from './journalCreate';
import { ApiError } from '../api';

test('buildJournalCreateAppointmentPayload matches backend contract', () => {
  expect(
    buildJournalCreateAppointmentPayload({
      startAt: new Date('2026-03-20T10:30:00.000Z'),
      endAt: new Date('2026-03-20T11:30:00.000Z'),
      staffId: 'staff-1',
      serviceIds: ['service-1', 'service-2'],
      clientName: ' Анна ',
      clientPhone: ' +79780000000 ',
      comment: '  Комментарий к записи  ',
      finalTotalPrice: 2500,
    }),
  ).toEqual({
    startAt: '2026-03-20T10:30:00.000Z',
    endAt: '2026-03-20T11:30:00.000Z',
    staffId: 'staff-1',
    anyStaff: false,
    serviceIds: ['service-1', 'service-2'],
    client: {
      name: 'Анна',
      phone: '+79780000000',
    },
    comment: 'Комментарий к записи',
    finalTotalPrice: 2500,
  });
});

test('buildJournalCreateAppointmentPayload allows empty client fields', () => {
  expect(
    buildJournalCreateAppointmentPayload({
      startAt: new Date('2026-03-20T10:30:00.000Z'),
      endAt: new Date('2026-03-20T11:30:00.000Z'),
      staffId: 'staff-1',
      serviceIds: [],
      clientName: '   ',
      clientPhone: '   ',
    }),
  ).toEqual({
    startAt: '2026-03-20T10:30:00.000Z',
    endAt: '2026-03-20T11:30:00.000Z',
    staffId: 'staff-1',
    anyStaff: false,
    serviceIds: [],
    comment: undefined,
  });
});

test(`isJournalCreateStartAligned accepts ${JOURNAL_CREATE_STEP_MINUTES}-minute slots only`, () => {
  expect(isJournalCreateStartAligned(new Date('2026-03-20T10:30:00.000Z'))).toBe(true);
  expect(isJournalCreateStartAligned(new Date('2026-03-20T10:35:00.000Z'))).toBe(false);
});

test('formats and parses journal create duration as native time value', () => {
  expect(formatJournalCreateDurationTime(1)).toBe('00:01');
  expect(formatJournalCreateDurationTime(75)).toBe('01:15');
  expect(formatJournalCreateDurationTime(0)).toBe('');

  expect(parseJournalCreateDurationTime('00:01')).toBe(1);
  expect(parseJournalCreateDurationTime('01:15')).toBe(75);
  expect(parseJournalCreateDurationTime('00:00')).toBeNull();
  expect(parseJournalCreateDurationTime('24:00')).toBeNull();
  expect(parseJournalCreateDurationTime('bad')).toBeNull();
});

test('formatJournalCreateSaveError explains common backend errors in Russian', () => {
  expect(
    formatJournalCreateSaveError(
      new ApiError('Appointment overlaps with existing booking', 409, 'CONFLICT'),
    ),
  ).toBe('На это время уже есть запись или пересечение в расписании. Выберите другое время.');

  expect(
    formatJournalCreateSaveError(
      new ApiError('Invalid phone', 422, 'VALIDATION_ERROR', { field: 'client.phone' }),
    ),
  ).toBe('Телефон клиента указан в неверном формате. Исправьте номер или оставьте поле пустым.');

  expect(
    formatJournalCreateSaveError(
      new ApiError('Outside working schedule', 422, 'VALIDATION_ERROR', { field: 'startAt' }),
    ),
  ).toBe('Сотрудник не принимает запись в выбранное время. Проверьте график или выберите другой слот.');
});
