import { parseAppointment, parseClient } from './parsers';

test('parseAppointment reads nested prices from appointments list payload', () => {
  const appointment = parseAppointment({
    id: 'appt-1',
    status: 'CONFIRMED',
    startAt: '2026-03-10T07:30:00.000Z',
    endAt: '2026-03-10T08:30:00.000Z',
    createdAt: '2026-03-09T10:00:00.000Z',
    staff: {
      id: 'staff-1',
      name: 'Виктория',
    },
    client: {
      id: 'client-1',
      name: 'Эльмира',
      phoneE164: '+79788633657',
    },
    services: [
      {
        id: 'service-1',
        name: 'Объем 2Д',
      },
    ],
    prices: {
      baseTotal: 2500,
      finalTotal: 2100,
    },
    payment: {
      paidAmount: 1200,
    },
    promo: {
      discountType: 'PERCENT',
      discountValue: 16,
    },
  });

  expect(appointment).not.toBeNull();
  expect(appointment?.amountBeforeDiscount).toBe(2500);
  expect(appointment?.amountAfterDiscount).toBe(2100);
  expect(appointment?.paidAmount).toBe(1200);
  expect(appointment?.discountPercent).toBe(16);
});

test('parseClient reads phoneNumber when phoneE164 is absent', () => {
  const client = parseClient({
    id: 'client-1',
    name: 'Анастасия',
    phoneNumber: '9784733940',
  });

  expect(client).not.toBeNull();
  expect(client?.phone).toBe('9784733940');
});
