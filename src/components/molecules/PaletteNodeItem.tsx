import { Plus, Trash, Info } from '@phosphor-icons/react';

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
        className="w-full text-left px-3 py-3 rounded-xl border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900 hover:border-zinc-700 hover:shadow-lg transition-all duration-300 group cursor-grab active:cursor-grabbing active:scale-[0.98]"
        title={description}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
             <div className="w-2 h-2 rounded-full flex-shrink-0 transition-transform group-hover:scale-125" style={{ backgroundColor: color }} />   
             <div className="absolute inset-0 w-2 h-2 rounded-full opacity-30 blur-[2px]" style={{ backgroundColor: color }} />
          </div>
          <span className="text-[11px] font-bold text-zinc-400 group-hover:text-white truncate transition-colors duration-300">{label}</span>
          <div className="ml-auto flex items-center gap-2 flex-shrink-0 opacity-40 group-hover:opacity-100 transition-opacity">
            {badge && (
              <span
                className="text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-widest border border-zinc-800"
                style={{ backgroundColor: `${color}10`, color }}
              >
                {badge}
              </span>
            )}
            <div className="bg-zinc-800 p-1 rounded">
               <Plus size={10} className="text-zinc-500" />
            </div>
          </div>
        </div>
        <div className="flex items-start gap-2 mt-2 ml-1">
           <Info size={10} className="text-zinc-700 mt-0.5" />
           <p className="text-[10px] text-zinc-500 leading-relaxed font-medium opacity-80 group-hover:opacity-100 transition-opacity flex-1">
             {domain ? <span className="text-blue-400/80 uppercase text-[8px] font-bold tracking-widest">{domain} · </span> : null}
             {description}
           </p>
        </div>
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
