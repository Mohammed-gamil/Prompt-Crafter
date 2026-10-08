import { useEffect } from 'react';
import { STARTER_TEMPLATES, instantiateTemplate } from '../../templates';
import { useAppStore } from '../../store';
import { toast } from '../../toast';
import TemplateCard from '../molecules/TemplateCard';

interface Props {
  onClose: () => void;
}

export default function TemplatesModal({ onClose }: Props) {
  const loadWorkflow = useAppStore((s) => s.loadWorkflow);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleUse = (templateId: string) => {
    const tpl = STARTER_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;
    const { nodes, edges } = instantiateTemplate(tpl);
    loadWorkflow(nodes, edges);
    toast(`Loaded "${tpl.name}"`, 'success');
    onClose();
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-zinc-950 border border-zinc-800 rounded-lg w-full max-w-2xl mx-4 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div>
            <h2 className="text-sm font-semibold text-white">Templates</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Start from a pre-built workflow</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <div className="overflow-auto p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {STARTER_TEMPLATES.map((tpl) => (
            <TemplateCard key={tpl.id} template={tpl} onUse={handleUse} />
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-800 flex items-center justify-between">
          <p className="text-[11px] text-zinc-600">
            Templates replace the current canvas
          </p>
          <button
            onClick={onClose}
            className="text-xs px-3 py-1.5 rounded-md border border-zinc-700 text-zinc-300 hover:border-zinc-500 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
