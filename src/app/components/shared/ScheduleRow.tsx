import clsx from 'clsx';

type ScheduleRowProps = {
  name: string;
  avatar: string;
  slots: string[];
  isLead: boolean;
};

export function ScheduleRow({ name, avatar, slots, isLead }: ScheduleRowProps) {
  return (
    <>
      <div className="flex flex-col items-center gap-1 text-center">
        <div
          className={clsx(
            'flex h-14 w-14 items-center justify-center rounded-2xl text-[18px] font-extrabold',
            isLead ? 'bg-[#e3e0f8] text-[#7f7bcf]' : 'bg-[#e5e8ee] text-[#68768a]',
          )}
        >
          {avatar}
        </div>
        <span className="text-[16px] font-semibold text-ink">{name}</span>
      </div>
      {slots.map((slot, index) => (
        <div
          key={`${name}-${index}`}
          className={clsx(
            'min-h-20 rounded-md p-2 text-[13px] font-semibold leading-tight',
            slot ? 'bg-[#e8ebf1] text-ink' : 'bg-[#f0f2f6] text-transparent',
          )}
        >
          {slot || '--'}
        </div>
      ))}
    </>
  );
}
