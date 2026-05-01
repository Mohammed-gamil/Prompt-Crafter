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
      className="group flex items-center gap-2 pl-2 pr-1.5 py-1 rounded text-xs font-semibold text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
    >
      <span className="hidden sm:inline">{label}</span>
      <div className="w-5 h-5 rounded flex items-center justify-center bg-gray-800 text-gray-300">   
        <span>{icon}</span>
      </div>
    </button>
  );
}
