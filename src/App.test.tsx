import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import { buildRuPhoneValue, getRuPhoneLocalDigits } from './app/helpers';

test('renders login screen', () => {
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>,
  );
  expect(screen.getByText('Mari Staff')).toBeInTheDocument();
  expect(screen.getByText('Войти')).toBeInTheDocument();
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
  const originalScrollTo = HTMLElement.prototype.scrollTo;

  global.fetch = jest.fn().mockRejectedValue(new Error('network disabled in test'));
  HTMLElement.prototype.scrollTo = jest.fn();

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

  expect(await screen.findByText('Журнал')).toBeInTheDocument();
  expect(screen.getByText('Еще')).toBeInTheDocument();
  expect(screen.queryByText('График')).not.toBeInTheDocument();
  expect(screen.queryByText('Клиенты')).not.toBeInTheDocument();
  expect(screen.queryByText('Уведомл...')).not.toBeInTheDocument();

  window.localStorage.removeItem('mari.staff.session.v1');
  global.fetch = originalFetch;
  HTMLElement.prototype.scrollTo = originalScrollTo;
});
