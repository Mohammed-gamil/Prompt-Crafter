import type { OutputFormat } from '../../types';
import { FORMAT_LABELS } from '../../formatConverter';

const FORMATS: OutputFormat[] = ['xml', 'markdown', 'json', 'text', 'toon'];

interface FormatSelectorProps {
  value: OutputFormat;
  onChange: (f: OutputFormat) => void;
}

export default function FormatSelector({ value, onChange }: FormatSelectorProps) {
  return (
    <div className="flex gap-1 px-4 py-2 border-b border-gray-800 bg-[#0d0d15]">
      {FORMATS.map((f) => (
        <button
          key={f}
          onClick={() => onChange(f)}
          className={`text-[11px] px-2.5 py-1 rounded font-medium transition-colors ${
            value === f
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
          }`}
        >
          {FORMAT_LABELS[f]}
        </button>
      ))}
    </div>
  );
}
