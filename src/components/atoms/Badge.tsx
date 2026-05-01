/** Vanguard-tier badge atom for category and status labels. */

interface BadgeProps {
  label: string;
  /** Hex color — derives translucent background + text tint. */
  color?: string;
  className?: string;
}

export default function Badge({ label, color, className = '' }: BadgeProps) {
  return (
    <span
      className={`text-[9px] px-2.5 py-0.5 rounded-full font-bold leading-none uppercase tracking-[0.15em] border ${
        !color ? 'bg-white/5 text-gray-400 border-white/5' : 'border-white/5'
      } ${className}`}
      style={color ? { backgroundColor: `${color}15`, color: `${color}cc` } : undefined}
    >
      {label}
    </span>
  );
}
