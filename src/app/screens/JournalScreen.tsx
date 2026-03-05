import { ChevronDown, Loader2, RefreshCcw, Settings2 } from 'lucide-react';
import { formatDateLabel } from '../helpers';
import type { JournalCard, StaffItem } from '../types';
import { AppointmentCard } from '../components/shared/AppointmentCard';
import { JournalDatePickerSheet } from '../components/shared/JournalDatePickerSheet';
import { StaffChip } from '../components/shared/StaffChip';

type JournalScreenProps = {
  selectedDate: Date;
  staff: StaffItem[];
  journalHours: string[];
  cards: JournalCard[];
  loading: boolean;
  datePickerOpen: boolean;
  markedDates: string[];
  onSetDate: () => void;
  onCloseDatePicker: () => void;
  onSelectDate: (value: Date) => void;
  onCreate: () => void;
  onReload: () => void;
  onSettings: () => void;
  onStaffClick: (item: StaffItem) => void;
};

export function JournalScreen({
  selectedDate,
  staff,
  journalHours,
  cards,
  loading,
  datePickerOpen,
  markedDates,
  onSetDate,
  onCloseDatePicker,
  onSelectDate,
  onCreate,
  onReload,
  onSettings,
  onStaffClick,
}: JournalScreenProps) {
  const columnsCount = Math.max(1, staff.length);
  const gridTemplateColumns = `72px repeat(${columnsCount}, minmax(160px, 1fr))`;
  const minWidth = 72 + 8 + columnsCount * 160 + (columnsCount - 1) * 8;

  return (
    <div className="pb-5 pt-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onSetDate}
          className="flex items-center gap-2 text-[24px] font-bold text-ink"
        >
          {formatDateLabel(selectedDate)}
          <ChevronDown className="h-6 w-6 text-[#ebaf00]" />
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onReload}
            className="flex items-center gap-2 rounded-2xl bg-[#e6e9ef] px-3 py-2 text-[14px] font-semibold text-ink"
          >
            <RefreshCcw className="h-4 w-4 text-[#8892a2]" />
            Обновить
          </button>
          <button type="button" onClick={onSettings} className="rounded-xl p-2 text-ink">
            <Settings2 className="h-6 w-6 text-ink" />
          </button>
        </div>
      </div>

      <div className="mt-4 border-t border-line pt-3">
        <div className="scrollbar-hidden overflow-x-auto pb-3">
          <div className="flex min-w-[620px] items-end gap-6">
            <button type="button" onClick={onCreate} className="text-4xl font-normal leading-none text-accent">
              +
            </button>
            {staff.map((item, index) => (
              <StaffChip
                key={item.id}
                title={item.name}
                badge={item.name.charAt(0).toUpperCase()}
                avatarUrl={item.avatarUrl}
                isUser={index === 0}
                onClick={() => onStaffClick(item)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="scrollbar-hidden mt-3 overflow-x-auto">
        <div className="relative pb-3" style={{ minWidth }}>
          <div className="grid gap-2" style={{ gridTemplateColumns }}>
            <div className="space-y-0">
              {journalHours.map((time) => (
                <div key={time} className="h-[76px] pt-1 text-[16px] font-medium text-ink">
                  {time}
                </div>
              ))}
            </div>
            {Array.from({ length: columnsCount }).map((_, colIndex) => (
              <div key={colIndex} className="space-y-0">
                {journalHours.map((time) => (
                  <div key={time} className="h-[76px] border-t border-[#dce1e8]" />
                ))}
              </div>
            ))}
          </div>

          {cards.map((card) => (
            <AppointmentCard
              key={card.id}
              left={card.left}
              top={card.top}
              height={card.height}
              time={card.timeLabel}
              topTone={card.topTone}
              client={card.clientName}
              phone={card.clientPhone}
              service={card.serviceName}
            />
          ))}
        </div>
      </div>

      {loading ? (
        <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Синхронизация с сервером...
        </div>
      ) : null}

      <JournalDatePickerSheet
        open={datePickerOpen}
        selectedDate={selectedDate}
        markedDates={markedDates}
        onClose={onCloseDatePicker}
        onSelectDate={onSelectDate}
      />
    </div>
  );
}
