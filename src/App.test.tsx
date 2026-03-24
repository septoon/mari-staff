import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import { buildRuPhoneValue, getRuPhoneLocalDigits } from './app/helpers';

const originalWindowScrollTo = window.scrollTo;
const originalElementScrollTo = HTMLElement.prototype.scrollTo;

beforeAll(() => {
  Object.defineProperty(window, 'scrollTo', {
    configurable: true,
    writable: true,
    value: jest.fn(),
  });
  HTMLElement.prototype.scrollTo = jest.fn();
});

afterAll(() => {
  Object.defineProperty(window, 'scrollTo', {
    configurable: true,
    writable: true,
    value: originalWindowScrollTo,
  });
  HTMLElement.prototype.scrollTo = originalElementScrollTo;
});

test('renders login screen', () => {
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>,
  );
  expect(screen.getAllByText('Mari Staff').length).toBeGreaterThan(0);
  expect(screen.getAllByText('Войти').length).toBeGreaterThan(0);
});

test('renders set-pin screen by route', () => {
  render(
    <MemoryRouter initialEntries={['/staff/set-pin?token=test-token']}>
      <App />
    </MemoryRouter>,
  );
  expect(screen.getByText('Установка код-пароля')).toBeInTheDocument();
  expect(screen.getByText('Введите код-пароль сотрудника (4 цифры)')).toBeInTheDocument();
});

test('renders reset-pin request screen by route', () => {
  render(
    <MemoryRouter initialEntries={['/staff/reset-pin']}>
      <App />
    </MemoryRouter>,
  );
  expect(screen.getByText('Сброс код-пароля')).toBeInTheDocument();
  expect(screen.getByText('Запросить сброс код-пароля')).toBeInTheDocument();
});

test('renders reset-pin confirm screen by route token', () => {
  render(
    <MemoryRouter initialEntries={['/staff/reset-pin?token=test-token']}>
      <App />
    </MemoryRouter>,
  );
  expect(screen.getByRole('heading', { name: 'Новый код-пароль' })).toBeInTheDocument();
  expect(screen.getByText('Введите новый код-пароль (4 цифры)')).toBeInTheDocument();
});

test('does not duplicate leading 7 in phone normalizer', () => {
  expect(buildRuPhoneValue('79')).toBe('+79');
  expect(buildRuPhoneValue('7978')).toBe('+7978');
  expect(buildRuPhoneValue('+79781234567')).toBe('+79781234567');
  expect(getRuPhoneLocalDigits('+79')).toBe('9');
  expect(getRuPhoneLocalDigits('+7978')).toBe('978');
  expect(getRuPhoneLocalDigits('+79781234567')).toBe('9781234567');
});

test('hides restricted tabs for master without permissions payload', async () => {
  const originalFetch = global.fetch;

  global.fetch = jest.fn().mockRejectedValue(new Error('network disabled in test'));

  window.localStorage.setItem(
    'mari.staff.session.v1',
    JSON.stringify({
      staff: {
        id: 'master-1',
        name: 'Master User',
        role: 'MASTER',
        phoneE164: '+79780000000',
        email: null,
      },
      tokens: {
        accessToken: 'test-access',
        refreshToken: 'test-refresh',
        expiresInSec: 900,
      },
    }),
  );

  render(
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  );

  expect((await screen.findAllByText('Журнал')).length).toBeGreaterThan(0);
  expect(screen.getAllByText('Еще').length).toBeGreaterThan(0);
  expect(screen.queryByText('График')).not.toBeInTheDocument();
  expect(screen.queryByText('Клиенты')).not.toBeInTheDocument();
  expect(screen.queryByText('Уведомл...')).not.toBeInTheDocument();

  window.localStorage.removeItem('mari.staff.session.v1');
  global.fetch = originalFetch;
});

test('keeps base journal access for master with empty permissions and shows access denied for restricted route', async () => {
  const originalFetch = global.fetch;

  global.fetch = jest.fn().mockRejectedValue(new Error('network disabled in test'));

  window.localStorage.setItem(
    'mari.staff.session.v1',
    JSON.stringify({
      staff: {
        id: 'master-2',
        name: 'Master User',
        role: 'MASTER',
        phoneE164: '+79780000001',
        email: null,
        permissions: [],
      },
      tokens: {
        accessToken: 'test-access',
        refreshToken: 'test-refresh',
        expiresInSec: 900,
      },
    }),
  );

  render(
    <MemoryRouter initialEntries={['/clients']}>
      <App />
    </MemoryRouter>,
  );

  expect(await screen.findByText('Страница недоступна')).toBeInTheDocument();
  expect(screen.getByText('/clients')).toBeInTheDocument();
  expect(screen.getAllByText('Журнал').length).toBeGreaterThan(0);
  expect(screen.getAllByText('Еще').length).toBeGreaterThan(0);
  expect(screen.queryByText('Клиенты')).not.toBeInTheDocument();

  window.localStorage.removeItem('mari.staff.session.v1');
  global.fetch = originalFetch;
});
