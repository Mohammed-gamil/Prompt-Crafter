import type { CodeEntity } from '../types';
import { chatComplete, loadLLMSettings, parseJsonSafe } from '../lib/openrouter';

const CACHE_KEY = 'prompt-crafter:code-summaries:v1';

function loadCache(): Record<string, string> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch { return {}; }
}

function saveCache(map: Record<string, string>): void {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(map)); } catch { /* full */ }
}

/** Heuristic fallback when no API key / LLM fails: "X in path (N imports)". */
export function heuristicSummary(e: CodeEntity, importCount: number): string {
  if (e.kind === 'FOLDER') return `Folder ${e.path} — groups related modules.`;
  if (e.kind === 'FILE') return `${e.path} — ${e.language} module${importCount ? `, linked to ${importCount} other file(s)` : ''}.`;
  if (e.kind === 'FUNC') return `${e.symbol} (${e.symbolKind}) in ${e.path} — lines ${e.range?.start ?? '?'}–${e.range?.end ?? '?'}.`;
  return e.path;
}

interface SummaryItem { hash: string; text: string; }

/**
 * Batch-summarize entities (1 line each). Skips hashes already cached.
 * `getContent` provides a short code excerpt for FUNC/FILE nodes (caller slices).
 */
export async function summarizeEntities(
  entities: CodeEntity[],
  opts: {
    getContent?: (e: CodeEntity) => string;
    importCounts?: Map<string, number>;
    batchSize?: number;
    onProgress?: (done: number, total: number) => void;
  } = {},
): Promise<Record<string, string>> {
  const cache = loadCache();
  const missing = entities.filter((e) => !e.summary && !cache[e.hash]);
  if (missing.length === 0) return cache;

  let settings;
  try { settings = loadLLMSettings(); } catch { settings = null; }
  if (!settings?.apiKey) {
    // No key: heuristic summaries, still cached so UI is useful offline
    const out: Record<string, string> = {};
    for (const e of missing) {
      const h = heuristicSummary(e, opts.importCounts?.get(e.id) ?? 0);
      cache[e.hash] = h; out[e.hash] = h;
    }
    saveCache(cache);
    return out;
  }

  const batchSize = opts.batchSize ?? 20;
  let done = 0;
  for (let i = 0; i < missing.length; i += batchSize) {
    const batch = missing.slice(i, i + batchSize);
    const items = batch.map((e, bi) => {
      const excerpt = opts.getContent?.(e)?.slice(0, 900) ?? '';
      return `[${bi}] kind=${e.kind} path=${e.path}${e.symbol ? ` symbol=${e.symbol}(${e.symbolKind})` : ''}\n${excerpt}`;
    }).join('\n---\n');
    try {
      const raw = await chatComplete(
        settings,
        `Summarize each code item in ONE precise line (what it does, max 18 words). Return JSON: {"items":[{"i":0,"text":"..."}]}.\n\n${items}`,
        { json: true, maxTokens: 1500 },
      );
      const parsed = parseJsonSafe<{ items: SummaryItem[] & { i?: number }[] }>(raw);
      const arr = (parsed as unknown as { items: { i: number; text: string }[] }).items ?? [];
      for (const it of arr) {
        const ent = batch[it.i];
        if (ent && it.text) cache[ent.hash] = it.text.slice(0, 200);
      }
    } catch {
      for (const e of batch) {
        if (!cache[e.hash]) cache[e.hash] = heuristicSummary(e, opts.importCounts?.get(e.id) ?? 0);
      }
    }
    done += batch.length;
    opts.onProgress?.(done, missing.length);
  }
  saveCache(cache);
  return cache;
}
