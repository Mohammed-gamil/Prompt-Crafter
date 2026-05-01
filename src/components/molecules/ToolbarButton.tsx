interface ToolbarButtonProps {
  icon: string;
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
      className="group flex items-center gap-2.5 pl-3 pr-1.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.1em] text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-700 ease-vanguard active:scale-95"
    >
      <span className="hidden sm:inline transition-transform duration-700 group-hover:translate-x-0.5">{label}</span>
      <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center transition-all duration-700 ease-vanguard group-hover:bg-white/10 group-hover:scale-110 group-hover:rotate-12">
        <span className="text-xs transition-transform duration-700 group-hover:scale-110">{icon}</span>
      </div>
    </button>
  );
}
