import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { PinAuthLayout } from './PinAuthLayout';
import { PinCodePad } from './PinCodePad';

type SetPinScreenProps = {
  token: string;
  loading: boolean;
  error: string;
  onSubmit: (pin: string) => Promise<void>;
};

const PIN_PATTERN = /^\d{4}$/;
const PIN_LENGTH = 4;
type PinStep = 'create' | 'confirm';

export function SetPinScreen({ token, loading, error, onSubmit }: SetPinScreenProps) {
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [localError, setLocalError] = useState('');
  const [step, setStep] = useState<PinStep>('create');

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
    void onSubmit(pin);
  };

  const appendDigit = (digit: string) => {
    if (loading) {
      return;
    }
    setLocalError('');
    if (!token.trim()) {
      setLocalError('Токен приглашения не найден');
      return;
    }

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

  return (
    <PinAuthLayout
      title="Установка код-пароля"
      description={
        isCreateStep
          ? 'Введите код-пароль сотрудника (4 цифры)'
          : 'Повторите код-пароль для подтверждения'
      }
      heroKicker="Настройка доступа"
      heroTitle="Создайте пин-код для входа сотрудника"
      heroDescription="Придумайте пин, который будете использовать для входа в админ-панель"
      heroNote="Используйте 4 цифры, которые удобно набрать сотруднику и сложно угадать постороннему."
      footer={
        <>
          {step === 'confirm' ? (
            <button
              type="button"
              onClick={() => {
                setLocalError('');
                setStep('create');
                setPin('');
                setPinConfirm('');
              }}
              className="rounded-2xl border border-line px-4 py-3 text-sm font-semibold text-muted md:h-14 md:text-base"
            >
              Изменить код-пароль
            </button>
          ) : null}

          <a
            href="/login"
            className="mt-4 text-center text-sm font-semibold text-muted underline md:text-base"
          >
            Перейти к входу
          </a>
        </>
      }
    >
      <div className="md:max-w-[420px]">
        <PinCodePad
          value={activeValue}
          maxLength={PIN_LENGTH}
          onAppendDigit={appendDigit}
          onDeleteDigit={deleteDigit}
          disabled={loading}
        />

        {loading ? (
          <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-muted md:text-base">
            <Loader2 className="h-4 w-4 animate-spin" />
            Сохраняю код-пароль...
          </div>
        ) : null}

        {localError ? (
          <div className="mt-4 rounded-xl border border-[#efc0c0] bg-[#fdf0f0] px-4 py-2 text-sm font-semibold text-[#b73030] md:text-base">
            {localError}
          </div>
        ) : null}

        {!localError && error ? (
          <div className="mt-4 rounded-xl border border-[#efc0c0] bg-[#fdf0f0] px-4 py-2 text-sm font-semibold text-[#b73030] md:text-base">
            {error}
          </div>
        ) : null}
      </div>
    </PinAuthLayout>
  );
}
