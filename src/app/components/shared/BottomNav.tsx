import clsx from 'clsx';
import { NavLink } from 'react-router-dom';
import type { TabItem, TabKey } from '../../types';

type BottomNavProps = {
  active: TabKey;
  items: TabItem[];
  onChange: (next: TabKey) => void;
};

export function BottomNav({ active, items, onChange }: BottomNavProps) {
  const compact = items.length >= 6;
  const tabRoutes: Record<TabKey, string> = {
    journal: '/journal',
    schedule: '/schedule',
    clients: '/clients',
    analytics: '/analytics',
    services: '/services',
    more: '/more',
  };

  return (
    <nav className={clsx('shrink-0 rounded-2xl border-t border-line bg-screen', compact ? 'py-1.5' : 'py-2')}>
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
                className={clsx(
                  'flex w-full flex-col items-center justify-center text-center',
                  compact ? 'gap-0 py-1' : 'gap-0.5 py-1',
                )}
              >
                <Icon
                  className={clsx(
                    compact ? 'h-5 w-5' : 'h-6 w-6',
                    'transition-colors',
                    isActive ? 'text-ink' : 'text-muted',
                  )}
                  strokeWidth={2.1}
                />
                <span
                  className={clsx(
                    compact ? 'text-[11px] leading-tight tracking-[-0.01em]' : 'text-[13px] leading-none',
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
