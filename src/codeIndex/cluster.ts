import type { CodeEntity, FeatureCluster } from '../types';
import { chatComplete, loadLLMSettings, parseJsonSafe } from '../lib/openrouter';
import { newNodeId, hashContent } from '../lib/ids';

interface Bucket {
  name: string;
  blurb: string;
  /** lowercase substrings matched against path + symbol + summary */
  keys: string[];
}

/**
 * A feature is an abstract capability of the app ("prompt compilation",
 * "version history") — never a folder or a single file. These buckets
 * approximate that offline by matching what modules are about, not where
 * they live. Root-level loose files score into buckets the same way.
 */
const BUCKETS: Bucket[] = [
  {
    name: 'Prompt compilation',
    blurb: 'Turns the node graph into a final prompt: ordering, safety, tone, scoring.',
    keys: ['compil', 'advisor', 'audit', 'validat', 'tone', 'safety', 'refiner', 'specificity', 'envelope'],
  },
  {
    name: 'Graph editor',
    blurb: 'The visual canvas: nodes, edges, palette, toolbar, drag and drop.',
    keys: ['canvas', 'flowcanvas', 'promptnode', 'toolbar', 'sidebar', 'palette', 'paletteitem', 'toolbarbutton', 'nodeform', 'color', 'badge', 'cotoggle', 'rolepresets', 'handle', 'minimap', 'controls'],
  },
  {
    name: 'State & history',
    blurb: 'Canvas state, copy/paste, snapshots and version history.',
    keys: ['store', 'version', 'histor', 'snapshot', 'clipboard', 'paste', 'duplicat'],
  },
  {
    name: 'LLM testing',
    blurb: 'Trying prompts against a model: test panel, chat, provider settings.',
    keys: ['testpanel', 'chatbubble', 'ap settings', 'apisettings', 'openrouter', 'chat/completions', 'messages'],
  },
  {
    name: 'Codebase graph',
    blurb: 'Indexing a repo into folders, files and functions and exploring them.',
    keys: ['codeindex', 'ingest', 'parse', 'cluster', 'summar', 'propos', 'codegraph', 'filetree', 'explore', 'diff'],
  },
  {
    name: 'Templates & presets',
    blurb: 'Starter templates, role presets and node packs.',
    keys: ['template', 'preset', 'starter', 'nodepack', 'node-pack'],
  },
  {
    name: 'Export & sharing',
    blurb: 'Getting work out: builder/checker prompts, formats, share links.',
    keys: ['export', 'share', 'convert', 'toon', 'formatselector', 'format', 'hash'],
  },
  {
    name: 'App shell',
    blurb: 'App bootstrap, layout, styling, notifications and entry files.',
    keys: ['applayout', 'main.tsx', 'index.css', 'app.css', 'index.html', 'toast', 'button', 'layout', 'favicon'],
  },
  {
    name: 'Docs & config',
    blurb: 'Documentation, specs and project configuration.',
    keys: ['readme', 'product.md', 'design.md', 'gemini.md', 'docs/', '.specify', 'changelog', 'tsconfig', 'eslint', 'vite.config', 'package.json', '.md'],
  },
];

function textOf(e: CodeEntity): string {
  return `${e.path} ${e.symbol ?? ''} ${e.summary ?? ''}`.toLowerCase();
}

function expandToFuncs(entities: CodeEntity[], fileIds: string[]): string[] {
  const byId = new Map(entities.map((e) => [e.id, e]));
  const out = new Set(fileIds);
  for (const e of entities) {
    if (e.kind === 'FUNC' && fileIds.some((m) => byId.get(m)?.path === e.path)) out.add(e.id);
  }
  return [...out];
}

