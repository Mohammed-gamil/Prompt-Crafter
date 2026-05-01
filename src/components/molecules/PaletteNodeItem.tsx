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
        className="w-full text-left px-4 py-3 rounded-xl border border-white/[0.03] bg-white/[0.01] hover:bg-white/[0.04] hover:border-white/[0.08] hover:shadow-[0_8px_16px_-6px_rgba(0,0,0,0.5)] transition-all duration-700 ease-vanguard group cursor-grab active:cursor-grabbing active:scale-[0.98]"
        title={description}
      >
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 shadow-[0_0_8px_rgba(255,255,255,0.2)] group-hover:scale-125 transition-transform duration-700" style={{ backgroundColor: color }} />
          <span className="text-[11px] font-bold text-gray-400 group-hover:text-white truncate tracking-tight transition-colors duration-700">{label}</span>
          <div className="ml-auto flex items-center gap-2 flex-shrink-0 opacity-40 group-hover:opacity-100 transition-opacity duration-700">
            {badge && (
              <span
                className="text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-widest border border-white/10"
                style={{ backgroundColor: `${color}10`, color }}
              >
                {badge}
              </span>
            )}
            <span className="text-[8px] text-gray-600 font-mono tracking-tighter">{nodeId}</span>
          </div>
        </div>
        <p className="text-[10px] text-gray-600 mt-2 ml-4 leading-relaxed font-medium opacity-60 group-hover:opacity-100 transition-opacity duration-700">
          {domain ? <span className="text-indigo-400/60 uppercase text-[8px] font-black tracking-widest">{domain} · </span> : null}
          {description}
        </p>
      </button>
      {onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 scale-75 group-hover/row:opacity-100 group-hover/row:scale-100 text-[10px] w-6 h-6 flex items-center justify-center rounded-full bg-red-500/10 text-red-500/40 hover:text-red-400 border border-red-500/10 transition-all duration-700 ease-vanguard"
          title="Remove from palette"
        >
          ✕
        </button>
      )}
    </div>
  );
}
