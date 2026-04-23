import {
  buildJournalCreateAppointmentPayload,
  formatJournalCreateSaveError,
  isJournalCreateStartAligned,
  JOURNAL_CREATE_STEP_MINUTES,
} from './journalCreate';
import { ApiError } from '../api';

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
