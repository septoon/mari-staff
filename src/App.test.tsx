import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

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
