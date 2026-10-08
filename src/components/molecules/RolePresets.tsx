import { ROLE_PRESETS } from '../../presets';

interface RolePresetsProps {
  onSelect: (content: string) => void;
}

export default function RolePresets({ onSelect }: RolePresetsProps) {
  return (
    <div className="mt-2 space-y-1.5">
      {Array.from(new Set(ROLE_PRESETS.map((p) => p.category))).map((cat) => (
        <div key={cat}>
          <p className="text-[10px] text-zinc-600 mb-1">{cat}</p>
          <div className="flex flex-wrap gap-1">
            {ROLE_PRESETS.filter((p) => p.category === cat).map((p) => (
              <button
                key={p.id}
                onClick={() => onSelect(p.content)}
                className="text-[10px] px-2 py-0.5 rounded border border-zinc-700 text-zinc-500 hover:text-white hover:border-zinc-500 transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
