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
        className="w-full text-left px-3 py-2.5 rounded-md border border-gray-800 bg-gray-900/50 hover:bg-gray-800 hover:border-gray-700 hover:shadow-sm transition-colors group cursor-grab active:cursor-grabbing"
        title={description}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full flex-shrink-0 transition-transform group-hover:scale-110" style={{ backgroundColor: color }} />   
          <span className="text-xs font-semibold text-gray-300 group-hover:text-white truncate transition-colors">{label}</span>
          <div className="ml-auto flex items-center gap-2 flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
            {badge && (
              <span
                className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider border border-transparent"
                style={{ backgroundColor: `${color}15`, color }}
              >
                {badge}
              </span>
            )}
            <span className="text-[9px] text-gray-500 font-mono tracking-tight">{nodeId}</span>
          </div>
        </div>
        <p className="text-[11px] text-gray-500 mt-1.5 ml-4.5 leading-snug font-medium opacity-80 group-hover:opacity-100 transition-opacity">
          {domain ? <span className="text-blue-400/80 uppercase text-[9px] font-bold tracking-wider">{domain} · </span> : null}
          {description}
        </p>
      </button>
      {onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/row:opacity-100 text-[10px] w-5 h-5 flex items-center justify-center rounded hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
          title="Remove from palette"
        >
          ✕
        </button>
      )}
    </div>
  );}
