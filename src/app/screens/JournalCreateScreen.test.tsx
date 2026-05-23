import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { JournalCreateScreen } from './JournalCreateScreen';
import type { JournalCreateDraft, StaffItem } from '../types';

const baseDraft: JournalCreateDraft = {
  clientName: '',
  clientPhone: '',
  comment: '',
  dateValue: '2026-05-23',
  startTime: '10:00',
  durationMin: 60,
  durationManuallyChanged: false,
  finalTotal: '',
  finalTotalManuallyChanged: false,
  staffId: 'staff-1',
  serviceIds: [],
};

const staff: StaffItem[] = [
  {
    id: 'staff-1',
    name: 'Амаля',
    role: 'OWNER',
    phoneE164: '+79780000000',
    email: null,
    receivesAllAppointmentNotifications: false,
    avatarUrl: null,
    avatarAssetId: null,
    isActive: true,
    hiredAt: null,
    firedAt: null,
    deletedAt: null,
    positionName: null,
    ratingAverage: null,
    ratingsCount: 0,
    appointmentsCount: 0,
  },
];

test('uses native time input for journal create duration', () => {
  const onDraftChange = jest.fn();
  window.matchMedia = jest.fn().mockReturnValue({
    matches: false,
    media: '(min-width: 768px)',
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  });

  render(
    <JournalCreateScreen
      draft={baseDraft}
      selectedDate={new Date('2026-05-23T00:00:00')}
      clients={[]}
      staff={staff}
      services={[]}
      loading={false}
      servicesLoading={false}
      canEditFinalTotal
      onBack={jest.fn()}
      onDraftChange={onDraftChange}
      onSave={jest.fn()}
    />,
  );

  const durationInput = screen.getAllByLabelText('Длительность')[0] as HTMLInputElement;
  expect(durationInput.type).toBe('time');
  expect(durationInput.value).toBe('01:00');
  expect(durationInput.min).toBe('00:01');
  expect(durationInput.step).toBe('60');

  fireEvent.change(durationInput, { target: { value: '01:17' } });

  expect(onDraftChange).toHaveBeenCalledWith({
    durationMin: 77,
    durationManuallyChanged: true,
  });
});
