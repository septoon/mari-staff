import clsx from 'clsx';
import { Clock3 } from 'lucide-react';

type AppointmentCardProps = {
  left: number;
  top: number;
  height: number;
  time: string;
  client: string;
  phone: string;
  service: string;
  topTone: 'green' | 'violet';
};

export function AppointmentCard({
  left,
  top,
  height,
  time,
  client,
  phone,
  service,
  topTone,
}: AppointmentCardProps) {
  return (
    <article
      className="absolute w-[160px] overflow-hidden rounded-xl bg-successCard text-ink shadow-sm"
      style={{ left, top, height }}
    >
      <div
        className={clsx(
          'flex items-center justify-between px-2 py-1 text-[14px] font-bold text-white',
          topTone === 'green' ? 'bg-[#59c87f]' : 'bg-[#7f62dd]',
        )}
      >
        <span>{time}</span>
        <Clock3 className="h-4 w-4" />
      </div>
      <div className="space-y-1 px-2 pb-2 pt-1 text-[13px] font-semibold leading-tight">
        <span className="inline-block rounded-md bg-[#1658da] px-1.5 py-[1px] text-white">New</span>
        <p>{client}</p>
        <p>{phone || 'нет телефона'}</p>
        <p>{service || 'услуга не указана'}</p>
      </div>
    </article>
  );
}
