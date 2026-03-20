import { isRouteCompatibleWithState, routeToState } from './routes';

test('maps settings routes to separate settings pages', () => {
  expect(routeToState('/settings')).toEqual({
    page: 'settings',
    tab: 'more',
  });
  expect(routeToState('/settings/notifications')).toEqual({
    page: 'settingsNotifications',
    tab: 'more',
  });
  expect(routeToState('/journal/new')).toEqual({
    page: 'journalCreate',
    tab: 'journal',
  });
  expect(routeToState('/journal/settings')).toEqual({
    page: 'journalSettings',
    tab: 'journal',
  });
});

test('maps online-booking section routes to client site editor page', () => {
  expect(routeToState('/online-booking/uslugi')).toEqual({
    page: 'clientSiteEditor',
    tab: 'more',
  });
  expect(routeToState('/online-booking/publikatsiya')).toEqual({
    page: 'clientSiteEditor',
    tab: 'more',
  });
});

test('keeps online-booking section routes compatible with client site editor state', () => {
  expect(isRouteCompatibleWithState('/online-booking/specialisty', 'clientSiteEditor', 'more')).toBe(true);
  expect(isRouteCompatibleWithState('/online-booking/publikatsiya', 'clientSiteEditor', 'more')).toBe(true);
  expect(isRouteCompatibleWithState('/services', 'clientSiteEditor', 'more')).toBe(false);
});

test('keeps settings routes compatible with their own pages', () => {
  expect(isRouteCompatibleWithState('/settings', 'settings', 'more')).toBe(true);
  expect(isRouteCompatibleWithState('/settings/notifications', 'settingsNotifications', 'more')).toBe(true);
  expect(isRouteCompatibleWithState('/settings', 'settingsNotifications', 'more')).toBe(false);
  expect(isRouteCompatibleWithState('/journal/new', 'journalCreate', 'journal')).toBe(true);
  expect(isRouteCompatibleWithState('/journal/settings', 'journalSettings', 'journal')).toBe(true);
  expect(isRouteCompatibleWithState('/journal', 'journalSettings', 'journal')).toBe(false);
});
