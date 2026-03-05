import clsx from 'clsx';
import { NavLink } from 'react-router-dom';
import { TAB_ITEMS } from '../../constants';
import type { TabKey } from '../../types';

type BottomNavProps = {
  active: TabKey;
  onChange: (next: TabKey) => void;
};

export function BottomNav({ active, onChange }: BottomNavProps) {
  const tabRoutes: Record<TabKey, string> = {
    journal: '/journal',
    schedule: '/schedule',
    clients: '/clients',
    notifications: '/notifications',
    more: '/more',
  };

  return (
    <nav className="shrink-0 border-t border-line bg-screen px-3 pb-2 pt-2">
      <ul className="grid grid-cols-5 gap-1">
        {TAB_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.key;
          return (
            <li key={item.key}>
              <NavLink
                to={tabRoutes[item.key]}
                onClick={() => onChange(item.key)}
                className="flex w-full flex-col items-center justify-center gap-1 py-1 text-center"
              >
                <Icon
                  className={clsx('h-7 w-7 transition-colors', isActive ? 'text-ink' : 'text-muted')}
                  strokeWidth={2.1}
                />
                <span
                  className={clsx(
                    'text-[14px] leading-none',
                    isActive ? 'font-semibold text-ink' : 'font-medium text-muted',
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
