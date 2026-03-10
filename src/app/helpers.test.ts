import { appointmentMatchesClient } from './helpers';
import type { AppointmentItem } from './types';

function makeAppointment(overrides: Partial<AppointmentItem> = {}): AppointmentItem {
  return {
    id: 'appt-1',
    staffId: 'staff-1',
    staffName: 'Сусанна',
    clientId: 'client-1',
    startAt: new Date('2026-03-10T10:00:00.000Z'),
    endAt: new Date('2026-03-10T11:00:00.000Z'),
    status: 'PENDING',
    clientName: 'Анастасия',
    clientPhone: '+79784733940',
    serviceName: 'Маникюр',
    amountBeforeDiscount: 1500,
    discountPercent: null,
    amountAfterDiscount: 1500,
    paidAmount: 0,
    createdAt: new Date('2026-03-09T10:00:00.000Z'),
    ...overrides,
  };
}

test('appointmentMatchesClient matches by phone even when client ids differ', () => {
  const appointment = makeAppointment({ clientId: 'client-legacy' });

  expect(
    appointmentMatchesClient(appointment, {
      id: 'client-current',
      name: 'Анастасия',
      phone: '+79784733940',
    }),
  ).toBe(true);
});

test('appointmentMatchesClient matches by phone when client phone is stored as 10 local digits', () => {
  const appointment = makeAppointment({ clientId: 'client-legacy' });

  expect(
    appointmentMatchesClient(appointment, {
      id: 'client-current',
      name: 'Анастасия',
      phone: '9784733940',
    }),
  ).toBe(true);
});
