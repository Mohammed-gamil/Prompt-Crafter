import type { RawFile } from './parse';
import { indexFiles } from './parse';
import type { CodeEntity, CodeLink } from '../types';
import { hashContent, newNodeId } from '../lib/ids';

export interface DiffSummary {
  added: string[];
  changed: string[];
  removed: string[];
  unchanged: number;
}

/** Compare new raw files against stored snippets (path -> head excerpt) by content hash. */
export function diffRaw(prevSnippets: Record<string, string>, next: RawFile[]): DiffSummary {
  const nextMap = new Map(next.map((f) => [f.path, f.content]));
  const added: string[] = [];
  const changed: string[] = [];
  let unchanged = 0;
  for (const [path, content] of nextMap) {
    const prev = prevSnippets[path];
    if (prev === undefined) added.push(path);
    else if (hashContent(prev.slice(0, 2000)) !== hashContent(content.slice(0, 2000))) changed.push(path);
    else unchanged++;
  }
  const removed = Object.keys(prevSnippets).filter((p) => !nextMap.has(p));
  return { added, changed, removed, unchanged };
}

/**
 * Incremental merge: unchanged files keep entity IDs + summaries;
 * added/changed paths are re-indexed fresh; removed paths drop their
 * FILE/FUNC entities + dangling links. FOLDER nodes recomputed.
 * Proposed (*_PROPOSED / FEATURE) entities are always preserved.
 */
export function mergeIndexed(
  prevEntities: CodeEntity[],
  prevLinks: CodeLink[],
  prevSnippets: Record<string, string>,
  nextRaw: RawFile[],
): { entities: CodeEntity[]; links: CodeLink[]; snippets: Record<string, string>; diff: DiffSummary } {
  const diff = diffRaw(prevSnippets, nextRaw);
  const dirty = new Set([...diff.added, ...diff.changed]);
  const removed = new Set(diff.removed);

  if (dirty.size === 0 && removed.size === 0) {
    return { entities: prevEntities, links: prevLinks, snippets: prevSnippets, diff };
  }

  // Keep: proposed everything + unchanged files/funcs + folders (recomputed below)
  const keepEntities = prevEntities.filter((e) => {
    if (e.proposed || e.kind.startsWith('FEATURE')) return true;
    if (e.kind === 'FOLDER') return false; // recompute
    if (e.kind === 'FILE') return !dirty.has(e.path) && !removed.has(e.path);
    if (e.kind === 'FUNC') return !dirty.has(e.path) && !removed.has(e.path);
    return true;
  });
  const keepIds = new Set(keepEntities.map((e) => e.id));
  const keepLinks = prevLinks.filter((l) => {
    if (l.proposed) return true;
    return keepIds.has(l.source) && keepIds.has(l.target);
  });

  // Re-index only dirty files (plus nothing else — folders recomputed from this subset then merged)
  const dirtyRaw = nextRaw.filter((f) => dirty.has(f.path));
  const fresh = indexFiles(dirtyRaw);

  // Drop fresh FOLDER nodes that duplicate kept folder paths (we recompute folders globally instead)
  const freshNonFolder = fresh.entities.filter((e) => e.kind !== 'FOLDER');
  const freshLinks = fresh.links.filter((l) => {
    const ids = new Set(fresh.entities.map((e) => e.id));
    return ids.has(l.source) && ids.has(l.target) && freshNonFolder.some((e) => e.id === l.source || e.id === l.target);
  });

  // Recompute FOLDER nodes from all current files
  const allFiles = [
    ...keepEntities.filter((e) => e.kind === 'FILE').map((e) => e.path),
    ...freshNonFolder.filter((e) => e.kind === 'FILE').map((e) => e.path),
  ];
  const folders = new Set<string>();
  for (const p of allFiles) {
    const parts = p.split('/').slice(0, -1);
    let acc = '';
    for (const part of parts) {
      acc = acc ? `${acc}/${part}` : part;
      folders.add(acc);
    }
  }
  const folderEntities: CodeEntity[] = [...folders].map((path) => ({
    id: newNodeId('code'), kind: 'FOLDER' as const, path, hash: hashContent(path), language: 'dir',
  }));
  const folderByPath = new Map(folderEntities.map((f) => [f.path, f.id]));
  const containsLinks: CodeLink[] = [];
  const fileIdByPath = new Map<string, string>();
  for (const e of [...keepEntities, ...freshNonFolder]) {
    if (e.kind === 'FILE' || e.kind === 'FILE_PROPOSED') fileIdByPath.set(e.path, e.id);
  }
  for (const [path, fid] of fileIdByPath) {
    const dir = path.split('/').slice(0, -1).join('/');
    const folderId = folderByPath.get(dir);
    if (folderId) containsLinks.push({ id: newNodeId('link'), source: folderId, target: fid, kind: 'contains' });
  }

  // Cross-file import edges: recompute cheaply — keep old import edges between kept files,
  // plus fresh import edges remapped (fresh ids are self-consistent already)
  const entities = [...keepEntities.filter((e) => e.kind !== 'FOLDER'), ...freshNonFolder, ...folderEntities];
  const links = [...keepLinks, ...freshLinks, ...containsLinks];

  const snippets: Record<string, string> = { ...prevSnippets };
  for (const p of diff.removed) delete snippets[p];
  for (const f of nextRaw) {
    if (dirty.has(f.path) || !(f.path in snippets)) snippets[f.path] = f.content.slice(0, 2000);
  }

  return { entities, links, snippets, diff };
}
