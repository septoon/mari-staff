import type { AppPage, TabKey } from '../types';

export type RouteState = {
  page: AppPage;
  tab: TabKey;
};

const TAB_ROUTE_MAP: Record<TabKey, string> = {
  journal: '/journal',
  schedule: '/schedule',
  clients: '/clients',
  notifications: '/notifications',
  more: '/more',
};

const PAGE_ROUTE_MAP: Record<Exclude<AppPage, 'tabs'>, string> = {
  scheduleEditor: '/schedule/editor',
  staff: '/staff',
  owner: '/owner',
  privacyPolicy: '/more/privacy-policy',
  staffEditor: '/staff/editor',
  staffServicesEditor: '/staff/services',
  clientHistory: '/clients/history',
  journalAppointment: '/journal/appointment',
  journalClient: '/journal/client',
  journalDayEdit: '/journal/day/edit',
  journalDayRemove: '/journal/day/remove',
  clientSiteEditor: '/online-booking',
  servicesCategories: '/services',
  servicesCategory: '/services/category',
  serviceEditor: '/services/editor',
  serviceCategoryEditor: '/services/category/editor',
};

export const PUBLIC_UNAUTHORIZED_ROUTES = new Set([
  '/login',
  '/staff/set-pin',
  '/staff/reset-pin',
]);

export function normalizePathname(pathname: string) {
  if (!pathname || pathname === '/') {
    return '/';
  }
  return pathname.replace(/\/+$/, '');
}

export function routeToState(pathname: string): RouteState | null {
  const normalized = normalizePathname(pathname);
  switch (normalized) {
    case '/':
    case '/journal':
      return { page: 'tabs', tab: 'journal' };
    case '/schedule':
      return { page: 'tabs', tab: 'schedule' };
    case '/schedule/editor':
      return { page: 'scheduleEditor', tab: 'schedule' };
    case '/clients':
      return { page: 'tabs', tab: 'clients' };
    case '/notifications':
      return { page: 'tabs', tab: 'notifications' };
    case '/more':
      return { page: 'tabs', tab: 'more' };
    case '/staff':
      return { page: 'staff', tab: 'more' };
    case '/owner':
      return { page: 'owner', tab: 'more' };
    case '/more/privacy-policy':
      return { page: 'privacyPolicy', tab: 'more' };
    case '/staff/editor':
      return { page: 'staffEditor', tab: 'more' };
    case '/staff/services':
      return { page: 'staffServicesEditor', tab: 'more' };
    case '/clients/history':
      return { page: 'clientHistory', tab: 'clients' };
    case '/journal/appointment':
      return { page: 'journalAppointment', tab: 'journal' };
    case '/journal/client':
      return { page: 'journalClient', tab: 'journal' };
    case '/journal/day/edit':
      return { page: 'journalDayEdit', tab: 'journal' };
    case '/journal/day/remove':
      return { page: 'journalDayRemove', tab: 'journal' };
    case '/online-booking':
      return { page: 'clientSiteEditor', tab: 'more' };
    case '/services':
      return { page: 'servicesCategories', tab: 'more' };
    case '/services/category':
      return { page: 'servicesCategory', tab: 'more' };
    case '/services/editor':
      return { page: 'serviceEditor', tab: 'more' };
    case '/services/category/editor':
      return { page: 'serviceCategoryEditor', tab: 'more' };
    default:
      return null;
  }
}

export function stateToRoute(page: AppPage, tab: TabKey) {
  if (page === 'tabs') {
    return TAB_ROUTE_MAP[tab];
  }
  return PAGE_ROUTE_MAP[page];
}
