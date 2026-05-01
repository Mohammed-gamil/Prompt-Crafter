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
      <div className="bg-[#13131d] border border-gray-700 rounded-xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div>
            <h2 className="text-base font-bold text-white">Starter Templates</h2>
            <p className="text-xs text-gray-500 mt-0.5">Select a template to pre-fill the canvas with a production-ready workflow</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <div className="overflow-auto p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {STARTER_TEMPLATES.map((tpl) => (
            <TemplateCard key={tpl.id} template={tpl} onUse={handleUse} />
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-800 flex items-center justify-between">
          <p className="text-[11px] text-gray-600">
            Templates replace the current canvas — export your work first if needed
          </p>
          <button
            onClick={onClose}
            className="text-xs px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
