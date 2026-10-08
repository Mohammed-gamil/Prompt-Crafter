import type { CodeEntity, FeatureCluster } from '../types';
import { chatComplete, loadLLMSettings, parseJsonSafe } from '../lib/openrouter';
import { newNodeId, hashContent } from '../lib/ids';

/** Fallback: group by top-level folder — always works offline. */
export function heuristicClusters(entities: CodeEntity[]): FeatureCluster[] {
  const groups = new Map<string, CodeEntity[]>();
  for (const e of entities) {
    if (e.kind === 'FOLDER' || e.kind.startsWith('FEATURE')) continue;
    const top = e.path.split('/')[0] || '(root)';
    if (!groups.has(top)) groups.set(top, []);
    groups.get(top)!.push(e);
  }
  return [...groups.entries()].slice(0, 12).map(([top, members]) => ({
    id: newNodeId('code'),
    name: top,
    description: `Modules under ${top}/`,
    members: members.slice(0, 60).map((m) => m.id),
    confidence: 0.4,
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
      `Group these repo files into 3-8 product features (not folders). Return JSON: {"features":[{"name":"...","description":"one line","paths":["a.ts","b.ts"]}]}. Only include listed paths.\n\n${listing}`,
      { json: true, maxTokens: 2000 },
    );
    const parsed = parseJsonSafe<{ features: LLMCluster[] }>(raw);
    const pathToId = new Map(files.map((f) => [f.path, f.id]));
    const byId = new Map(entities.map((e) => [e.id, e]));
    const out: FeatureCluster[] = [];
    for (const f of parsed.features?.slice(0, 8) ?? []) {
      if (!f.name) continue;
      const memberIds = (f.paths ?? [])
        .map((p) => pathToId.get(p))
        .filter((id): id is string => !!id);
      // expand files -> their funcs
      const expanded = new Set(memberIds);
      for (const e of entities) {
        if (e.kind === 'FUNC' && memberIds.some((m) => byId.get(m)?.path === e.path)) expanded.add(e.id);
      }
      if (memberIds.length === 0) continue;
      out.push({
        id: newNodeId('code'),
        name: f.name.slice(0, 60),
        description: (f.description || '').slice(0, 200),
        members: [...expanded].slice(0, 80),
        confidence: 0.8,
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
