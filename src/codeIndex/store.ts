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
  features: FeatureCluster[];
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
  setFeatures: (f: FeatureCluster[]) => void;
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
  screen: 'prompt',
  repo: null,
  entities: [],
  links: [],
  features: [],
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
      entities, links, features: [],
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

  setFeatures: (features) => set({ features }),

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
    const alive = new Set(entities.map((e) => e.id));
    const features = s.features
      .map((f) => ({ ...f, members: f.members.filter((m) => alive.has(m)) }))
      .filter((f) => f.members.length > 0);
    set({
      entities, links, snippets, features,
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
    set({ repo: null, entities: [], links: [], features: [], snippets: {}, selectedId: null, focusedFolder: null, screen: 'ingest', error: null }),
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
