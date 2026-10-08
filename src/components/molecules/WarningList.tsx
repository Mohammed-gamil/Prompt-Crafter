import type { CompilerWarning } from '../../types';

interface WarningListProps {
  warnings: CompilerWarning[];
}

/** Renders compiler warnings. Returns null when the list is empty. */
export default function WarningList({ warnings }: WarningListProps) {
  if (warnings.length === 0) return null;

  const levelColor = (severity: CompilerWarning['severity']): string => {
    if (severity === 'error') return 'text-red-300';
    if (severity === 'warning') return 'text-amber-300';
    return 'text-zinc-400';
  };

  return (
    <div className="px-4 py-2 border-b border-zinc-800">
      {warnings.map((w, i) => (
        <div key={i} className="flex items-start gap-2 py-0.5">
          <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${w.severity === 'error' ? 'bg-red-400' : w.severity === 'warning' ? 'bg-amber-400' : 'bg-zinc-500'}`} />
          <span className={`text-[11px] ${levelColor(w.severity)}`}>
            <span className="font-mono text-zinc-600 mr-1.5">{w.code}</span>
            {w.message}
          </span>
        </div>
      ))}
    </div>
  );
}
