import { useState } from 'react';
import { toast } from '../../toast';
import { validateBaseUrl } from '../../validation';

export interface ApiSettings {
  apiKey: string;
  baseUrl: string;
  model: string;
}

interface ApiSettingsFormProps {
  settings: ApiSettings;
  onChange: (s: ApiSettings) => void;
  onDone: () => void;
}

export default function ApiSettingsForm({ settings, onChange, onDone }: ApiSettingsFormProps) {
  const [draft, setDraft] = useState(settings);

  const save = () => {
    try {
      validateBaseUrl(draft.baseUrl);
    } catch (err) {
      toast((err as Error).message, 'error');
      return;
    }
    onChange(draft);
    onDone();
    toast('API settings saved', 'success');
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <h3 className="text-sm font-semibold text-white">API settings</h3>

      <label className="flex flex-col gap-1">
        <span className="text-[11px] text-zinc-500">Base URL (OpenAI-compatible)</span>
        <input
          type="text"
          value={draft.baseUrl}
          onChange={(e) => setDraft({ ...draft, baseUrl: e.target.value })}
          className="text-xs bg-zinc-900 border border-zinc-800 rounded-md px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-zinc-600"
          placeholder="https://api.openai.com/v1"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[11px] text-zinc-500">Model</span>
        <input
          type="text"
          value={draft.model}
          onChange={(e) => setDraft({ ...draft, model: e.target.value })}
          className="text-xs bg-zinc-900 border border-zinc-800 rounded-md px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-zinc-600"
          placeholder="gpt-4o"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[11px] text-zinc-500">API key</span>
        <input
          type="password"
          value={draft.apiKey}
          onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })}
          className="text-xs bg-zinc-900 border border-zinc-800 rounded-md px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-zinc-600"
          placeholder="sk-..."
        />
        <p className="text-[10px] text-zinc-600">
          Stored in browser localStorage only — never sent anywhere except the base URL above.
        </p>
      </label>

      <div className="flex gap-2">
        <button
          onClick={save}
          className="text-xs px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white transition-colors"
        >
          Save
        </button>
        <button
          onClick={onDone}
          className="text-xs px-3 py-1.5 rounded-md border border-zinc-700 text-zinc-300 hover:border-zinc-500 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
