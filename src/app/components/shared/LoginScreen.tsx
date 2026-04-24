import { Eye, EyeOff, Loader2, Lock, Phone } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { buildRuPhoneValue, getRuPhoneLocalDigits, normalizePhoneForWhatsApp } from '../../helpers';

type LoginScreenProps = {
  phone: string;
  pin: string;
  error: string;
  loading: boolean;
  onPhoneChange: (value: string) => void;
  onPinChange: (value: string) => void;
  onLogin: () => void;
};

export function LoginScreen({
  phone,
  pin,
  error,
  loading,
  onPhoneChange,
  onPinChange,
  onLogin,
}: LoginScreenProps) {
  const [localError, setLocalError] = useState('');
  const [showPin, setShowPin] = useState(false);

  const phoneLocalDigits = useMemo(() => getRuPhoneLocalDigits(phone), [phone]);
  const phoneDigits = useMemo(() => normalizePhoneForWhatsApp(phone), [phone]);
  const isPhoneValid = phoneDigits.length === 11 && phoneDigits.startsWith('7');
  const isPinValid = /^\d{4,8}$/.test(pin.trim());
  const isFormValid = isPhoneValid && isPinValid;
  const errorMessage = localError || (error ? 'Неверный логин или пароль' : '');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError('');
    if (!isPhoneValid) {
      setLocalError('Введите корректный телефон');
      return;
    }
    if (!isPinValid) {
      setLocalError('Код-пароль должен содержать 4-8 цифр');
      return;
    }
    onLogin();
  };

  return (
    <>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain bg-[#f3f3f4] md:hidden">
        <div className="relative min-h-[320px] shrink-0 bg-[#f4c900]">
          <div
            className="absolute inset-0 opacity-35"
            style={{
              backgroundImage:
                'radial-gradient(220px 140px at 8% 20%, transparent 62%, rgba(255,255,255,0.34) 63%, rgba(255,255,255,0.34) 64.4%, transparent 66%), radial-gradient(260px 160px at 56% 12%, transparent 63%, rgba(255,255,255,0.34) 64%, rgba(255,255,255,0.34) 65.4%, transparent 67%), radial-gradient(240px 150px at 90% 42%, transparent 62%, rgba(255,255,255,0.34) 63%, rgba(255,255,255,0.34) 64.4%, transparent 66%), radial-gradient(240px 150px at 28% 74%, transparent 62%, rgba(255,255,255,0.34) 63%, rgba(255,255,255,0.34) 64.4%, transparent 66%), radial-gradient(240px 150px at 74% 76%, transparent 62%, rgba(255,255,255,0.34) 63%, rgba(255,255,255,0.34) 64.4%, transparent 66%)',
            }}
          />
          <svg
            className="pointer-events-none absolute -bottom-px left-0 h-[156px] w-full"
            viewBox="0 0 430 156"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M0 52C58 34 125 48 181 86C236 124 305 145 430 106V156H0V52Z"
              fill="#f3f3f4"
            />
          </svg>
        </div>

        <div className="relative z-10 -mt-6 flex flex-none flex-col bg-[#f3f3f4] px-7 pb-[calc(env(safe-area-inset-bottom,0px)+32px)] pt-8">
          <h1 className="text-[52px] font-extrabold leading-none text-[#30343a]">Вход</h1>
          <div className="mt-3 h-1 w-[92px] rounded-full bg-[#f6878d]" />
          <p className="mt-4 text-sm font-semibold text-[#767c86]">Mari Staff</p>

          <form className="mt-8 flex flex-col" onSubmit={handleSubmit}>
            <label className="text-[17px] font-bold text-[#51565f]">Телефон</label>
            <div className="mt-3 flex items-center gap-3 border-b border-[#f4a7ab] pb-3">
              <Phone className="h-5 w-5 text-[#a3a8b0]" strokeWidth={2.2} />
              <span className="shrink-0 text-[22px] font-semibold tracking-[0.02em] text-[#31363d]">
                +7
              </span>
              <input
                value={phoneLocalDigits}
                onChange={(event) => onPhoneChange(buildRuPhoneValue(event.target.value))}
                placeholder="9780000000"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="tel-national"
                className="min-w-0 w-full bg-transparent text-[22px] font-semibold tracking-[0.02em] text-[#31363d] placeholder:text-[#b7bcc4] outline-none"
              />
            </div>

            <label className="mt-8 text-[17px] font-bold text-[#51565f]">Код-пароль</label>
            <div className="mt-3 flex items-center gap-3 border-b border-[#d2d5da] pb-3">
              <Lock className="h-5 w-5 text-[#a3a8b0]" strokeWidth={2.2} />
              <input
                value={pin}
                onChange={(event) => onPinChange(event.target.value)}
                placeholder="Введите код-пароль"
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                autoComplete="current-password"
                className="w-full bg-transparent text-[22px] font-semibold tracking-[0.02em] text-[#31363d] placeholder:text-[#b7bcc4] outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPin((prev) => !prev)}
                className="inline-flex h-8 w-8 items-center justify-center text-[#b5bac2]"
                aria-label={showPin ? 'Скрыть код-пароль' : 'Показать код-пароль'}
              >
                {showPin ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            {errorMessage ? (
              <div className="mt-4 rounded-xl border border-[#efc0c0] bg-[#fdf0f0] px-4 py-2 text-sm font-semibold text-[#b73030]">
                {errorMessage}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading || !isFormValid}
              className="mt-11 inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-[#f4c900] px-4 text-2xl font-extrabold text-white shadow-[0_10px_22px_rgba(246,135,141,0.42)] disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
              Войти
            </button>

            <div className="mt-8 text-center">
              <a
                href="/staff/reset-pin"
                className="text-[19px] font-bold text-[#f6878d] underline decoration-2 underline-offset-4"
              >
                Забыли пароль?
              </a>
            </div>
          </form>
        </div>
      </div>

      <section className="hidden min-h-full flex-1 flex-col md:flex md:overflow-y-auto">
        <div className="flex flex-1 flex-col md:mx-auto md:min-h-full md:w-full md:max-w-[1180px] md:flex-row md:gap-6 md:px-8 md:py-8 lg:gap-8 lg:px-10 lg:py-10">
          <aside className="relative flex-1 overflow-hidden rounded-[36px] bg-[#f4c900] px-10 py-10 text-[#30343a] lg:px-12 lg:py-12">
            <div
              className="absolute inset-0 opacity-35"
              aria-hidden="true"
              style={{
                backgroundImage:
                  'radial-gradient(240px 160px at 8% 18%, transparent 62%, rgba(255,255,255,0.34) 63%, rgba(255,255,255,0.34) 64.4%, transparent 66%), radial-gradient(260px 160px at 62% 12%, transparent 63%, rgba(255,255,255,0.34) 64%, rgba(255,255,255,0.34) 65.4%, transparent 67%), radial-gradient(220px 150px at 92% 38%, transparent 62%, rgba(255,255,255,0.34) 63%, rgba(255,255,255,0.34) 64.4%, transparent 66%), radial-gradient(240px 150px at 28% 74%, transparent 62%, rgba(255,255,255,0.34) 63%, rgba(255,255,255,0.34) 64.4%, transparent 66%), radial-gradient(240px 150px at 74% 82%, transparent 62%, rgba(255,255,255,0.34) 63%, rgba(255,255,255,0.34) 64.4%, transparent 66%)',
              }}
            />

            <div className="relative z-10 flex h-full min-h-[680px] flex-col justify-between">
              <div className="max-w-[480px]">
                <span className="inline-flex rounded-full bg-[rgba(255,255,255,0.55)] px-4 py-2 text-xs font-extrabold uppercase tracking-[0.2em] text-[#4a4f56]">
                  Авторизация
                </span>
                <h2 className="mt-8 text-[64px] font-extrabold leading-[0.94] tracking-[-0.05em] text-[#30343a]">
                  Админ панель
                </h2>
                <div className="mt-5 h-1 w-[96px] rounded-full bg-[#f6878d]" />
                <p className="mt-6 max-w-[430px] text-[19px] font-semibold leading-8 text-[#535860]">
                  Экран входа в Mari Beauty Staff.
                </p>
              </div>

              <div className="max-w-[360px] rounded-[30px] bg-[rgba(255,255,255,0.52)] px-6 py-6 backdrop-blur-[2px]">
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#626770]">
                  Mari Staff
                </p>
                <p className="mt-3 text-lg font-semibold leading-8 text-[#464b54]">
                  Используйте рабочий телефон и ваш пин-код, чтобы открыть журнал, записи и
                  уведомления.
                </p>
              </div>
            </div>

            <svg
              className="pointer-events-none absolute -bottom-px left-0 h-[180px] w-full text-[#fcfcfd]"
              viewBox="0 0 760 180"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path
                d="M0 78C96 42 207 45 301 94C391 140 508 163 760 118V180H0V78Z"
                fill="currentColor"
              />
            </svg>
          </aside>

          <div className="flex flex-1 flex-col rounded-[36px] bg-[#fcfcfd] px-10 pb-10 pt-10 shadow-[0_24px_60px_rgba(42,49,56,0.12)] lg:max-w-[540px] lg:flex-none lg:px-12">
            <div className="max-w-[420px]">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#8e949d]">
                Mari Staff
              </p>
              <h1 className="mt-4 text-[52px] font-extrabold leading-[0.96] tracking-[-0.04em] text-[#30343a]">
                Вход
              </h1>
              <p className="mt-5 text-base font-semibold leading-7 text-[#767c86]">
                Введите телефон сотрудника и код-пароль, чтобы открыть рабочий кабинет.
              </p>
            </div>

            <form className="mt-10 flex flex-1 flex-col" onSubmit={handleSubmit}>
              <div className="max-w-[420px]">
                <label className="text-[18px] font-bold text-[#51565f]">Телефон</label>
                <div className="mt-3 flex items-center gap-3 border-b border-[#f4a7ab] pb-4">
                  <Phone className="h-5 w-5 text-[#a3a8b0]" strokeWidth={2.2} />
                  <span className="shrink-0 text-[24px] font-semibold tracking-[0.02em] text-[#31363d]">
                    +7
                  </span>
                  <input
                    value={phoneLocalDigits}
                    onChange={(event) => onPhoneChange(buildRuPhoneValue(event.target.value))}
                    placeholder="9780000000"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="tel-national"
                    className="min-w-0 w-full bg-transparent text-[24px] font-semibold tracking-[0.02em] text-[#31363d] placeholder:text-[#b7bcc4] outline-none"
                  />
                </div>

                <label className="mt-10 block text-[18px] font-bold text-[#51565f]">
                  Код-пароль
                </label>
                <div className="mt-3 flex items-center gap-3 border-b border-[#d2d5da] pb-4">
                  <Lock className="h-5 w-5 text-[#a3a8b0]" strokeWidth={2.2} />
                  <input
                    value={pin}
                    onChange={(event) => onPinChange(event.target.value)}
                    placeholder="Введите код-пароль"
                    type={showPin ? 'text' : 'password'}
                    inputMode="numeric"
                    autoComplete="current-password"
                    className="w-full bg-transparent text-[24px] font-semibold tracking-[0.02em] text-[#31363d] placeholder:text-[#b7bcc4] outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin((prev) => !prev)}
                    className="inline-flex h-8 w-8 items-center justify-center text-[#b5bac2] transition hover:text-[#8f96a0]"
                    aria-label={showPin ? 'Скрыть код-пароль' : 'Показать код-пароль'}
                  >
                    {showPin ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>

                {errorMessage ? (
                  <div className="mt-5 rounded-xl border border-[#efc0c0] bg-[#fdf0f0] px-4 py-3 text-sm font-semibold text-[#b73030]">
                    {errorMessage}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={loading || !isFormValid}
                  className="mt-12 inline-flex h-16 w-full items-center justify-center gap-2 rounded-[24px] bg-[#f4c900] px-4 text-[28px] font-extrabold text-white shadow-[0_18px_34px_rgba(246,135,141,0.34)] transition disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                  Войти
                </button>
              </div>

              <div className="mt-auto pt-10 text-center">
                <a
                  href="/staff/reset-pin"
                  className="text-[20px] font-bold text-[#f6878d] underline decoration-2 underline-offset-4"
                >
                  Забыли пароль?
                </a>
              </div>
            </form>
          </div>
        </div>
      </section>
    </>
  );
}
