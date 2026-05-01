import type { StarterTemplate } from '../../templates';

interface TemplateCardProps {
  template: StarterTemplate;
  onUse: (id: string) => void;
}

export default function TemplateCard({ template, onUse }: TemplateCardProps) {
  return (
    <div
      className="group bg-[#1a1a2e] border border-gray-800 rounded-lg p-4 flex flex-col gap-3 hover:border-indigo-600/60 transition-colors cursor-pointer"
      onClick={() => onUse(template.id)}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none">{template.icon}</span>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors">
            {template.name}
          </h3>
          <p className="text-[11px] text-gray-400 mt-1 leading-snug">{template.description}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-1.5 flex-wrap">
          {template.nodes.slice(0, 5).map((n, i) => (
            <span
              key={i}
              className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 font-mono"
            >
              {n.data.nodeType}
            </span>
          ))}
          {template.nodes.length > 5 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-500">
              +{template.nodes.length - 5}
            </span>
          )}
        </div>
        <span className="text-[10px] text-indigo-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2">
          Use →
        </span>
      </div>
    </div>
  );
}
