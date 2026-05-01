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
      <h3 className="text-sm font-semibold text-white">API Settings</h3>

      <label className="flex flex-col gap-1">
        <span className="text-[11px] text-gray-400">Base URL (OpenAI-compatible)</span>
        <input
          type="text"
          value={draft.baseUrl}
          onChange={(e) => setDraft({ ...draft, baseUrl: e.target.value })}
          className="text-xs bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-gray-200 focus:outline-none focus:border-indigo-500"
          placeholder="https://api.openai.com/v1"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[11px] text-gray-400">Model ID</span>
        <input
          type="text"
          value={draft.model}
          onChange={(e) => setDraft({ ...draft, model: e.target.value })}
          className="text-xs bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-gray-200 focus:outline-none focus:border-indigo-500"
          placeholder="gpt-4o"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[11px] text-gray-400">API Key</span>
        <input
          type="password"
          value={draft.apiKey}
          onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })}
          className="text-xs bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-gray-200 focus:outline-none focus:border-indigo-500"
          placeholder="sk-..."
        />
        <p className="text-[10px] text-gray-600">
          Stored in browser localStorage only — never sent anywhere except the base URL above.
        </p>
      </label>

      <div className="flex gap-2">
        <button
          onClick={save}
          className="text-xs px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
        >
          Save
        </button>
        <button
          onClick={onDone}
          className="text-xs px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
