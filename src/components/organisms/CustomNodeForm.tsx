import { useState } from 'react';
import type { PaletteItem } from '../../types';
import ColorSwatch from '../atoms/ColorSwatch';

const COLOR_SWATCHES = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#ef4444', '#14b8a6', '#06b6d4', '#22c55e',
  '#a855f7', '#f43f5e', '#0ea5e9', '#f97316',
  '#eab308', '#d946ef', '#64748b', '#10b981',
];

interface Props {
  onSave: (item: PaletteItem) => void;
  onCancel: () => void;
}

export default function CustomNodeForm({ onSave, onCancel }: Props) {
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [content, setContent] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;
    onSave({
      nodeType: `CUSTOM-${Date.now()}`,
      label: label.trim(),
      category: 'custom',
      description: description.trim() || 'Custom node',
      color,
      defaultContent: content.trim(),
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-2 mx-1 rounded-lg border border-gray-700 bg-[#1a1a2e] p-3 space-y-3"
    >
      <p className="text-[11px] font-semibold text-gray-300 uppercase tracking-wider">New Custom Node</p>

      {/* Label */}
      <div>
        <label className="text-[10px] text-gray-500 mb-1 block">Label *</label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Audience Profile"
          required
          className="w-full bg-[#12121a] border border-gray-700 text-xs text-gray-200 placeholder-gray-600 rounded px-2 py-1.5 outline-none focus:border-indigo-500 transition-colors"
        />
      </div>

      {/* Description */}
      <div>
        <label className="text-[10px] text-gray-500 mb-1 block">Description</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="One-line tooltip description"
          className="w-full bg-[#12121a] border border-gray-700 text-xs text-gray-200 placeholder-gray-600 rounded px-2 py-1.5 outline-none focus:border-indigo-500 transition-colors"
        />
      </div>

      {/* Color swatches */}
      <div>
        <label className="text-[10px] text-gray-500 mb-1.5 block">Color</label>
        <div className="flex flex-wrap gap-1.5">
          {COLOR_SWATCHES.map((c) => (
            <ColorSwatch
              key={c}
              color={c}
              selected={color === c}
              onClick={() => setColor(c)}
            />
          ))}
          {/* Custom hex input */}
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-5 h-5 rounded-full cursor-pointer border-0 bg-transparent p-0"
            title="Pick custom color"
          />
        </div>
      </div>

      {/* Default content */}
      <div>
        <label className="text-[10px] text-gray-500 mb-1 block">Default Content</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          placeholder="Pre-filled content when node is added to canvas…"
          className="w-full bg-[#12121a] border border-gray-700 text-xs text-gray-200 placeholder-gray-600 rounded px-2 py-1.5 outline-none focus:border-indigo-500 transition-colors resize-y"
        />
      </div>

      {/* Buttons */}
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={!label.trim()}
          className="flex-1 py-1.5 rounded text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
        >
          Create Node
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 rounded text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
