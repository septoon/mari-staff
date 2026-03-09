import { Eye, EyeOff, Loader2, Lock, Phone } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';

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

  const phoneDigits = useMemo(() => phone.replace(/\D+/g, ''), [phone]);
  const isPhoneValid = phoneDigits.length >= 10;
  const isPinValid = /^\d{4,8}$/.test(pin.trim());
  const isFormValid = isPhoneValid && isPinValid;

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
    <div className="relative flex flex-1 flex-col overflow-hidden bg-[#f3f3f4]">
      <div className="relative min-h-[320px] bg-[#f4c900]">
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

      <div className="relative z-10 -mt-6 flex flex-1 flex-col bg-[#f3f3f4] px-7 pb-10 pt-8">
        <h1 className="text-[52px] font-extrabold leading-none text-[#30343a]">Вход</h1>
        <div className="mt-3 h-1 w-[92px] rounded-full bg-[#f6878d]" />
        <p className="mt-4 text-sm font-semibold text-[#767c86]">Mari Staff</p>

        <form className="mt-8 flex flex-1 flex-col" onSubmit={handleSubmit}>
          <label className="text-[17px] font-bold text-[#51565f]">Телефон</label>
          <div className="mt-3 flex items-center gap-3 border-b border-[#f4a7ab] pb-3">
            <Phone className="h-5 w-5 text-[#a3a8b0]" strokeWidth={2.2} />
            <input
              value={phone}
              onChange={(event) => onPhoneChange(event.target.value)}
              placeholder="+7 978 000-00-00"
              autoComplete="tel"
              className="w-full bg-transparent text-[22px] font-semibold tracking-[0.02em] text-[#31363d] placeholder:text-[#b7bcc4] outline-none"
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

          {localError ? (
            <div className="mt-4 rounded-xl border border-[#efc0c0] bg-[#fdf0f0] px-4 py-2 text-sm font-semibold text-[#b73030]">
              {localError}
            </div>
          ) : null}

          {!localError && error ? (
            <div className="mt-4 rounded-xl border border-[#efc0c0] bg-[#fdf0f0] px-4 py-2 text-sm font-semibold text-[#b73030]">
              Неверный логин или пароль
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

          <div className="mt-auto pt-8 text-center">
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
  );
}
