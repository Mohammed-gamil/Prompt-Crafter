import type { CodeEntity, CodeLink } from '../types';
import { chatComplete, loadLLMSettings, parseJsonSafe } from '../lib/openrouter';
import { hashContent, newNodeId } from '../lib/ids';

export const CONTEXT_CHAR_CAP = 12000;
export const MAX_NEW_ITEMS = 12;

interface ProposalNew { kind: 'folder' | 'file' | 'func'; path: string; symbol?: string; description: string; }
interface ProposalJson {
  reuse: string[];
  new: ProposalNew[];
  edges: { from: string; to: string }[];
  risks?: string[];
}

function scorePath(p: string, tokens: string[]): number {
  const low = p.toLowerCase();
  let s = 0;
  for (const t of tokens) if (t.length > 2 && low.includes(t)) s += 2;
  if (/index|app|main|store|api|lib|util|component|service|feature/.test(low)) s += 1;
  return s;
}

/** Compact context pack: ranked file list + summaries, capped for token budget. */
export function buildContextPack(
  entities: CodeEntity[],
  links: CodeLink[],
  featureName: string,
  featureDesc: string,
  snippets: Record<string, string>,
): { text: string; candidates: CodeEntity[] } {
  const tokens = `${featureName} ${featureDesc}`.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const files = entities.filter((e) => e.kind === 'FILE');
  const ranked = [...files].sort((a, b) => scorePath(b.path, tokens) - scorePath(a.path, tokens));
  const top = ranked.slice(0, 60);
  const lines: string[] = [];
  let chars = 0;
  for (const f of top) {
    const funcs = entities.filter((e) => e.kind === 'FUNC' && e.path === f.path).map((e) => e.symbol).filter(Boolean).slice(0, 8);
    const line = `- ${f.path}${f.summary ? ` :: ${f.summary}` : ''}${funcs.length ? ` [${funcs.join(', ')}]` : ''}`;
    if (chars + line.length > CONTEXT_CHAR_CAP) break;
    lines.push(line);
    chars += line.length + 1;
  }
  const edgeCount = links.length;
  const head =
    `Repo files (${files.length} total, top ${lines.length} shown, ${edgeCount} links).\n` +
    `Propose reuse (EXISTING paths only) + new folders/files/functions for: "${featureName}" — ${featureDesc}\n`;
  void snippets;
  return { text: `${head}\n${lines.join('\n')}`, candidates: top };
}

function validNewPath(p: string): boolean {
  if (!p || p.length > 200) return false;
  if (p.includes('..') || p.startsWith('/') || p.startsWith('~')) return false;
  if (!/^[A-Za-z0-9_@./-]+$/.test(p)) return false;
  return true;
}

/** LLM auto-map: returns materialized proposed entities + links. Throws if no API key. */
export async function proposeFeature(
  name: string,
  desc: string,
  entities: CodeEntity[],
  links: CodeLink[],
  snippets: Record<string, string>,
): Promise<{ entities: CodeEntity[]; links: CodeLink[]; risks: string[] }> {
  const settings = loadLLMSettings();
  if (!settings.apiKey) throw new Error('Add an API key first (canvas → Test → gear icon).');
  const { text } = buildContextPack(entities, links, name, desc, snippets);

  const raw = await chatComplete(
    settings,
    `${text}\n\nReturn JSON only: {"reuse":["<exact existing path>",...],"new":[{"kind":"file"|"func"|"folder","path":"repo/relative/path","symbol":"FuncName if func","description":"one line"}],"edges":[{"from":"<path or new path>","to":"<path>"}],"risks":["..."]}\nRules: reuse paths must be copied EXACTLY from the list; max ${MAX_NEW_ITEMS} new items; new funcs need symbol + parent file path; keep paths repo-relative.`,
    { json: true, maxTokens: 2500 },
  );
  const parsed = parseJsonSafe<ProposalJson>(raw);

  const byPath = new Map(entities.filter((e) => e.kind === 'FILE' || e.kind === 'FUNC').map((e) => [e.kind === 'FUNC' ? `${e.path}#${e.symbol}` : e.path, e]));
  const fileByPath = new Map(entities.filter((e) => e.kind === 'FILE').map((e) => [e.path, e]));

  const featureId = newNodeId('code');
  const outEntities: CodeEntity[] = [{
    id: featureId, kind: 'FEATURE_PROPOSED', path: `features/${name.trim().toLowerCase().replace(/\s+/g, '-').slice(0, 60)}`,
    symbol: name.trim().slice(0, 80), description: desc.trim().slice(0, 300),
    hash: hashContent(name + desc + Date.now()), summary: desc.trim(), proposed: true, confidence: 0.85,
  }];
  const outLinks: CodeLink[] = [];
  const pathToNewId = new Map<string, string>();

  for (const p of (parsed.new ?? []).slice(0, MAX_NEW_ITEMS)) {
    if (!p.path || !validNewPath(p.path)) continue;
    const nid = newNodeId('code');
    pathToNewId.set(p.path, nid);
    if (p.kind === 'folder') {
      outEntities.push({ id: nid, kind: 'FOLDER', path: p.path, hash: hashContent(p.path + Date.now()), summary: p.description?.slice(0, 200), proposed: true, confidence: 0.75 });
    } else if (p.kind === 'func') {
      outEntities.push({
        id: nid, kind: 'FUNC_PROPOSED', path: p.path, symbol: (p.symbol || 'NewFunction').slice(0, 80),
        symbolKind: /^[A-Z]/.test(p.symbol || '') ? 'component' : 'function',
        hash: hashContent(p.path + (p.symbol || '') + Date.now()),
        summary: p.description?.slice(0, 200), description: p.description?.slice(0, 300), proposed: true, confidence: 0.75,
      });
    } else {
      outEntities.push({ id: nid, kind: 'FILE_PROPOSED', path: p.path, hash: hashContent(p.path + Date.now()), language: 'typescript', summary: p.description?.slice(0, 200), description: p.description?.slice(0, 300), proposed: true, confidence: 0.75 });
    }
  }

  const resolveRef = (ref: string): string | null => {
    if (pathToNewId.has(ref)) return pathToNewId.get(ref)!;
    if (byPath.has(ref)) return byPath.get(ref)!.id;
    if (fileByPath.has(ref)) return fileByPath.get(ref)!.id;
    // func shorthand: match symbol
    const f = entities.find((e) => e.kind === 'FUNC' && e.symbol === ref);
    return f?.id ?? null;
  };

  // reuse -> feature edges
  for (const r of parsed.reuse ?? []) {
    const target = resolveRef(r);
    if (target) outLinks.push({ id: newNodeId('link'), source: featureId, target, kind: 'proposed-touches', proposed: true });
  }
  // explicit edges
  for (const e of parsed.edges ?? []) {
    const a = resolveRef(e.from);
    const b = resolveRef(e.to);
    if (a && b && a !== b) outLinks.push({ id: newNodeId('link'), source: a, target: b, kind: 'proposed-touches', proposed: true });
  }
  // new items without edges: attach to feature
  for (const [, nid] of pathToNewId) {
    if (!outLinks.some((l) => l.source === nid || l.target === nid)) {
      outLinks.push({ id: newNodeId('link'), source: featureId, target: nid, kind: 'proposed-touches', proposed: true });
    }
  }

  return { entities: outEntities, links: outLinks, risks: (parsed.risks ?? []).slice(0, 5) };
}
