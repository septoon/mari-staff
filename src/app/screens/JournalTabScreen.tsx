import clsx from 'clsx';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  RefreshCcw,
  Search,
  Settings2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  JOURNAL_CARD_COLUMN_WIDTH,
  JOURNAL_GRID_GAP,
  JOURNAL_TIME_COLUMN_WIDTH,
} from '../constants';
import { formatDateLabel, formatRub, formatTime } from '../helpers';
import type { AppointmentItem, JournalCard, StaffItem, TabItem, TabKey } from '../types';
import { AppointmentCard } from '../components/shared/AppointmentCard';
import { JournalDatePickerSheet } from '../components/shared/JournalDatePickerSheet';
import { StaffChip } from '../components/shared/StaffChip';

type JournalTabScreenProps = {
  selectedDate: Date;
  staff: StaffItem[];
  journalHours: string[];
  cards: JournalCard[];
  listAppointments: AppointmentItem[];
  loading: boolean;
  datePickerOpen: boolean;
  markedDates: string[];
  visibleTabs: TabItem[];
  activeTab: TabKey;
  showOwnerDaySummary: boolean;
  onSetDate: () => void;
  onCloseDatePicker: () => void;
  onSelectDate: (value: Date) => void;
  onCreate: () => void;
  onReload: () => void;
  onSettings: () => void;
  onTabChange: (next: TabKey) => void;
  onStaffClick: (item: StaffItem) => void;
  onCardClick: (item: AppointmentItem) => void;
};

const DESKTOP_FILTER_INPUT_CLASS =
  'h-12 w-full rounded-2xl border border-[#dce2ea] bg-white px-4 text-sm font-semibold text-ink outline-none transition placeholder:text-[#a0a7b3] focus:border-[#b7c0cd]';
const JOURNAL_PAGE_SIZE = 25;
const JOURNAL_LIST_SKELETON_ROWS = 8;

function normalizeJournalStatus(value: string) {
  if (value === 'ARRIVED' || value === 'NO_SHOW' || value === 'CONFIRMED') {
    return value;
  }
  return 'PENDING';
}

function journalStatusLabel(value: string) {
  if (value === 'ARRIVED') {
    return 'Пришел';
  }
  if (value === 'NO_SHOW') {
    return 'Не пришел';
  }
  if (value === 'CONFIRMED') {
    return 'Подтвержден';
  }
  return 'Ожидание';
}

function journalStatusClass(value: string) {
  if (value === 'ARRIVED') {
    return 'bg-[#dff4e5] text-[#1f7a38]';
  }
  if (value === 'NO_SHOW') {
    return 'bg-[#fbe1e1] text-[#b54848]';
  }
  if (value === 'CONFIRMED') {
    return 'bg-[#e3ecff] text-[#365fcb]';
  }
  return 'bg-[#fff3d4] text-[#8d6700]';
}

function JournalListSkeletonRow() {
  return (
    <div className="grid w-full gap-4 px-6 py-5 md:grid-cols-[120px_repeat(2,minmax(0,1fr))] xl:grid-cols-[110px_1.15fr_1fr_0.9fr_0.85fr_110px]">
      <div className="animate-pulse">
        <div className="h-8 w-16 rounded-full bg-[#e8edf3]" />
        <div className="mt-3 h-4 w-20 rounded-full bg-[#eef2f6]" />
      </div>

      <div className="animate-pulse">
        <div className="h-7 w-40 rounded-full bg-[#e8edf3]" />
        <div className="mt-3 h-4 w-28 rounded-full bg-[#eef2f6]" />
      </div>

      <div className="animate-pulse">
        <div className="h-6 w-44 rounded-full bg-[#e8edf3]" />
        <div className="mt-3 h-4 w-24 rounded-full bg-[#eef2f6]" />
      </div>

      <div className="animate-pulse">
        <div className="h-6 w-28 rounded-full bg-[#e8edf3]" />
        <div className="mt-3 h-4 w-20 rounded-full bg-[#eef2f6]" />
      </div>

      <div className="animate-pulse">
        <div className="h-10 w-28 rounded-full bg-[#eef2f6]" />
      </div>

      <div className="animate-pulse">
        <div className="h-6 w-16 rounded-full bg-[#e8edf3]" />
      </div>
    </div>
  );
}

