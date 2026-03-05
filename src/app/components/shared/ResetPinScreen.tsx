import { FormEvent, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';

type ResetPinScreenProps = {
  token: string;
  loading: boolean;
  error: string;
  onRequest: (phone: string) => Promise<{ sent: boolean; resetLink?: string }>;
  onConfirm: (token: string, newPin: string) => Promise<void>;
};

const PIN_PATTERN = /^\d{4,8}$/;

export function ResetPinScreen({
  token,
  loading,
  error,
  onRequest,
  onConfirm,
}: ResetPinScreenProps) {
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [localError, setLocalError] = useState('');
  const [requestDone, setRequestDone] = useState(false);
  const [debugResetLink, setDebugResetLink] = useState('');

  const hasToken = token.trim().length > 0;
  const isPhoneValid = useMemo(() => phone.replace(/\D+/g, '').length >= 10, [phone]);
  const isPinValid = useMemo(() => PIN_PATTERN.test(pin.trim()), [pin]);
  const isConfirmValid = pin.trim() === pinConfirm.trim() && pinConfirm.trim().length > 0;

  const handleRequestSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError('');
    setDebugResetLink('');
    if (!isPhoneValid) {
      setLocalError('Введите корректный телефон');
      return;
    }
    void (async () => {
      try {
        const data = await onRequest(phone.trim());
        setRequestDone(Boolean(data.sent));
        setDebugResetLink(data.resetLink || '');
      } catch {
        // API error already set in shared authError state.
      }
    })();
  };

  const handleConfirmSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError('');
    if (!PIN_PATTERN.test(pin.trim())) {
      setLocalError('PIN должен содержать 4-8 цифр');
      return;
    }
    if (!isConfirmValid) {
      setLocalError('PIN и подтверждение не совпадают');
      return;
    }
    void onConfirm(token, pin.trim());
  };

  if (!hasToken) {
    return (
      <form
        className="flex flex-1 flex-col justify-center px-6 pb-16 pt-8"
        onSubmit={handleRequestSubmit}
      >
        <h1 className="text-3xl font-extrabold text-ink">Сброс PIN</h1>
        <p className="mt-2 text-sm font-semibold text-muted">
          Введите телефон, чтобы запросить ссылку на сброс
        </p>

        <div className="mt-6 space-y-3">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-muted">Телефон</span>
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+7 978 000-00-00"
              autoComplete="tel"
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

        {requestDone ? (
          <div className="mt-4 rounded-xl border border-[#b7d2f4] bg-[#eef5ff] px-4 py-2 text-sm font-semibold text-[#1f56dd]">
            Запрос отправлен. Если номер найден и активен, ссылка на сброс отправлена.
          </div>
        ) : null}

        {debugResetLink ? (
          <a
            href={debugResetLink}
            className="mt-3 text-sm font-semibold text-[#1f56dd] underline"
          >
            Открыть reset-link (dev)
          </a>
        ) : null}

        <button
          type="submit"
          disabled={loading || !isPhoneValid}
          className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-3 text-sm font-extrabold text-[#222b33] disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Запросить сброс PIN
        </button>

        <a
          href="/login"
          className="mt-4 text-center text-sm font-semibold text-muted underline"
        >
          Вернуться ко входу
        </a>
      </form>
    );
  }

  return (
    <form
      className="flex flex-1 flex-col justify-center px-6 pb-16 pt-8"
      onSubmit={handleConfirmSubmit}
    >
      <h1 className="text-3xl font-extrabold text-ink">Новый PIN</h1>
      <p className="mt-2 text-sm font-semibold text-muted">Подтвердите сброс PIN сотрудника</p>

      <div className="mt-6 space-y-3">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-muted">Новый PIN</span>
          <input
            value={pin}
            onChange={(event) => setPin(event.target.value)}
            placeholder="1234"
            type="password"
            autoComplete="new-password"
            inputMode="numeric"
            className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm font-semibold text-ink outline-none"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-muted">Подтверждение PIN</span>
          <input
            value={pinConfirm}
            onChange={(event) => setPinConfirm(event.target.value)}
            placeholder="1234"
            type="password"
            autoComplete="new-password"
            inputMode="numeric"
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
        disabled={loading || !isPinValid || !isConfirmValid}
        className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-3 text-sm font-extrabold text-[#222b33] disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Сохранить новый PIN
      </button>

      <a
        href="/login"
        className="mt-4 text-center text-sm font-semibold text-muted underline"
      >
        Вернуться ко входу
      </a>
    </form>
  );
}
