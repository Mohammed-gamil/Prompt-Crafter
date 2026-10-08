interface CoTToggleProps {
  toggled: boolean;
  color: string;
  onToggle: () => void;
}

export default function CoTToggle({ toggled, color, onToggle }: CoTToggleProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-zinc-400">Chain-of-thought</span>
      <button
        onClick={onToggle}
        className="relative w-9 h-5 rounded-full transition-colors"
        style={{ backgroundColor: toggled ? color : '#2e2e33' }}
      >
        <span
          className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
          style={{ left: toggled ? '18px' : '2px' }}
        />
      </button>
      <span className="text-[11px] font-mono text-zinc-500">
        {toggled ? 'on' : 'off'}
      </span>
    </div>
  );
}
