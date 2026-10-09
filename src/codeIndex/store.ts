import { create } from 'zustand';
import type { CodeEntity, CodeLink, CodeRepoMeta, FeatureCluster } from '../types';
import { hashContent } from '../lib/ids';
import { mergeIndexed } from './diff';

export type ExploreView = 'structure' | 'feature';
export type ExploreLevel = 'folder' | 'file' | 'func';
export type Screen = 'prompt' | 'ingest' | 'building' | 'explore';

interface CodeState {
  screen: Screen;
  repo: CodeRepoMeta | null;
  entities: CodeEntity[];
  links: CodeLink[];
  view: ExploreView;
  level: ExploreLevel;
  selectedId: string | null;
  focusedFolder: string | null;
  progress: { done: number; total: number; label: string };
  error: string | null;
  /** path -> head excerpt (2k chars) for LLM context packs; not rendered. */
  snippets: Record<string, string>;

  setScreen: (s: Screen) => void;
  setProgress: (p: Partial<CodeState['progress']>) => void;
  setError: (e: string | null) => void;
  loadIndexed: (repo: Omit<CodeRepoMeta, 'graphHash'>, entities: CodeEntity[], links: CodeLink[]) => void;
  setView: (v: ExploreView) => void;
  setLevel: (l: ExploreLevel) => void;
  select: (id: string | null) => void;
  focusFolder: (path: string | null) => void;
  setSnippets: (s: Record<string, string>) => void;
  setSummaries: (map: Record<string, string>) => void;
  /** Materialize LLM clusters as FEATURE entities (replaces previous auto set). */
  replaceAutoFeatures: (clusters: FeatureCluster[]) => void;
  /** Append one manual FEATURE entity. Returns its id. */
  addManualFeature: (name: string, description: string, memberIds: string[]) => string;
  applyProposal: (entities: CodeEntity[], links: CodeLink[]) => void;
  acceptProposal: () => void;
  dismissProposed: () => void;
  mergeRaw: (raw: { path: string; content: string }[]) => { added: number; changed: number; removed: number };
  clear: () => void;
}

function graphHash(entities: CodeEntity[], links: CodeLink[]): string {
  return hashContent(JSON.stringify([entities.map((e) => [e.id, e.kind, e.path, e.symbol]), links.map((l) => [l.source, l.target, l.kind])]));
}

