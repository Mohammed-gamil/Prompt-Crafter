/** Primitive button atom — use variant + size props, pass className for overrides. */

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'warning';
  size?: 'xs' | 'sm';
}

const VARIANT: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:   'bg-indigo-600 hover:bg-indigo-500 text-white',
  secondary: 'bg-gray-700   hover:bg-gray-600   text-gray-300',
  ghost:     'bg-gray-800   hover:bg-gray-700   text-gray-400 hover:text-white',
  danger:    'bg-red-900/30 hover:bg-red-900/60 text-red-400',
  warning:   'bg-amber-600  hover:bg-amber-500  text-white',
};

const SIZE: Record<NonNullable<ButtonProps['size']>, string> = {
  xs: 'text-[10px] px-2 py-1',
  sm: 'text-xs    px-3 py-1.5',
};

export default function Button({
  variant = 'secondary',
  size = 'sm',
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={`rounded font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${VARIANT[variant]} ${SIZE[size]} ${className}`}
    >
      {children}
    </button>
  );
}
