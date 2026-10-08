import { Plus, Trash } from '@phosphor-icons/react';

/** Draggable palette node row. Exports DRAG_TYPE used by the canvas drop handler. */
export const DRAG_TYPE = 'application/prompt-crafter-node';

interface PaletteNodeItemProps {
  label: string;
  nodeId: string;
  color: string;
  description: string;
  badge?: string;
  domain?: string;
  onAdd: () => void;
  onDelete?: () => void;
}

export default function PaletteNodeItem({
  label,
  nodeId,
  color,
  description,
  badge,
  domain,
  onAdd,
  onDelete,
}: PaletteNodeItemProps) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData(DRAG_TYPE, nodeId);
  };

  return (
    <div className="relative group/row">
      <button
        onClick={onAdd}
        draggable
        onDragStart={handleDragStart}
        className="w-full text-left px-3 py-3 rounded-lg border border-zinc-800 bg-zinc-900 hover:border-zinc-700 transition-colors group cursor-grab active:cursor-grabbing"
        title={description}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
          <span className="text-xs text-zinc-300 truncate">{label}</span>
          <div className="ml-auto flex items-center gap-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            {badge && (
              <span
                className="text-[9px] px-1.5 py-0.5 rounded font-mono border border-zinc-800"
                style={{ backgroundColor: `${color}10`, color }}
              >
                {badge}
              </span>
            )}
            <Plus size={11} className="text-zinc-500" />
          </div>
        </div>
        <p className="text-[11px] text-zinc-600 leading-snug mt-1.5 ml-[18px]">
          {domain ? <span className="text-zinc-500 font-mono">{domain} · </span> : null}
          {description}
        </p>
      </button>
      {onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="absolute right-2 top-3 opacity-0 group-hover/row:opacity-100 text-[10px] w-6 h-6 flex items-center justify-center rounded-lg bg-red-500/10 text-zinc-500 hover:text-red-400 border border-transparent hover:border-red-500/20 transition-all"
          title="Remove from palette"
        >
          <Trash size={12} weight="bold" />
        </button>
      )}
    </div>
  );
}
