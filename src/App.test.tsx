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
  expect(screen.getByText('Установка PIN')).toBeInTheDocument();
  expect(screen.getByText('Сохранить PIN')).toBeInTheDocument();
});

test('renders reset-pin request screen by route', () => {
  render(
    <MemoryRouter initialEntries={['/staff/reset-pin']}>
      <App />
    </MemoryRouter>,
  );
  expect(screen.getByText('Сброс PIN')).toBeInTheDocument();
  expect(screen.getByText('Запросить сброс PIN')).toBeInTheDocument();
});

test('renders reset-pin confirm screen by route token', () => {
  render(
    <MemoryRouter initialEntries={['/staff/reset-pin?token=test-token']}>
      <App />
    </MemoryRouter>,
  );
  expect(screen.getByRole('heading', { name: 'Новый PIN' })).toBeInTheDocument();
  expect(screen.getByText('Сохранить новый PIN')).toBeInTheDocument();
});
