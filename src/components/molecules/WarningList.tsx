import type { CompilerWarning } from '../../types';

interface WarningListProps {
  warnings: CompilerWarning[];
}

/** Renders compiler warnings. Returns null when the list is empty. */
export default function WarningList({ warnings }: WarningListProps) {
  if (warnings.length === 0) return null;

  const levelColor = (severity: CompilerWarning['severity']): string => {
    if (severity === 'error') return 'text-red-300/90';
    if (severity === 'warning') return 'text-yellow-300/90';
    return 'text-sky-300/90';
  };

  const icon = (severity: CompilerWarning['severity']): string => {
    if (severity === 'error') return '⛔';
    if (severity === 'warning') return '⚠';
    return 'ℹ';
  };

  return (
    <div className="px-4 py-2 border-b border-gray-800 bg-yellow-900/10">
      {warnings.map((w, i) => (
        <div key={i} className="flex items-start gap-2 py-0.5">
          <span className="text-xs mt-0.5">{icon(w.severity)}</span>
          <span className={`text-[11px] ${levelColor(w.severity)}`}>
            <span className="text-[10px] uppercase font-mono text-gray-500 mr-1">{w.code}</span>
            {w.message}
            {w.nodeId ? <span className="text-gray-500"> (node: {w.nodeId})</span> : null}
          </span>
        </div>
      ))}
    </div>
  );
}
