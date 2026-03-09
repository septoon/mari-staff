type PinCodePadProps = {
  value: string;
  maxLength: number;
  onAppendDigit: (digit: string) => void;
  onDeleteDigit: () => void;
  disabled?: boolean;
};

const DIGITS_LAYOUT = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'delete'] as const;

export function PinCodePad({
  value,
  maxLength,
  onAppendDigit,
  onDeleteDigit,
  disabled = false,
}: PinCodePadProps) {
  return (
    <div className="mt-8">
      <div className="mx-auto flex w-full max-w-[280px] items-center justify-center gap-5">
        {Array.from({ length: maxLength }).map((_, index) => {
          const isFilled = index < value.length;
          return (
            <span
              key={index}
              className={`h-4 w-4 rounded-full ${
                isFilled ? 'bg-[#3b4048]' : 'bg-[#d6d8dd]'
              }`}
            />
          );
        })}
      </div>

      <div className="mx-auto mt-10 grid w-full max-w-[360px] grid-cols-3 gap-y-7">
        {DIGITS_LAYOUT.map((item, index) => {
          if (item === '') {
            return <div key={`empty-${index}`} aria-hidden="true" />;
          }

          if (item === 'delete') {
            return (
              <button
                key={item}
                type="button"
                aria-label="Удалить цифру"
                onClick={onDeleteDigit}
                disabled={disabled || value.length === 0}
                className="mx-auto inline-flex h-20 w-20 items-center justify-center rounded-full text-[36px] font-light leading-none text-ink transition active:scale-95 active:bg-[#e4e6eb] disabled:opacity-35"
              >
                ⌫
              </button>
            );
          }

          return (
            <button
              key={item}
              type="button"
              onClick={() => onAppendDigit(item)}
              disabled={disabled || value.length >= maxLength}
              className="mx-auto inline-flex h-20 w-20 items-center justify-center rounded-full text-[64px] font-light leading-none text-ink transition active:scale-95 active:bg-[#e4e6eb] disabled:opacity-35"
            >
              {item}
            </button>
          );
        })}
      </div>
    </div>
  );
}
