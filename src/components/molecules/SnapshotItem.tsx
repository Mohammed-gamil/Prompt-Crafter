import type { PromptVersion } from '../../types';

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return (
    d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );
}

interface SnapshotItemProps {
  version: PromptVersion;
  onRestore: (id: string, name: string) => void;
  onDelete: (id: string, name: string, e: React.MouseEvent) => void;
}

export default function SnapshotItem({ version, onRestore, onDelete }: SnapshotItemProps) {
  return (
    <li
      className="group px-4 py-3 hover:bg-[#1a1a2e] cursor-pointer transition-colors"
      onClick={() => onRestore(version.id, version.name)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-white font-medium truncate">{version.name}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">{formatTimestamp(version.timestamp)}</p>
          <p className="text-[10px] text-gray-600 mt-0.5">
            {version.nodes.length} node{version.nodes.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <span className="text-[10px] text-indigo-400 mt-1">Restore</span>
          <button
            onClick={(e) => onDelete(version.id, version.name, e)}
            className="text-[10px] text-red-500 hover:text-red-400 mt-1 ml-1"
            title="Delete snapshot"
          >
            ✕
          </button>
        </div>
      </div>
    </li>
  );
}
