import clsx from 'clsx';
import { Loader2 } from 'lucide-react';
import { InputSwitch } from 'primereact/inputswitch';
import type { CSSProperties } from 'react';

type PrimeSwitchSize = 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

type PrimeSwitchProps = {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  loading?: boolean;
  size?: PrimeSwitchSize;
  className?: string;
  ariaLabel?: string;
};

const SIZE_STYLES: Record<PrimeSwitchSize, CSSProperties> = {
  sm: {
    ['--mari-switch-width' as string]: '3rem',
    ['--mari-switch-height' as string]: '1.75rem',
    ['--mari-switch-padding' as string]: '0.25rem',
    ['--mari-switch-thumb-size' as string]: '1.25rem',
    ['--mari-switch-translate' as string]: '1.5rem',
  },
  md: {
    ['--mari-switch-width' as string]: '3.25rem',
    ['--mari-switch-height' as string]: '1.875rem',
    ['--mari-switch-padding' as string]: '0.1875rem',
    ['--mari-switch-thumb-size' as string]: '1.5rem',
    ['--mari-switch-translate' as string]: '1.375rem',
  },
  lg: {
    ['--mari-switch-width' as string]: '4rem',
    ['--mari-switch-height' as string]: '2rem',
    ['--mari-switch-padding' as string]: '0.25rem',
    ['--mari-switch-thumb-size' as string]: '1.5rem',
    ['--mari-switch-translate' as string]: '2rem',
  },
  xl: {
    ['--mari-switch-width' as string]: '5rem',
    ['--mari-switch-height' as string]: '2.25rem',
    ['--mari-switch-padding' as string]: '0.25rem',
    ['--mari-switch-thumb-size' as string]: '1.75rem',
    ['--mari-switch-translate' as string]: '2.75rem',
  },
  xxl: {
    ['--mari-switch-width' as string]: '6rem',
    ['--mari-switch-height' as string]: '2.5rem',
    ['--mari-switch-padding' as string]: '0.25rem',
    ['--mari-switch-thumb-size' as string]: '2rem',
    ['--mari-switch-translate' as string]: '3.5rem',
  },
};

export function PrimeSwitch({
  checked,
  onChange,
  disabled = false,
  loading = false,
  size = 'md',
  className,
  ariaLabel,
}: PrimeSwitchProps) {
  return (
    <span className={clsx('relative inline-flex shrink-0 items-center justify-center', className)}>
      <InputSwitch
        checked={checked}
        onChange={(event) => onChange(Boolean(event.value))}
        disabled={disabled || loading}
        unstyled
        className="mari-switch"
        style={SIZE_STYLES[size]}
        pt={{
          root: {
            className: 'mari-switch-root',
          },
          input: {
            className: 'mari-switch-input',
            'aria-label': ariaLabel,
          },
          slider: {
            className: 'mari-switch-slider',
          },
        }}
      />
      {loading ? (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[#556070]" />
        </span>
      ) : null}
    </span>
  );
}
