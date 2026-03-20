import clsx from 'clsx';
import { useEffect } from 'react';
import { ArrowLeft, Clock3, Eye, RotateCcw, ShieldCheck, SlidersHorizontal, X } from 'lucide-react';
import { PrimeSwitch } from '../components/shared/PrimeSwitch';
import type { JournalSettings } from '../types';

type JournalSettingsScreenProps = {
  settings: JournalSettings;
  onBack: () => void;
  onUpdate: (patch: Partial<JournalSettings>) => void;
  onReset: () => void;
};

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-[24px] border border-[#edf1f5] bg-[#f8fafc] px-4 py-4">
      <div className="min-w-0 flex-1">
        <p className="text-[16px] font-bold text-ink">{label}</p>
        <p className="mt-2 text-sm font-semibold leading-6 text-[#788292]">{description}</p>
      </div>

      <PrimeSwitch
        checked={checked}
        onChange={onChange}
        size="sm"
        className="mt-1"
        ariaLabel={label}
      />
    </div>
  );
}

function SegmentedField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">{label}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {options.map((item) => {
          const active = item.value === value;
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => onChange(item.value)}
              className={clsx(
                'rounded-[20px] border px-4 py-3 text-left text-sm font-bold transition',
                active
                  ? 'border-[#f4c900] bg-[#fff7d6] text-[#4a3b00]'
                  : 'border-[#dbe1ea] bg-white text-[#49525e] hover:bg-[#f7f9fc]',
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SelectField<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <label className="block">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">{label}</p>
      <select
        value={String(value)}
        onChange={(event) => {
          const next = options.find((item) => String(item.value) === event.target.value);
          if (next) {
            onChange(next.value);
          }
        }}
        className="mt-3 h-12 w-full rounded-2xl border border-[#d9dfe8] bg-white px-4 text-sm font-semibold text-ink outline-none transition focus:border-[#c2cad6]"
      >
        {options.map((item) => (
          <option key={String(item.value)} value={String(item.value)}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SettingsContent({ settings, onUpdate, onReset }: Omit<JournalSettingsScreenProps, 'onBack'>) {
  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-[#e2e6ed] bg-[#fcfcfd] p-5 shadow-[0_16px_34px_rgba(42,49,56,0.08)]">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#fff6cf] text-[#9b7a06]">
            <Eye className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Отображение</p>
            <h2 className="mt-2 text-[24px] font-extrabold leading-none text-ink">Вид журнала</h2>
            <p className="mt-3 text-sm font-semibold leading-6 text-[#788292]">
              Эти настройки меняют плотность списка, вторичные строки и служебные индикаторы календаря.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <SegmentedField
            label="Плотность списка"
            value={settings.density}
            options={[
              { value: 'comfortable', label: 'Обычная' },
              { value: 'compact', label: 'Компактная' },
            ]}
            onChange={(value) => onUpdate({ density: value })}
          />

          <div className="space-y-3">
            <ToggleRow
              label="Телефон клиента"
              description="Показывать телефон во второй строке карточки клиента."
              checked={settings.showClientPhone}
              onChange={(value) => onUpdate({ showClientPhone: value })}
            />
            <ToggleRow
              label="Время услуги"
              description="Показывать диапазон времени под услугой в desktop-списке."
              checked={settings.showServiceTime}
              onChange={(value) => onUpdate({ showServiceTime: value })}
            />
            <ToggleRow
              label="Дата создания записи"
              description="Показывать дату оформления под именем сотрудника."
              checked={settings.showCreatedDate}
              onChange={(value) => onUpdate({ showCreatedDate: value })}
            />
            <ToggleRow
              label="Колонка суммы"
              description="Показывать отдельную колонку с чеком по записи."
              checked={settings.showAmount}
              onChange={(value) => onUpdate({ showAmount: value })}
            />
            <ToggleRow
              label="Метки на календаре"
              description="Показывать точки с загруженными днями в мини-календаре и date picker."
              checked={settings.showMarkedDates}
              onChange={(value) => onUpdate({ showMarkedDates: value })}
            />
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-[#e2e6ed] bg-[#fcfcfd] p-5 shadow-[0_16px_34px_rgba(42,49,56,0.08)]">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#eef4ff] text-[#4968bf]">
            <SlidersHorizontal className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Фильтры</p>
            <h2 className="mt-2 text-[24px] font-extrabold leading-none text-ink">Стартовые значения</h2>
            <p className="mt-3 text-sm font-semibold leading-6 text-[#788292]">
              Эти значения подставляются в desktop-список записей при открытии журнала.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <SelectField
            label="Период по умолчанию"
            value={settings.defaultPeriod}
            options={[
              { value: 'all', label: 'Все даты' },
              { value: 'today', label: 'Только выбранный день' },
              { value: '7d', label: 'Последние 7 дней' },
              { value: '30d', label: 'Последние 30 дней' },
            ]}
            onChange={(value) => onUpdate({ defaultPeriod: value })}
          />

          <SelectField
            label="Статус по умолчанию"
            value={settings.defaultStatus}
            options={[
              { value: 'all', label: 'Все статусы' },
              { value: 'PENDING', label: 'Ожидание' },
              { value: 'CONFIRMED', label: 'Подтверждены' },
              { value: 'ARRIVED', label: 'Пришли' },
              { value: 'NO_SHOW', label: 'Не пришли' },
            ]}
            onChange={(value) => onUpdate({ defaultStatus: value })}
          />
        </div>
      </section>

      <section className="rounded-[28px] border border-[#e2e6ed] bg-[#fcfcfd] p-5 shadow-[0_16px_34px_rgba(42,49,56,0.08)]">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#eef8ef] text-[#2a8d4b]">
            <Clock3 className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Поведение</p>
            <h2 className="mt-2 text-[24px] font-extrabold leading-none text-ink">Обновление и подтверждения</h2>
            <p className="mt-3 text-sm font-semibold leading-6 text-[#788292]">
              Управление автообновлением и защитой от случайных действий.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <SelectField
            label="Автообновление"
            value={settings.autoRefreshSeconds}
            options={[
              { value: 0, label: 'Выключено' },
              { value: 20, label: 'Каждые 20 секунд' },
              { value: 60, label: 'Каждую минуту' },
              { value: 300, label: 'Каждые 5 минут' },
            ]}
            onChange={(value) => onUpdate({ autoRefreshSeconds: value })}
          />

          <div className="space-y-3">
            <ToggleRow
              label="Подтверждать смену статуса"
              description="Перед обновлением статуса показывать системное подтверждение."
              checked={settings.confirmStatusChange}
              onChange={(value) => onUpdate({ confirmStatusChange: value })}
            />
            <ToggleRow
              label="Подтверждать удаление записи"
              description="Оставить дополнительное подтверждение перед окончательным удалением."
              checked={settings.confirmDelete}
              onChange={(value) => onUpdate({ confirmDelete: value })}
            />
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-[#e2e6ed] bg-[#fcfcfd] p-5 shadow-[0_16px_34px_rgba(42,49,56,0.08)]">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#f4f6fa] text-[#556070]">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Сброс</p>
                <h2 className="mt-2 text-[24px] font-extrabold leading-none text-ink">Вернуть базовый профиль</h2>
              </div>
            </div>
            <p className="mt-4 text-sm font-semibold leading-6 text-[#788292]">
              Сбросит плотность, колонки, фильтры по умолчанию и подтверждения к исходным значениям.
            </p>
          </div>

          <button
            type="button"
            onClick={onReset}
            className="inline-flex h-12 items-center gap-2 rounded-2xl border border-[#d9dfe8] bg-white px-4 text-sm font-bold text-ink transition hover:bg-[#f7f9fc]"
          >
            <RotateCcw className="h-4 w-4" />
            Сбросить
          </button>
        </div>
      </section>
    </div>
  );
}

export function JournalSettingsScreen({
  settings,
  onBack,
  onUpdate,
  onReset,
}: JournalSettingsScreenProps) {
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia('(min-width: 768px)').matches) {
      return;
    }

    const { body, documentElement } = document;
    const previousBodyOverflow = body.style.overflow;
    const previousHtmlOverflow = documentElement.style.overflow;

    body.style.overflow = 'hidden';
    documentElement.style.overflow = 'hidden';

    return () => {
      body.style.overflow = previousBodyOverflow;
      documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  return (
    <>
      <div className="pb-8 pt-6 md:hidden">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[#d9dfe8] bg-white text-ink"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Журнал</p>
            <h1 className="mt-1 text-[26px] font-extrabold leading-none text-ink">Настройки журнала</h1>
          </div>
        </div>

        <div className="mt-5">
          <SettingsContent settings={settings} onUpdate={onUpdate} onReset={onReset} />
        </div>
      </div>

      <div className="fixed inset-0 z-[80] hidden bg-[rgba(34,43,51,0.38)] backdrop-blur-[2px] md:block">
        <div className="absolute inset-y-0 right-0 flex w-full max-w-[540px] flex-col border-l border-[#dfe4ec] bg-[#f3f5f8] shadow-[-24px_0_60px_rgba(34,43,51,0.16)]">
          <div className="flex items-start justify-between gap-4 border-b border-[#e0e5ed] bg-[#fcfcfd] px-6 py-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Журнал</p>
              <h1 className="mt-3 text-[36px] font-extrabold leading-[0.96] tracking-[-0.04em] text-ink">
                Настройки журнала
              </h1>
              <p className="mt-3 max-w-[380px] text-sm font-semibold leading-6 text-[#788292]">
                Локальные параметры списка, фильтров и защитных подтверждений для рабочего места администратора.
              </p>
            </div>

            <button
              type="button"
              onClick={onBack}
              className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[#d9dfe8] bg-white text-ink transition hover:bg-[#f7f9fc]"
              aria-label="Закрыть настройки журнала"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-6 py-6">
            <SettingsContent settings={settings} onUpdate={onUpdate} onReset={onReset} />
          </div>
        </div>
      </div>
    </>
  );
}
