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
      className="group flex items-center gap-2 pl-2 pr-1 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 active:scale-95"
    >
      <span className="hidden sm:inline transition-colors">{label}</span>
      <div className="w-6 h-6 rounded-md flex items-center justify-center bg-zinc-800 text-zinc-400 group-hover:bg-blue-600/20 group-hover:text-blue-400 transition-all">   
        {icon}
      </div>
    </button>
  );
}
