import type { StarterTemplate } from '../../templates';

interface TemplateCardProps {
  template: StarterTemplate;
  onUse: (id: string) => void;
}

export default function TemplateCard({ template, onUse }: TemplateCardProps) {
  return (
    <div
      className="group bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex flex-col gap-3 hover:border-zinc-600 transition-colors cursor-pointer"
      onClick={() => onUse(template.id)}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-white">
            {template.name}
          </h3>
          <p className="text-[11px] text-zinc-500 mt-1 leading-snug">{template.description}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-1.5 flex-wrap">
          {template.nodes.slice(0, 5).map((n, i) => (
            <span
              key={i}
              className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 font-mono"
            >
              {n.data.nodeType}
            </span>
          ))}
          {template.nodes.length > 5 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-600">
              +{template.nodes.length - 5}
            </span>
          )}
        </div>
        <span className="text-[11px] text-zinc-500 group-hover:text-zinc-200 transition-colors flex-shrink-0 ml-2">
          Use →
        </span>
      </div>
    </div>
  );
}
