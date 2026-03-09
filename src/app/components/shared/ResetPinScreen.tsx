import { FormEvent, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { PinCodePad } from './PinCodePad';

type ResetPinScreenProps = {
  token: string;
  loading: boolean;
  error: string;
  onRequest: (email: string) => Promise<{ sent: boolean; resetLink?: string }>;
  onConfirm: (token: string, newPin: string) => Promise<void>;
};

const PIN_PATTERN = /^\d{4}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PIN_LENGTH = 4;
type PinStep = 'create' | 'confirm';

export function ResetPinScreen({
  token,
  loading,
  error,
  onRequest,
  onConfirm,
}: ResetPinScreenProps) {
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [localError, setLocalError] = useState('');
  const [requestDone, setRequestDone] = useState(false);
  const [debugResetLink, setDebugResetLink] = useState('');
  const [step, setStep] = useState<PinStep>('create');

  const hasToken = token.trim().length > 0;
  const isEmailValid = EMAIL_PATTERN.test(email.trim().toLowerCase());
  const isCreateStep = step === 'create';
  const activeValue = isCreateStep ? pin : pinConfirm;

  const submitIfConfirmed = (confirmValue: string) => {
    if (!PIN_PATTERN.test(pin) || !PIN_PATTERN.test(confirmValue)) {
      setLocalError('Код-пароль должен содержать 4 цифры');
      setStep('create');
      setPin('');
      setPinConfirm('');
      return;
    }
    if (pin !== confirmValue) {
      setLocalError('Код-пароль и подтверждение не совпадают');
      setPinConfirm('');
      return;
    }
    void onConfirm(token, pin);
  };

  const appendDigit = (digit: string) => {
    if (loading) {
      return;
    }
    setLocalError('');
    if (isCreateStep) {
      if (pin.length >= PIN_LENGTH) {
        return;
      }
      const nextPin = `${pin}${digit}`;
      setPin(nextPin);
      if (nextPin.length === PIN_LENGTH) {
        setStep('confirm');
        setPinConfirm('');
      }
      return;
    }
    if (pinConfirm.length >= PIN_LENGTH) {
      return;
    }
    const nextConfirm = `${pinConfirm}${digit}`;
    setPinConfirm(nextConfirm);
    if (nextConfirm.length === PIN_LENGTH) {
      submitIfConfirmed(nextConfirm);
    }
  };

  const deleteDigit = () => {
    if (loading) {
      return;
    }
    setLocalError('');
    if (isCreateStep) {
      setPin((prev) => prev.slice(0, -1));
      return;
    }
    setPinConfirm((prev) => prev.slice(0, -1));
  };

  const handleRequestSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError('');
    setDebugResetLink('');
    if (!isEmailValid) {
      setLocalError('Введите корректный email');
      return;
    }
    void (async () => {
      try {
        const data = await onRequest(email.trim().toLowerCase());
        setRequestDone(Boolean(data.sent));
        setDebugResetLink(data.resetLink || '');
      } catch {
        // API error already set in shared authError state.
      }
    })();
  };

  if (!hasToken) {
    return (
      <form
        className="flex h-full min-h-full flex-1 flex-col justify-center px-6 pb-16 pt-16"
        onSubmit={handleRequestSubmit}
      >
        <h1 className="text-2xl my-6 font-extrabold text-ink">Сброс код-пароля</h1>
        <p className="mb-20 text-sm font-semibold text-muted">
          Введите email, чтобы запросить ссылку на сброс
        </p>

        <div className="mt-6 space-y-3">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-muted">Email</span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              autoComplete="email"
              inputMode="email"
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
            Ссылка на сброс код-пароля отправлена email.
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
          disabled={loading || !isEmailValid}
          className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-3 text-sm font-extrabold text-[#222b33] disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Запросить сброс код-пароля
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
    <section className="flex h-full min-h-full flex-1 flex-col px-6 pb-8 pt-8">
      <div>
        <h1 className="text-3xl font-extrabold text-ink">Новый код-пароль</h1>
        <p className="mt-2 text-sm font-semibold text-muted">
          {isCreateStep
            ? 'Введите новый код-пароль (4 цифры)'
            : 'Повторите код-пароль для подтверждения'}
        </p>

        <PinCodePad
          value={activeValue}
          maxLength={PIN_LENGTH}
          onAppendDigit={appendDigit}
          onDeleteDigit={deleteDigit}
          disabled={loading}
        />

        {loading ? (
          <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            Сохраняю новый код-пароль...
          </div>
        ) : null}

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
      </div>

      <div className="mt-auto flex flex-col">
        {step === 'confirm' ? (
          <button
            type="button"
            onClick={() => {
              setLocalError('');
              setStep('create');
              setPin('');
              setPinConfirm('');
            }}
            className="rounded-2xl border border-line px-4 py-3 text-sm font-semibold text-muted"
          >
            Изменить код-пароль
          </button>
        ) : null}

        <a
          href="/login"
          className="mt-4 text-center text-sm font-semibold text-muted underline"
        >
          Вернуться ко входу
        </a>
      </div>
    </section>
  );
}
