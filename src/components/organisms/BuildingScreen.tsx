import { useCodeStore } from '../../codeIndex/store';

export default function BuildingScreen() {
  const progress = useCodeStore((s) => s.progress);
  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
  return (
    <div className="h-full w-full flex items-center justify-center bg-zinc-950 p-8">
      <div className="w-full max-w-sm text-center">
        <h2 className="text-base font-medium text-white mb-1">{progress.label || 'Parsing codebase…'}</h2>
        <p className="text-xs text-zinc-600 mb-6 font-mono">{progress.done}/{progress.total}</p>
        <div className="h-1 rounded-full bg-zinc-900 overflow-hidden">
          <div className="h-full bg-blue-600 transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}
