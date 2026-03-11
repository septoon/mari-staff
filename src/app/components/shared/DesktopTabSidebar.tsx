import clsx from 'clsx';
import { NavLink } from 'react-router-dom';
import type { TabItem, TabKey } from '../../types';

type DesktopTabSidebarProps = {
  active: TabKey;
  items: TabItem[];
  onChange: (next: TabKey) => void;
};

const TAB_ROUTES: Record<TabKey, string> = {
  journal: '/journal',
  schedule: '/schedule',
  clients: '/clients',
  analytics: '/analytics',
  services: '/services',
  more: '/more',
};

export function DesktopTabSidebar({ active, items, onChange }: DesktopTabSidebarProps) {
  return (
    <aside className="w-full shrink-0 rounded-[28px] border border-[#e2e6ed] bg-[#fcfcfd] p-4 shadow-[0_18px_40px_rgba(42,49,56,0.08)]">
      <div className="rounded-[22px] bg-[#222b33] px-4 py-4 text-white">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#f4c900]">Mari Beauty</p>
        <p className="mt-2 text-[24px] font-extrabold leading-none">Навигация</p>
      </div>

      <nav className="mt-4">
        <ul className="space-y-2">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = item.key === active;
            return (
              <li key={item.key}>
                <NavLink
                  to={TAB_ROUTES[item.key]}
                  onClick={() => onChange(item.key)}
                  className={clsx(
                    'flex items-center gap-3 rounded-[20px] px-4 py-3 transition',
                    isActive
                      ? 'bg-[#f4c900] text-[#222b33] shadow-[0_10px_24px_rgba(244,201,0,0.28)]'
                      : 'bg-[#f4f6f9] text-[#6d7683] hover:bg-[#ebeff4] hover:text-ink',
                  )}
                >
                  <Icon className="h-5 w-5" strokeWidth={2.2} />
                  <span className={clsx('text-[15px]', isActive ? 'font-extrabold' : 'font-semibold')}>
                    {item.title}
                  </span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
