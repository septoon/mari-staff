import {
  filterAppointmentsByJournalScope,
  filterStaffByJournalScope,
  type JournalAccessScope,
} from './journalScope';

const restrictedScope: JournalAccessScope = {
  currentStaffId: 'master-1',
  currentStaffName: 'Анна',
  hasFullAccess: false,
};

test('filters journal appointments to current staff without full access', () => {
  const result = filterAppointmentsByJournalScope(
    [
      { id: 'a1', staffId: 'master-1', staffName: 'Анна' },
      { id: 'a2', staffId: 'master-2', staffName: 'Мария' },
    ],
    restrictedScope,
  );

  expect(result).toEqual([{ id: 'a1', staffId: 'master-1', staffName: 'Анна' }]);
});

test('falls back to staff name when appointment staff id is empty', () => {
  const result = filterAppointmentsByJournalScope(
    [
      { id: 'a1', staffId: '', staffName: ' Анна ' },
      { id: 'a2', staffId: '', staffName: 'Мария' },
    ],
    restrictedScope,
  );

  expect(result).toEqual([{ id: 'a1', staffId: '', staffName: ' Анна ' }]);
});

test('filters visible journal staff to current employee', () => {
  const result = filterStaffByJournalScope(
    [
      { id: 'master-1', name: 'Анна' },
      { id: 'master-2', name: 'Мария' },
    ],
    restrictedScope,
  );

  expect(result).toEqual([{ id: 'master-1', name: 'Анна' }]);
});

test('keeps all journal data with full access', () => {
  const scope: JournalAccessScope = {
    ...restrictedScope,
    hasFullAccess: true,
  };
  const appointments = [
    { id: 'a1', staffId: 'master-1', staffName: 'Анна' },
    { id: 'a2', staffId: 'master-2', staffName: 'Мария' },
  ];
  const staff = [
    { id: 'master-1', name: 'Анна' },
    { id: 'master-2', name: 'Мария' },
  ];

  expect(filterAppointmentsByJournalScope(appointments, scope)).toEqual(appointments);
  expect(filterStaffByJournalScope(staff, scope)).toEqual(staff);
});
