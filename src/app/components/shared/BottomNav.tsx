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
    notifications: '/notifications',
    more: '/more',
  };

  return (
    <nav className="shrink-0 border-t border-line bg-screen pb-1 pt-1">
      <ul
        className="grid gap-0"
        style={{ gridTemplateColumns: `repeat(${Math.max(items.length, 1)}, minmax(0, 1fr))` }}
      >
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.key;
          return (
            <li key={item.key}>
              <NavLink
                to={tabRoutes[item.key]}
                onClick={() => onChange(item.key)}
                className="flex w-full flex-col items-center justify-center gap-0.5 py-1 text-center"
              >
                <Icon
                  className={clsx('h-6 w-6 transition-colors', isActive ? 'text-ink' : 'text-muted')}
                  strokeWidth={2.1}
                />
                <span
                  className={clsx(
                    'text-[13px] leading-none',
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
