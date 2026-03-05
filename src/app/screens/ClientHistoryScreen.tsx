import { useMemo } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Loader2,
  Wallet,
} from 'lucide-react';
import { formatAppointmentPrice, formatHistoryDate, formatTime } from '../helpers';
import type { AppointmentItem, ClientItem } from '../types';

type ClientHistoryScreenProps = {
  client: ClientItem | null;
  appointments: AppointmentItem[];
  loading: boolean;
  onBack: () => void;
};

export function ClientHistoryScreen({
  client,
  appointments,
  loading,
  onBack,
}: ClientHistoryScreenProps) {
  const grouped = useMemo(() => {
    const map = new Map<string, AppointmentItem[]>();
    appointments.forEach((item) => {
      const key = formatHistoryDate(item.startAt);
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)?.push(item);
    });
    return Array.from(map.entries());
  }, [appointments]);

  return (
    <div className="pb-5 pt-4">
      <div className="mb-4 flex items-center gap-3 border-b border-line pb-3">
        <button type="button" onClick={onBack} className="rounded-lg p-2 text-ink">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-[52px] font-extrabold leading-none text-ink">
          <span className="text-[52%]">История посещений</span>
        </h1>
      </div>

      {client ? (
        <p className="mb-3 text-[18px] font-semibold text-muted">{client.name}</p>
      ) : null}

      {loading ? (
        <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Загружаю историю...
        </div>
      ) : null}

      {!loading && grouped.length === 0 ? (
        <p className="mt-6 text-[18px] font-semibold text-muted">Нет посещений</p>
      ) : null}

      <div className="space-y-7">
        {grouped.map(([day, list]) => (
          <section key={day} className="border-t border-dashed border-[#d4d8de] pt-5 first:border-t-0 first:pt-1">
            <h2 className="mb-4 text-[48px] font-extrabold leading-none text-ink">
              <span className="text-[58%]">{day}</span>
            </h2>
            <div className="space-y-4">
              {list.map((item) => {
                const arrived = item.status === 'ARRIVED' || item.status === 'CONFIRMED';
                return (
                  <article key={item.id} className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {arrived ? (
                          <CheckCircle2 className="mt-1 h-6 w-6 text-black" />
                        ) : (
                          <Clock3 className="mt-1 h-6 w-6 text-black" />
                        )}
                        <div>
                          <p className="text-[20px] font-medium text-ink">
                            {formatTime(item.startAt)} {item.staffName}
                          </p>
                          <p className="text-[20px] font-medium text-ink">MARi beauty</p>
                        </div>
                      </div>
                      <ChevronRight className="h-7 w-7 text-[#46acf5]" />
                    </div>
                    <div className="rounded-xl border border-[#d8dbe0] bg-screen p-4">
                      <p className="text-[20px] font-medium text-ink">{item.serviceName}</p>
                      <div className="mt-2 flex items-center gap-2 text-[20px] font-medium text-ink">
                        <Wallet className="h-5 w-5" />
                        <span>{formatAppointmentPrice(item)}</span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
