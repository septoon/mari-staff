import clsx from 'clsx';
import { Clock3 } from 'lucide-react';

type AppointmentCardProps = {
  width: number;
  left: number;
  top: number;
  height: number;
  time: string;
  client: string;
  phone: string;
  showPhone: boolean;
  service: string;
  topTone: 'green' | 'violet';
  onClick: () => void;
};

export function AppointmentCard({
  width,
  left,
  top,
  height,
  time,
  client,
  phone,
  showPhone,
  service,
  topTone,
  onClick,
}: AppointmentCardProps) {
  return (
    <article
      className="absolute overflow-hidden rounded-xl bg-successCard text-ink shadow-sm"
      style={{ width, left, top, height }}
    >
      <button type="button" onClick={onClick} className="h-full w-full text-left">
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
          {showPhone ? <p>{phone || 'нет телефона'}</p> : null}
          <p>{service || 'услуга не указана'}</p>
        </div>
      </button>
    </article>
  );
}
