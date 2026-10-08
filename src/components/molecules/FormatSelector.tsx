import type { OutputFormat } from '../../types';
import { FORMAT_LABELS } from '../../formatConverter';

const FORMATS: OutputFormat[] = ['xml', 'markdown', 'json', 'text', 'toon'];

interface FormatSelectorProps {
  value: OutputFormat;
  onChange: (f: OutputFormat) => void;
}

export default function FormatSelector({ value, onChange }: FormatSelectorProps) {
  return (
    <div className="flex gap-1 px-4 py-2 border-b border-zinc-800">
      {FORMATS.map((f) => (
        <button
          key={f}
          onClick={() => onChange(f)}
          className={`text-[11px] px-2.5 py-1 rounded-md font-medium transition-colors ${
            value === f
              ? 'bg-blue-600 text-white'
              : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900'
          }`}
        >
          {FORMAT_LABELS[f]}
        </button>
      ))}
    </div>
  );
}
