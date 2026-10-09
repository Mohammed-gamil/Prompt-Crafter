import { useEffect, useState } from 'react';
import { X } from '@phosphor-icons/react';
import ApiSettingsForm, { type ApiSettings } from '../molecules/ApiSettingsForm';

const SETTINGS_KEY = 'prompt-crafter:api-settings';

function loadSettings(): ApiSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw) as ApiSettings;
  } catch { /* ignore */ }
  return { apiKey: '', baseUrl: 'https://openrouter.ai/api/v1', model: 'openai/gpt-4o-mini' };
}

export default function SettingsModal({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = useState<ApiSettings>(loadSettings);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const save = (s: ApiSettings) => {
    setSettings(s);
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* ignore */ }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70" />
      <div className="relative w-full max-w-md rounded-lg bg-zinc-950 border border-zinc-800 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800">
          <h2 className="text-sm font-semibold text-white">Settings</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-zinc-900 text-zinc-500 transition-colors">
            <X size={15} weight="bold" />
          </button>
        </div>
        <div className="p-1">
          <ApiSettingsForm
            settings={settings}
            onChange={save}
            onDone={onClose}
          />
        </div>
        <p className="px-5 pb-4 text-[11px] text-zinc-600 leading-relaxed">
          Used for summaries, feature detection and new-feature proposals. Any OpenAI-compatible endpoint works; OpenRouter is the default.
        </p>
      </div>
    </div>
  );
}
