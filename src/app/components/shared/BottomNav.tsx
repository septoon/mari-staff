import clsx from 'clsx';
import { NavLink } from 'react-router-dom';
import type { TabItem, TabKey } from '../../types';

type BottomNavProps = {
  active: TabKey;
  items: TabItem[];
  onChange: (next: TabKey) => void;
};

export function BottomNav({ active, items, onChange }: BottomNavProps) {
  const tabRoutes: Record<TabKey, string> = {
    journal: '/journal',
    schedule: '/schedule',
    clients: '/clients',
    analytics: '/analytics',
    services: '/services',
    more: '/more',
  };
  const effectiveActive = items.some((item) => item.key === active) ? active : 'more';

  return (
    <nav className="shrink-0 rounded-[24px] border border-white/10 bg-[#272a31] px-3 py-3 shadow-[0_18px_40px_rgba(24,29,35,0.22)] backdrop-blur-sm">
      <ul
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${Math.max(items.length, 1)}, minmax(0, 1fr))` }}
      >
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = effectiveActive === item.key;
          return (
            <li key={item.key}>
              <NavLink
                to={tabRoutes[item.key]}
                onClick={() => onChange(item.key)}
                className={clsx(
                  'flex w-full flex-col items-center justify-center gap-1 rounded-[24px] px-2 py-2 text-center transition-colors',
                  isActive ? 'text-white' : 'text-[#c7ccd4]',
                )}
              >
                <Icon
                  className={clsx(
                    'h-7 w-7 transition-colors',
                    isActive ? 'text-white' : 'text-[#c7ccd4]',
                  )}
                  strokeWidth={2.1}
                />
                <span
                  className={clsx(
                    'text-[12px] leading-none tracking-[-0.01em]',
                    isActive ? 'font-semibold text-white' : 'font-medium text-[#c7ccd4]',
                  )}
                >
                  {item.title}
                </span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
