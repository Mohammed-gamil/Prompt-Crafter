interface ToolbarButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export default function ToolbarButton({ icon, label, onClick, disabled = false }: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs text-zinc-500 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
    >
      <span className="hidden sm:inline">{label}</span>
      <span className="flex items-center text-zinc-500">
        {icon}
      </span>
    </button>
  );
}
