export const JOURNAL_CREATE_STEP_MINUTES = 10;

type BuildJournalCreateAppointmentPayloadInput = {
  clientName: string;
  clientPhone: string;
  serviceId: string;
  staffId: string;
  startAt: Date;
};

export function buildJournalCreateAppointmentPayload({
  clientName,
  clientPhone,
  serviceId,
  staffId,
  startAt,
}: BuildJournalCreateAppointmentPayloadInput) {
  return {
    startAt: startAt.toISOString(),
    staffId,
    anyStaff: false,
    serviceIds: [serviceId],
    client: {
      name: clientName.trim(),
      phone: clientPhone.trim(),
    },
  };
}

export function isJournalCreateStartAligned(startAt: Date) {
  const stepMs = JOURNAL_CREATE_STEP_MINUTES * 60 * 1000;
  return startAt.getTime() % stepMs === 0;
}