export const useCodeStore = create<CodeState>((set, get) => ({
  screen: 'ingest',
  repo: null,
  entities: [],
  links: [],
  view: 'structure',
  level: 'folder',
  selectedId: null,
  focusedFolder: null,
  snippets: {},
  progress: { done: 0, total: 0, label: '' },
  error: null,

  setScreen: (screen) => set({ screen }),
  setProgress: (p) => set((s) => ({ progress: { ...s.progress, ...p } })),
  setError: (error) => set({ error }),

  loadIndexed: (repo, entities, links) =>
    set({
      repo: { ...repo, graphHash: graphHash(entities, links) },
      entities, links,
      screen: 'explore', view: 'structure', level: entities.some((e) => e.kind === 'FOLDER') ? 'folder' : 'file',
      selectedId: null, focusedFolder: null, error: null,
    }),

  setView: (view) => set({ view }),
  setLevel: (level) => set({ level }),
  select: (selectedId) => set({ selectedId }),
  focusFolder: (focusedFolder) => set({ focusedFolder }),
  setSnippets: (snippets) => set({ snippets }),

  setSummaries: (map) =>
    set((s) => ({
      entities: s.entities.map((e) => (map[e.hash] ? { ...e, summary: map[e.hash] } : e)),
    })),

  replaceAutoFeatures: (clusters) =>
    set((s) => {
      const alive = s.entities.filter((e) => !(e.kind === 'FEATURE' && e.auto));
      const aliveIds = new Set(alive.map((e) => e.id));
      const byId = new Map(s.entities.map((e) => [e.id, e]));
      const featEnts: CodeEntity[] = [];
      const featLinks: CodeLink[] = [];
      for (const c of clusters) {
        const members = c.members.filter((m) => byId.has(m));
        if (members.length === 0) continue;
        featEnts.push({
          id: c.id, kind: 'FEATURE', path: `features/${c.name.toLowerCase().replace(/\s+/g, '-').slice(0, 60)}`,
          symbol: c.name.slice(0, 80), description: c.description.slice(0, 300),
          hash: c.id, summary: c.description.slice(0, 200),
          confidence: c.confidence, auto: true,
        });
        for (const m of members.slice(0, 80)) {
          featLinks.push({ id: `link_${c.id}_${m}`.slice(0, 60), source: c.id, target: m, kind: 'belongs-to' });
        }
      }
      const featIds = new Set(featEnts.map((e) => e.id));
      const links = [
        ...s.links.filter((l) => {
          // drop old auto-feature edges; keep the rest if still alive
          const autoEdge = (byId.get(l.source)?.kind === 'FEATURE' && byId.get(l.source)?.auto) ||
            (byId.get(l.target)?.kind === 'FEATURE' && byId.get(l.target)?.auto);
          if (autoEdge) return false;
          return aliveIds.has(l.source) && aliveIds.has(l.target);
        }),
        ...featLinks,
      ];
      const entities = [...alive, ...featEnts];
      void featIds;
      return {
        entities, links,
        repo: s.repo ? { ...s.repo, graphHash: graphHash(entities, links) } : s.repo,
      };
    }),

  addManualFeature: (name, description, memberIds) => {
    const id = `feat_${Date.now().toString(36)}`;
    const byId = new Set(get().entities.map((e) => e.id));
    const members = memberIds.filter((m) => byId.has(m));
    const ent: CodeEntity = {
      id, kind: 'FEATURE', path: `features/${name.trim().toLowerCase().replace(/\s+/g, '-').slice(0, 60)}`,
      symbol: name.trim().slice(0, 80), description: description.slice(0, 300),
      hash: id, summary: description.slice(0, 200), auto: false,
    };
    const newLinks: CodeLink[] = members.map((m) => ({ id: `link_${id}_${m}`.slice(0, 60), source: id, target: m, kind: 'belongs-to' }));
    set((s) => {
      const entities = [...s.entities, ent];
      const links = [...s.links, ...newLinks];
      return {
        entities, links,
        repo: s.repo ? { ...s.repo, graphHash: graphHash(entities, links) } : s.repo,
      };
    });
    return id;
  },

  applyProposal: (newEntities, newLinks) =>
    set((s) => ({
      entities: [...s.entities, ...newEntities],
      links: [...s.links, ...newLinks],
      repo: s.repo ? { ...s.repo, graphHash: graphHash([...s.entities, ...newEntities], [...s.links, ...newLinks]) } : s.repo,
    })),

  acceptProposal: () =>
    set((s) => ({
      entities: s.entities.map((e) => (e.proposed ? { ...e, proposed: false, kind: e.kind.replace('_PROPOSED', '') as CodeEntity['kind'] } : e)),
      links: s.links.map((l) => (l.proposed ? { ...l, proposed: false, kind: l.kind === 'proposed-touches' ? 'belongs-to' : l.kind } : l)),
    })),

  dismissProposed: () =>
    set((s) => {
      const keepIds = new Set(s.entities.filter((e) => !e.proposed).map((e) => e.id));
      return {
        entities: s.entities.filter((e) => !e.proposed),
        links: s.links.filter((l) => !l.proposed && keepIds.has(l.source) && keepIds.has(l.target)),
      };
    }),

  mergeRaw: (raw) => {
    const s = get();
    const { entities, links, snippets, diff } = mergeIndexed(s.entities, s.links, s.snippets, raw);
    set({
      entities, links, snippets,
      repo: s.repo ? {
        ...s.repo,
        fileCount: new Set(entities.filter((e) => e.kind === 'FILE').map((e) => e.path)).size,
        entityCount: entities.length,
        graphHash: graphHash(entities, links),
      } : s.repo,
    });
    return { added: diff.added.length, changed: diff.changed.length, removed: diff.removed.length };
  },

  clear: () =>
    set({ repo: null, entities: [], links: [], snippets: {}, selectedId: null, focusedFolder: null, screen: 'ingest', error: null }),
}));

/** BFS closure around seed entity ids (1-2 hops) — used for LLM context packs + export. */
export function closureAround(entities: CodeEntity[], links: CodeLink[], seeds: string[], depth = 2): { entities: CodeEntity[]; links: CodeLink[] } {
  const adj = new Map<string, string[]>();
  for (const l of links) {
    if (!adj.has(l.source)) adj.set(l.source, []);
    if (!adj.has(l.target)) adj.set(l.target, []);
    adj.get(l.source)!.push(l.target);
    adj.get(l.target)!.push(l.source);
  }
  const seen = new Set(seeds);
  let frontier = [...seeds];
  for (let d = 0; d < depth; d++) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const nb of adj.get(id) ?? []) {
        if (!seen.has(nb)) { seen.add(nb); next.push(nb); }
      }
    }
    frontier = next;
  }
  const byId = new Map(entities.map((e) => [e.id, e]));
  return {
    entities: [...seen].map((id) => byId.get(id)!).filter(Boolean),
    links: links.filter((l) => seen.has(l.source) && seen.has(l.target)),
  };
}
