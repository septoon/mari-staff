export const JOURNAL_CREATE_STEP_MINUTES = 10;

type BuildJournalCreateAppointmentPayloadInput = {
  clientName: string;
  clientPhone: string;
  comment?: string;
  serviceIds: string[];
  staffId: string;
  startAt: Date;
};

export function buildJournalCreateAppointmentPayload({
  clientName,
  clientPhone,
  comment,
  serviceIds,
  staffId,
  startAt,
}: BuildJournalCreateAppointmentPayloadInput) {
  return {
    startAt: startAt.toISOString(),
    staffId,
    anyStaff: false,
    serviceIds,
    client: {
      name: clientName.trim(),
      phone: clientPhone.trim(),
    },
    comment: comment?.trim() || undefined,
  };
}

export function isJournalCreateStartAligned(startAt: Date) {
  const stepMs = JOURNAL_CREATE_STEP_MINUTES * 60 * 1000;
  return startAt.getTime() % stepMs === 0;
}