export function JournalTabScreen({
  selectedDate,
  staff,
  journalHours,
  cards,
  listAppointments,
  loading,
  datePickerOpen,
  markedDates,
  visibleTabs,
  activeTab,
  showOwnerDaySummary,
  onSetDate,
  onCloseDatePicker,
  onSelectDate,
  onCreate,
  onReload,
  onSettings,
  onTabChange,
  onStaffClick,
  onCardClick,
}: JournalTabScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [serviceQuery, setServiceQuery] = useState('');
  const [staffFilterId, setStaffFilterId] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  const columnsCount = Math.max(1, staff.length);
  const gridTemplateColumns = `${JOURNAL_TIME_COLUMN_WIDTH}px repeat(${columnsCount}, ${JOURNAL_CARD_COLUMN_WIDTH}px)`;
  const minWidth =
    JOURNAL_TIME_COLUMN_WIDTH +
    columnsCount * JOURNAL_CARD_COLUMN_WIDTH +
    (columnsCount + 1) * JOURNAL_GRID_GAP;

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const normalizedServiceQuery = serviceQuery.trim().toLowerCase();
  const filteredCards = useMemo(
    () =>
      [...listAppointments]
        .sort((left, right) => {
          const createdDiff = right.createdAt.getTime() - left.createdAt.getTime();
          if (createdDiff !== 0) {
            return createdDiff;
          }
          return right.startAt.getTime() - left.startAt.getTime();
        })
        .filter((item) => {
          const normalizedStatus = normalizeJournalStatus(item.status);
          const searchable = [
            item.clientName,
            item.clientPhone,
            item.serviceName,
            item.staffName,
          ]
            .join(' ')
            .toLowerCase();
          const matchesSearch =
            normalizedSearchQuery.length === 0 || searchable.includes(normalizedSearchQuery);
          const matchesService =
            normalizedServiceQuery.length === 0 ||
            (item.serviceName || '').toLowerCase().includes(normalizedServiceQuery);
          const matchesStaff = staffFilterId === 'all' || item.staffId === staffFilterId;
          const matchesStatus = statusFilter === 'all' || normalizedStatus === statusFilter;
          return matchesSearch && matchesService && matchesStaff && matchesStatus;
        }),
    [listAppointments, normalizedSearchQuery, normalizedServiceQuery, staffFilterId, statusFilter],
  );

  const totalPages = Math.max(1, Math.ceil(filteredCards.length / JOURNAL_PAGE_SIZE));
  const paginatedCards = useMemo(() => {
    const start = (currentPage - 1) * JOURNAL_PAGE_SIZE;
    return filteredCards.slice(start, start + JOURNAL_PAGE_SIZE);
  }, [currentPage, filteredCards]);
  const visiblePaginationPages = useMemo(() => {
    const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
    const end = Math.min(totalPages, start + 4);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDate, normalizedSearchQuery, normalizedServiceQuery, staffFilterId, statusFilter]);

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  return (
    <>
      <div className="pb-5 pt-4 md:hidden">
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
            <div className="grid gap-2 pb-2" style={{ gridTemplateColumns, minWidth }}>
              <div className="sticky left-0 z-30 bg-screen">
                <button
                  type="button"
                  onClick={onCreate}
                  className="w-full text-4xl font-normal leading-none text-accent"
                >
                  +
                </button>
              </div>
              {Array.from({ length: columnsCount }).map((_, index) => {
                const item = staff[index];
                if (!item) {
                  return <div key={`staff-placeholder-${index}`} />;
                }
                return (
                  <div key={item.id} className="flex justify-center">
                    <StaffChip
                      title={item.name}
                      badge={item.name.charAt(0).toUpperCase()}
                      avatarUrl={item.avatarUrl}
                      isUser={index === 0}
                      onClick={() => onStaffClick(item)}
                    />
                  </div>
                );
              })}
            </div>

            <div className="relative pb-3" style={{ minWidth }}>
              <div className="grid gap-2" style={{ gridTemplateColumns }}>
                <div className="sticky left-0 z-20 space-y-0 bg-screen pr-2">
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
                  width={JOURNAL_CARD_COLUMN_WIDTH}
                  left={card.left}
                  top={card.top}
                  height={card.height}
                  time={card.timeLabel}
                  topTone={card.topTone}
                  client={card.clientName}
                  phone={card.clientPhone}
                  service={card.serviceName}
                  onClick={() => onCardClick(card)}
                />
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            Синхронизация с сервером...
          </div>
        ) : null}
      </div>

      <div className="hidden pb-6 md:block">
        <section className="min-w-0">
          <div className="rounded-[32px] border border-[#e2e6ed] bg-[#fcfcfd] p-6 shadow-[0_18px_40px_rgba(42,49,56,0.08)] lg:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8d95a1]">
                  Журнал
                </p>
                <h1 className="mt-3 text-[48px] font-extrabold leading-[0.94] tracking-[-0.04em] text-ink">
                  Записи
                </h1>
                <p className="mt-3 text-base font-semibold text-[#717986]">
                  Полный список записей за все дни. Сверху новые, ниже более ранние.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={onReload}
                  className="inline-flex h-12 items-center gap-2 rounded-2xl border border-[#dde3eb] bg-[#f6f8fb] px-4 text-sm font-semibold text-ink"
                >
                  <RefreshCcw className="h-4 w-4 text-[#8892a2]" />
                  Обновить
                </button>
                <button
                  type="button"
                  onClick={onSettings}
                  className="inline-flex h-12 items-center gap-2 rounded-2xl border border-[#dde3eb] bg-[#f6f8fb] px-4 text-sm font-semibold text-ink"
                >
                  <Settings2 className="h-4 w-4 text-[#8892a2]" />
                  Настройки
                </button>
                <button
                  type="button"
                  onClick={onCreate}
                  className="inline-flex h-12 items-center gap-2 rounded-2xl bg-[#f4c900] px-5 text-sm font-extrabold text-[#222b33] shadow-[0_12px_26px_rgba(244,201,0,0.28)]"
                >
                  <Plus className="h-4 w-4" />
                  Новая запись
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,0.8fr))]">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98a0ac]" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Имя клиента, телефон, услуга"
                  className={`${DESKTOP_FILTER_INPUT_CLASS} pl-11`}
                />
              </label>

              <select
                value={staffFilterId}
                onChange={(event) => setStaffFilterId(event.target.value)}
                className={DESKTOP_FILTER_INPUT_CLASS}
              >
                <option value="all">Все сотрудники</option>
                {staff.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className={DESKTOP_FILTER_INPUT_CLASS}
              >
                <option value="all">Все статусы</option>
                <option value="PENDING">Ожидание</option>
                <option value="CONFIRMED">Подтверждены</option>
                <option value="ARRIVED">Пришли</option>
                <option value="NO_SHOW">Не пришли</option>
              </select>

              <input
                value={serviceQuery}
                onChange={(event) => setServiceQuery(event.target.value)}
                placeholder="Фильтр по услуге"
                className={DESKTOP_FILTER_INPUT_CLASS}
              />
            </div>
          </div>

          <div className="mt-5 rounded-[32px] border border-[#e2e6ed] bg-[#fcfcfd] shadow-[0_18px_40px_rgba(42,49,56,0.08)]">
            <div className="flex items-center justify-between gap-4 border-b border-[#e7ebf0] px-6 py-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#8d95a1]">
                  Список записей
                </p>
                <p className="mt-2 text-[28px] font-extrabold leading-none text-ink">
                  {loading && filteredCards.length === 0 ? '—' : filteredCards.length}
                </p>
              </div>
              {!loading && filteredCards.length > 0 ? (
                <div className="inline-flex items-center gap-2 rounded-full bg-[#f5f7fa] px-4 py-2 text-sm font-semibold text-[#6f7784]">
                  {`Страница ${currentPage} из ${totalPages}`}
                </div>
              ) : null}
            </div>

            <div className="hidden border-b border-[#eef2f6] px-6 py-3 text-xs font-bold uppercase tracking-[0.16em] text-[#97a0ad] xl:grid xl:grid-cols-[110px_1.15fr_1fr_0.9fr_0.85fr_110px] xl:gap-4">
              <span>Время</span>
              <span>Клиент</span>
              <span>Услуга</span>
              <span>Сотрудник</span>
              <span>Статус</span>
              <span>Сумма</span>
            </div>

            {loading ? (
              <div className="divide-y divide-[#eef2f6]">
                {Array.from({ length: JOURNAL_LIST_SKELETON_ROWS }).map((_, index) => (
                  <JournalListSkeletonRow key={`journal-skeleton-${index}`} />
                ))}
              </div>
            ) : filteredCards.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <p className="text-[28px] font-extrabold text-ink">Записей не найдено</p>
                <p className="mt-3 text-base font-semibold text-[#7d8693]">
                  Измените фильтры поиска или дождитесь загрузки списка.
                </p>
              </div>
            ) : (
              <>
                <div className="divide-y divide-[#eef2f6]">
                  {paginatedCards.map((card) => {
                    const normalizedStatus = normalizeJournalStatus(card.status);
                    const amount = card.amountAfterDiscount ?? card.amountBeforeDiscount;
                    return (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => onCardClick(card)}
                        className="grid w-full gap-4 px-6 py-5 text-left transition hover:bg-[#f7f9fc] md:grid-cols-[120px_repeat(2,minmax(0,1fr))] xl:grid-cols-[110px_1.15fr_1fr_0.9fr_0.85fr_110px]"
                      >
                        <div>
                          <p className="text-[28px] font-extrabold leading-none text-ink">
                            {formatTime(card.startAt)}
                          </p>
                          <p className="mt-2 text-sm font-semibold text-[#838b97]">
                            {formatDateLabel(card.startAt)}
                          </p>
                        </div>

                        <div>
                          <p className="text-[20px] font-extrabold leading-tight text-ink">
                            {card.clientName || 'Клиент'}
                          </p>
                          <p className="mt-2 text-sm font-semibold text-[#838b97]">
                            {card.clientPhone || 'Телефон не указан'}
                          </p>
                        </div>

                        <div>
                          <p className="text-[18px] font-bold leading-tight text-ink">
                            {card.serviceName || 'Без услуги'}
                          </p>
                          <p className="mt-2 text-sm font-semibold text-[#838b97]">
                            {`${formatTime(card.startAt)}-${formatTime(card.endAt)}`}
                          </p>
                        </div>

                        <div>
                          <p className="text-[18px] font-bold leading-tight text-ink">{card.staffName}</p>
                          <p className="mt-2 text-sm font-semibold text-[#838b97]">
                            {card.createdAt.toLocaleDateString('ru-RU', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            })}
                          </p>
                        </div>

                        <div>
                          <span
                            className={clsx(
                              'inline-flex rounded-full px-3 py-2 text-sm font-extrabold',
                              journalStatusClass(normalizedStatus),
                            )}
                          >
                            {journalStatusLabel(normalizedStatus)}
                          </span>
                        </div>

                        <div>
                          <p className="text-[18px] font-extrabold text-ink">
                            {amount !== null ? formatRub(amount) : '—'}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {totalPages > 1 ? (
                  <div className="flex items-center justify-between gap-4 border-t border-[#eef2f6] px-6 py-4">
                    <p className="text-sm font-semibold text-[#7a8290]">
                      {`Показаны ${paginatedCards.length} из ${filteredCards.length}`}
                    </p>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="inline-flex h-10 items-center gap-2 rounded-2xl border border-[#dde3eb] bg-white px-3 text-sm font-semibold text-ink transition hover:border-[#c8d0db] disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Назад
                      </button>

                      <div className="flex items-center gap-2">
                        {visiblePaginationPages.map((page) => (
                          <button
                            key={page}
                            type="button"
                            onClick={() => setCurrentPage(page)}
                            className={clsx(
                              'inline-flex h-10 min-w-10 items-center justify-center rounded-2xl px-3 text-sm font-extrabold transition',
                              page === currentPage
                                ? 'bg-[#222b33] text-white shadow-[0_10px_24px_rgba(34,43,51,0.16)]'
                                : 'border border-[#dde3eb] bg-white text-ink hover:border-[#c8d0db]',
                            )}
                          >
                            {page}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="inline-flex h-10 items-center gap-2 rounded-2xl border border-[#dde3eb] bg-white px-3 text-sm font-semibold text-ink transition hover:border-[#c8d0db] disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        Вперед
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </section>
      </div>

      <JournalDatePickerSheet
        open={datePickerOpen}
        selectedDate={selectedDate}
        markedDates={markedDates}
        onClose={onCloseDatePicker}
        onSelectDate={onSelectDate}
      />
    </>
  );
}
