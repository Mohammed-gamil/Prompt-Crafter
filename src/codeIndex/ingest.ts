import { indexFiles, shouldIndex, MAX_FILES, MAX_FILE_BYTES, type RawFile } from './parse';

export interface IngestResult {
  entities: ReturnType<typeof indexFiles>['entities'];
  links: ReturnType<typeof indexFiles>['links'];
  fileCount: number;
}

export async function filesFromDirectoryUpload(files: FileList | File[]): Promise<RawFile[]> {
  const list = [...files] as (File & { webkitRelativePath?: string })[];
  const out: RawFile[] = [];
  for (const f of list) {
    const path = f.webkitRelativePath || f.name;
    // strip top-level folder (webkitRelativePath includes it)
    const rel = path.includes('/') ? path.split('/').slice(1).join('/') : path;
    if (!rel || !shouldIndex(rel)) continue;
    if (f.size > MAX_FILE_BYTES) continue;
    const content = await f.text();
    out.push({ path: rel, content: content.slice(0, MAX_FILE_BYTES) });
    if (out.length >= MAX_FILES) break;
  }
  return out;
}

export async function filesFromDropEntries(items: DataTransferItemList): Promise<RawFile[]> {
  // Fallback: DataTransferItem → File (webkitGetAsEntry traversal omitted for brevity; FileList path covers most browsers)
  const files: File[] = [];
  for (const item of items) {
    if (item.kind === 'file') {
      const f = item.getAsFile();
      if (f) files.push(f);
    }
  }
  return filesFromDirectoryUpload(files);
}

function parseGithubUrl(url: string): { owner: string; repo: string } | null {
  const m = url.trim().match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/|$)/);
  if (!m) return null;
  return { owner: m[1], repo: m[2] };
}

/** Fetch up to `limit` smallest code files via GitHub Trees + blob API (no tar dep, no backend). */
export async function filesFromGithub(url: string, limit = 150, onProgress?: (done: number, total: number) => void): Promise<{ raw: RawFile[]; repoName: string; branch: string }> {
  const parsed = parseGithubUrl(url);
  if (!parsed) throw new Error('Not a valid GitHub repo URL (expected github.com/owner/repo)');
  const { owner, repo } = parsed;
  const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
  if (!repoRes.ok) throw new Error(`GitHub repo lookup failed (${repoRes.status}) — check visibility / rate limit`);
  const repoJson = (await repoRes.json()) as { default_branch: string; full_name: string };
  const branch = repoJson.default_branch ?? 'main';
  const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`);
  if (!treeRes.ok) throw new Error(`GitHub tree fetch failed (${treeRes.status})`);
  const tree = (await treeRes.json()) as { tree: { path: string; type: string; size?: number }[] };
  const candidates = tree.tree
    .filter((t) => t.type === 'blob' && shouldIndex(t.path))
    .sort((a, b) => (a.size ?? 0) - (b.size ?? 0))
    .slice(0, limit);
  const raw: RawFile[] = [];
  let done = 0;
  for (const c of candidates) {
    try {
      const r = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${c.path}`);
      if (!r.ok) continue;
      const text = await r.text();
      raw.push({ path: c.path, content: text.slice(0, MAX_FILE_BYTES) });
    } catch { /* skip file */ }
    done++;
    onProgress?.(done, candidates.length);
  }
  return { raw, repoName: repoJson.full_name, branch };
}

export function buildIndex(raw: RawFile[]): IngestResult {
  const { entities, links } = indexFiles(raw);
  return { entities, links, fileCount: new Set(entities.filter((e) => e.kind === 'FILE').map((e) => e.path)).size };
}

/** Demo dataset so users can try without uploading. */
export function demoFiles(): RawFile[] {
  return [
    { path: 'src/App.tsx', content: `import Sidebar from './components/Sidebar';\nimport { compile } from './compiler';\nexport default function App(){ return null; }` },
    { path: 'src/compiler.ts', content: `export function compile(nodes: any[]){ return nodes.map(n => n.id); }\nexport function nodeToBlock(n: any){ return n.label; }` },
    { path: 'src/store.ts', content: `import { compile } from './compiler';\nexport const useAppStore = () => ({ nodes: [] });` },
    { path: 'src/components/Sidebar.tsx', content: `import { compile } from '../compiler';\nexport function Sidebar(){ return null; }\nexport function PaletteItem(){ return null; }` },
  ];
}
