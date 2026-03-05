import { FormEvent, useState } from 'react';
import { Loader2 } from 'lucide-react';

type SetPinScreenProps = {
  token: string;
  loading: boolean;
  error: string;
  onSubmit: (pin: string) => Promise<void>;
};

const PIN_PATTERN = /^\d{4,8}$/;

export function SetPinScreen({ token, loading, error, onSubmit }: SetPinScreenProps) {
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [localError, setLocalError] = useState('');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError('');

    if (!token.trim()) {
      setLocalError('Токен приглашения не найден');
      return;
    }

    if (!PIN_PATTERN.test(pin.trim())) {
      setLocalError('PIN должен содержать от 4 до 8 цифр');
      return;
    }

    if (pin !== pinConfirm) {
      setLocalError('PIN и подтверждение не совпадают');
      return;
    }

    void onSubmit(pin.trim());
  };

  return (
    <form
      className="flex flex-1 flex-col justify-center px-6 pb-16 pt-8"
      onSubmit={handleSubmit}
    >
      <h1 className="text-3xl font-extrabold text-ink">Установка PIN</h1>
      <p className="mt-2 text-sm font-semibold text-muted">
        Завершите приглашение сотрудника
      </p>

      <div className="mt-6 space-y-3">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-muted">PIN</span>
          <input
            value={pin}
            onChange={(event) => setPin(event.target.value)}
            placeholder="1234"
            type="password"
            autoComplete="new-password"
            className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm font-semibold text-ink outline-none"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-muted">
            Подтверждение PIN
          </span>
          <input
            value={pinConfirm}
            onChange={(event) => setPinConfirm(event.target.value)}
            placeholder="1234"
            type="password"
            autoComplete="new-password"
            className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm font-semibold text-ink outline-none"
          />
        </label>
      </div>

      {localError ? (
        <div className="mt-4 rounded-xl border border-[#efc0c0] bg-[#fdf0f0] px-4 py-2 text-sm font-semibold text-[#b73030]">
          {localError}
        </div>
      ) : null}

      {!localError && error ? (
        <div className="mt-4 rounded-xl border border-[#efc0c0] bg-[#fdf0f0] px-4 py-2 text-sm font-semibold text-[#b73030]">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={loading || pin.trim().length === 0 || pinConfirm.trim().length === 0}
        className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-3 text-sm font-extrabold text-[#222b33] disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Сохранить PIN
      </button>

      <a
        href="/login"
        className="mt-4 text-center text-sm font-semibold text-muted underline"
      >
        Перейти к входу
      </a>
    </form>
  );
}