/** Semantic offline grouping: assign each FILE to the best-matching capability bucket. */
export function heuristicClusters(entities: CodeEntity[]): FeatureCluster[] {
  const files = entities.filter((e) => e.kind === 'FILE');
  if (files.length === 0) return [];
  const scored = new Map<string, { bucket: number; score: number }>();
  files.forEach((f) => {
    const text = textOf(f);
    let best = -1;
    let bestScore = 0;
    BUCKETS.forEach((b, i) => {
      let s = 0;
      for (const k of b.keys) if (text.includes(k)) s += k.length > 5 ? 2 : 1;
      if (s > bestScore) { bestScore = s; best = i; }
    });
    if (best >= 0 && bestScore > 0) scored.set(f.id, { bucket: best, score: bestScore });
  });

  const byBucket = new Map<number, string[]>();
  for (const [id, { bucket }] of scored) {
    if (!byBucket.has(bucket)) byBucket.set(bucket, []);
    byBucket.get(bucket)!.push(id);
  }

  // Buckets with a single file aren't features — collect leftovers honestly.
  const leftovers: string[] = [];
  for (const [b, ids] of byBucket) {
    if (ids.length < 2) {
      leftovers.push(...ids);
      byBucket.delete(b);
    }
  }
  const unscored = files.filter((f) => !scored.has(f.id)).map((f) => f.id);
  const rest = [...leftovers, ...unscored];
  void rest; // leftovers stay unassigned rather than faking a feature

  return [...byBucket.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([b, ids]) => ({
      id: newNodeId('code'),
      name: BUCKETS[b].name,
      description: BUCKETS[b].blurb,
      members: expandToFuncs(entities, ids.slice(0, 60)).slice(0, 80),
      confidence: 0.55,
      auto: true,
    }));
}

interface LLMCluster { name: string; description: string; paths: string[]; }

/** LLM feature clustering over file paths + summaries. Falls back to heuristic. */
export async function clusterFeatures(entities: CodeEntity[]): Promise<FeatureCluster[]> {
  const files = entities.filter((e) => e.kind === 'FILE');
  if (files.length === 0) return [];
  const settings = loadLLMSettings();
  if (!settings.apiKey) return heuristicClusters(entities);

  const listing = files.slice(0, 120).map((f) => `- ${f.path}${f.summary ? ` :: ${f.summary}` : ''}`).join('\n');
  try {
    const raw = await chatComplete(
      settings,
      `You are analyzing a codebase to find its product features. A feature is an abstract capability the app provides (e.g. "prompt compilation", "version history", "codebase indexing") — NEVER a folder name, a single file, or config/docs.\n\nRules:\n- 3 to 8 features, each covering AT LEAST 3 files that work together to deliver one capability.\n- Ignore docs (*.md), configs (tsconfig, eslint, vite.config, package.json), entry HTML and specs — do not make features out of them.\n- Name each feature for what the app DOES, with a one-line description of that capability.\n\nReturn JSON only: {"features":[{"name":"...","description":"...","paths":["exact/path/1","exact/path/2",...]}]}. Only include listed paths.\n\n${listing}`,
      { json: true, maxTokens: 2500 },
    );
    const parsed = parseJsonSafe<{ features: LLMCluster[] }>(raw);
    const pathToId = new Map(files.map((f) => [f.path, f.id]));
    const out: FeatureCluster[] = [];
    for (const f of parsed.features?.slice(0, 8) ?? []) {
      if (!f.name) continue;
      const memberIds = (f.paths ?? [])
        .map((p) => pathToId.get(p))
        .filter((id): id is string => !!id);
      if (memberIds.length < 2) continue; // single-file "features" are folders in disguise
      out.push({
        id: newNodeId('code'),
        name: f.name.slice(0, 60),
        description: (f.description || '').slice(0, 200),
        members: expandToFuncs(entities, memberIds).slice(0, 80),
        confidence: 0.85,
        auto: true,
      });
    }
    if (out.length > 0) return out;
  } catch { /* fall through */ }
  return heuristicClusters(entities);
}

export function clusterHash(clusters: FeatureCluster[]): string {
  return hashContent(JSON.stringify(clusters.map((c) => [c.name, c.members])));
}
