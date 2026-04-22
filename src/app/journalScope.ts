export type JournalAccessScope = {
  currentStaffId: string | null;
  currentStaffName: string | null;
  hasFullAccess: boolean;
};

type AppointmentScopeTarget = {
  staffId: string;
  staffName: string;
};

type StaffScopeTarget = {
  id: string;
  name: string;
};

const normalize = (value: string | null | undefined) => value?.trim().toLowerCase() ?? '';

export function filterAppointmentsByJournalScope<T extends AppointmentScopeTarget>(
  items: T[],
  scope: JournalAccessScope,
): T[] {
  if (scope.hasFullAccess) {
    return items;
  }

  const currentStaffId = scope.currentStaffId?.trim() ?? '';
  const currentStaffName = normalize(scope.currentStaffName);
  if (!currentStaffId && !currentStaffName) {
    return [];
  }

  return items.filter((item) => {
    if (currentStaffId && item.staffId === currentStaffId) {
      return true;
    }
    if (!currentStaffName) {
      return false;
    }
    return normalize(item.staffName) === currentStaffName;
  });
}

export function filterStaffByJournalScope<T extends StaffScopeTarget>(
  items: T[],
  scope: JournalAccessScope,
): T[] {
  if (scope.hasFullAccess) {
    return items;
  }

  const currentStaffId = scope.currentStaffId?.trim() ?? '';
  const currentStaffName = normalize(scope.currentStaffName);
  if (!currentStaffId && !currentStaffName) {
    return [];
  }

  const byId = currentStaffId ? items.filter((item) => item.id === currentStaffId) : [];
  if (byId.length > 0) {
    return byId;
  }

  if (!currentStaffName) {
    return [];
  }

  return items.filter((item) => normalize(item.name) === currentStaffName);
}
