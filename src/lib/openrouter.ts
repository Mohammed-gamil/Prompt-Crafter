import { validateBaseUrl } from '../validation';

export interface OpenRouterSettings {
  apiKey: string;
  baseUrl: string;
  model: string;
}

const SETTINGS_KEY = 'prompt-crafter:api-settings';
export const OPENROUTER_DEFAULT_BASE = 'https://openrouter.ai/api/v1';
export const OPENROUTER_DEFAULT_MODEL = 'openai/gpt-4o-mini';

/** Reuse the same settings shape as TestPanel so users configure once. */
export function loadLLMSettings(): OpenRouterSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<OpenRouterSettings>;
      return {
        apiKey: p.apiKey ?? '',
        baseUrl: p.baseUrl ?? OPENROUTER_DEFAULT_BASE,
        model: p.model ?? OPENROUTER_DEFAULT_MODEL,
      };
    }
  } catch { /* ignore */ }
  return { apiKey: '', baseUrl: OPENROUTER_DEFAULT_BASE, model: OPENROUTER_DEFAULT_MODEL };
}

export function isOpenRouter(settings: OpenRouterSettings): boolean {
  return /openrouter\.ai/i.test(settings.baseUrl);
}

interface ChatOpts {
  system?: string;
  json?: boolean;
  maxTokens?: number;
  temperature?: number;
}

/** POST chat completion; returns raw assistant text. Throws with short message on failure. */
export async function chatComplete(settings: OpenRouterSettings, user: string, opts: ChatOpts = {}): Promise<string> {
  if (!settings.apiKey) throw new Error('Add an API key in Settings (gear icon, top right) first.');
  const endpoint = `${validateBaseUrl(settings.baseUrl)}/chat/completions`;
  const body: Record<string, unknown> = {
    model: settings.model,
    messages: [
      ...(opts.system ? [{ role: 'system', content: opts.system }] : []),
      { role: 'user', content: user },
    ],
    temperature: opts.temperature ?? 0.2,
  };
  if (opts.maxTokens) body.max_tokens = opts.maxTokens;
  if (opts.json) {
    body.response_format = { type: 'json_object' };
    // OpenAI-compatible providers need the word "json" in the prompt for json mode
    (body.messages as { role: string; content: string }[]).unshift({ role: 'system', content: 'Return valid JSON only.' });
  }
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${settings.apiKey}`,
  };
  if (isOpenRouter(settings)) {
    headers['HTTP-Referer'] = window.location.origin;
    headers['X-Title'] = 'Prompt-Crafter Code Graph';
  }
  const res = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) {
    const raw = await res.text().catch(() => res.statusText);
    throw new Error(`LLM error ${res.status}: ${raw.slice(0, 200)}`);
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content ?? '';
  if (!text) throw new Error('LLM returned an empty response.');
  return text;
}

export function parseJsonSafe<T>(text: string): T {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  return JSON.parse(cleaned) as T;
}
