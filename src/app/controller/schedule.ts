export function isValidTime(value: string) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

export function parseSlot(slot: string) {
  const [start, end] = slot.split('-').map((value) => value.trim());
  if (!start || !end) {
    return null;
  }
  return { start, end };
}

export function toFlatWorkingHours(hours: Record<number, string[]>) {
  const items: Array<{ dayOfWeek: number; startTime: string; endTime: string }> = [];
  Object.entries(hours).forEach(([rawDay, slots]) => {
    const day = Number(rawDay);
    if (!Number.isFinite(day) || day < 1 || day > 7) {
      return;
    }
    slots.forEach((slot) => {
      const parsed = parseSlot(slot);
      if (!parsed) {
        return;
      }
      items.push({
        dayOfWeek: day,
        startTime: parsed.start,
        endTime: parsed.end,
      });
    });
  });
  return items;
}

export function deriveEditorTimes(hours: Record<number, string[]>, days: number[]) {
  let start = '10:00';
  let end = '18:00';
  for (const day of days) {
    const slot = hours[day]?.[0];
    const parsed = slot ? parseSlot(slot) : null;
    if (parsed) {
      start = parsed.start;
      end = parsed.end;
      break;
    }
  }
  return { start, end };
}

