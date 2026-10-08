/** Small category/status pill. */

interface BadgeProps {
  label: string;
  /** Hex color — derives translucent background + text tint. */
  color?: string;
  className?: string;
}

export default function Badge({ label, color, className = '' }: BadgeProps) {
  return (
    <span
      className={`text-[10px] px-2 py-0.5 rounded font-medium leading-none uppercase tracking-wide border ${
        !color ? 'bg-gray-800 text-gray-400 border-gray-700' : 'border-transparent'
      } ${className}`}
      style={color ? { backgroundColor: `${color}20`, color: `${color}` } : undefined}
    >
      {label}
    </span>
  );
}
