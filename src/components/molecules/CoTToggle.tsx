interface CoTToggleProps {
  toggled: boolean;
  color: string;
  onToggle: () => void;
}

export default function CoTToggle({ toggled, color, onToggle }: CoTToggleProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-300">Chain-of-Thought:</span>
      <button
        onClick={onToggle}
        className="relative w-10 h-5 rounded-full transition-colors"
        style={{ backgroundColor: toggled ? color : '#444' }}
      >
        <span
          className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
          style={{ left: toggled ? '22px' : '2px' }}
        />
      </button>
      <span className="text-xs font-mono" style={{ color: toggled ? color : '#666' }}>
        {toggled ? 'ON' : 'OFF'}
      </span>
    </div>
  );
}
