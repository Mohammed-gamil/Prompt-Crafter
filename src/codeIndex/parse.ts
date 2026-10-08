import type { CodeEntity, CodeLink } from '../types';
import { hashContent, newNodeId } from '../lib/ids';

export interface RawFile {
  path: string;
  content: string;
}

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '__pycache__', '.venv', 'vendor']);
const SKIP_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.map', '.lock']);
const CODE_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py', '.go', '.rs', '.java', '.json', '.css', '.html', '.md']);

export const MAX_FILES = 2000;
export const MAX_FILE_BYTES = 200 * 1024;

export function shouldIndex(path: string): boolean {
  const parts = path.split('/');
  if (parts.some((p) => SKIP_DIRS.has(p))) return false;
  const base = parts[parts.length - 1];
  if (base.startsWith('.') && !['.env.example'].includes(base)) {
    // keep configs like vite.config.ts but skip dotfiles
    if (!/\.(ts|js|json)$/.test(base)) return false;
  }
  const dot = base.lastIndexOf('.');
  const ext = dot >= 0 ? base.slice(dot).toLowerCase() : '';
  if (SKIP_EXT.has(ext)) return false;
  if (ext === '' ) return false;
  if (!CODE_EXT.has(ext)) return false;
  if (/(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml)$/.test(path)) return false;
  return true;
}

function langOf(path: string): string {
  const ext = path.slice(path.lastIndexOf('.')).toLowerCase();
  if (ext === '.py') return 'python';
  if (ext === '.tsx' || ext === '.ts') return 'typescript';
  if (ext === '.jsx' || ext === '.js' || ext === '.mjs' || ext === '.cjs') return 'javascript';
  if (ext === '.json') return 'json';
  if (ext === '.css') return 'css';
  if (ext === '.md') return 'markdown';
  return ext.slice(1);
}

/** Extract imported specifiers via regex (fast, language-agnostic enough for graph edges). */
export function parseImports(path: string, content: string): string[] {
  const out = new Set<string>();
  const patterns = [
    /(?:import|export)[^'"]*?from\s*['"]([^'"]+)['"]/g,
    /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /(?:from\s+[\w.]+\s+)?import\s+[\w., ()]+/g, // python `from x import y` handled below
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    re.lastIndex = 0;
    while ((m = re.exec(content)) !== null) {
      if (m[1]) out.add(m[1]);
    }
  }
  // python: from foo.bar import baz
  const pyFrom = /^\s*from\s+([\w.]+)\s+import\s+/gm;
  let pm: RegExpExecArray | null;
  while ((pm = pyFrom.exec(content)) !== null) out.add(pm[1]);
  const pyImp = /^\s*import\s+([\w., ]+)/gm;
  while ((pm = pyImp.exec(content)) !== null) {
    for (const part of pm[1].split(',')) {
      const name = part.trim().split(/\s+/)[0];
      if (name) out.add(name);
    }
  }
  void path;
  return [...out].slice(0, 40);
}

/** Resolve a relative import to a repo-relative path (best-effort). */
export function resolveImport(fromPath: string, spec: string, allPaths: Set<string>): string | null {
  if (!spec.startsWith('.')) return null; // bare / absolute imports: skip (external or alias)
  const dir = fromPath.split('/').slice(0, -1);
  const segs = [...dir];
  for (const part of spec.split('/')) {
    if (part === '.' || part === '') continue;
    if (part === '..') segs.pop();
    else segs.push(part);
  }
  const base = segs.join('/');
  const candidates = [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.jsx`, `${base}/index.ts`, `${base}/index.tsx`, `${base}/index.js`];
  for (const c of candidates) if (allPaths.has(c)) return c;
  // prefix match (e.g. spec without extension but file has it)
  for (const p of allPaths) if (p === base || p.startsWith(base + '.')) return p;
  return null;
}

interface SymbolHit {
  name: string;
  kind: CodeEntity['symbolKind'];
  start: number;
  end: number;
}

function parseSymbols(path: string, content: string): SymbolHit[] {
  const hits: SymbolHit[] = [];
  const lines = content.split('\n');
  const push = (name: string, kind: SymbolHit['kind'], lineIdx: number) => {
    if (!name || name.length > 80) return;
    if (/^(if|for|while|switch|return)$/.test(name)) return;
    hits.push({ name, kind, start: Math.max(0, lineIdx - 1), end: Math.min(lines.length, lineIdx + 30) });
  };
  const patterns: [RegExp, CodeEntity['symbolKind']][] = [
    [/export\s+(?:default\s+)?function\s+(\w+)/g, 'function'],
    [/export\s+(?:default\s+)?class\s+(\w+)/g, 'class'],
    [/export\s+const\s+(\w+)\s*=\s*(?:\([^)]*\)|[\w<>[\], ]*)\s*=>/g, 'function'],
    [/function\s+(\w+)\s*\(/g, 'function'],
    [/class\s+(\w+)/g, 'class'],
    [/const\s+([A-Z][\w]*)\s*=\s*(?:memo\(|forwardRef\(|function)/g, 'component'],
    [/export\s+(?:const|let|var)\s+(\w+)/g, 'other'],
    [/def\s+(\w+)\s*\(/g, 'function'],
    [/^class\s+(\w+)/gm, 'class'],
  ];
  lines.forEach((line, i) => {
    for (const [re, kind] of patterns) {
      re.lastIndex = 0;
      let m: RegExpExecArray | null;
      // run against single line to get line-accurate positions
      while ((m = re.exec(line)) !== null) {
        let k = kind;
        if (k === 'function' && /^[A-Z]/.test(m[1]) && /\.(tsx|jsx)$/.test(path)) k = 'component';
        if (hits.some((h) => h.name === m![1])) continue;
        push(m[1], k, i);
        if (hits.length > 60) return;
      }
    }
  });
  return hits.slice(0, 60);
}

/** Build folder + file + func entities and contains/imports links. Synchronous; run in worker/chunks. */
export function indexFiles(raw: RawFile[]): { entities: CodeEntity[]; links: CodeLink[] } {
  const files = raw.filter((f) => shouldIndex(f.path)).slice(0, MAX_FILES);
  const entities: CodeEntity[] = [];
  const links: CodeLink[] = [];
  const pathToId = new Map<string, string>();
  const allPaths = new Set(files.map((f) => f.path));

  const folders = new Set<string>();
  for (const f of files) {
    const parts = f.path.split('/').slice(0, -1);
    let acc = '';
    for (const p of parts) {
      acc = acc ? `${acc}/${p}` : p;
      folders.add(acc);
    }
  }
  for (const folder of folders) {
    const id = newNodeId('code');
    pathToId.set(`dir:${folder}`, id);
    entities.push({ id, kind: 'FOLDER', path: folder, hash: hashContent(folder), language: 'dir' });
  }

  const importSpecs = new Map<string, string[]>();
  for (const f of files) {
    const id = newNodeId('code');
    pathToId.set(f.path, id);
    const hash = hashContent(f.content);
    entities.push({
      id, kind: 'FILE', path: f.path, hash,
      language: langOf(f.path), size: f.content.length,
    });
    importSpecs.set(f.path, parseImports(f.path, f.content));
    // contains: folder -> file
    const parts = f.path.split('/').slice(0, -1);
    if (parts.length > 0) {
      let acc = '';
      for (const p of parts) acc = acc ? `${acc}/${p}` : p;
      const folderId = pathToId.get(`dir:${acc}`);
      if (folderId) links.push({ id: newNodeId('link'), source: folderId, target: id, kind: 'contains' });
    }
    // symbols
    for (const s of parseSymbols(f.path, f.content)) {
      const sid = newNodeId('code');
      entities.push({
        id: sid, kind: 'FUNC', path: f.path, symbol: s.name,
        symbolKind: s.kind, range: { start: s.start, end: s.end },
        hash: hashContent(`${f.path}:${s.name}:${f.content.slice(0, 500)}`),
        language: langOf(f.path),
      });
      links.push({ id: newNodeId('link'), source: id, target: sid, kind: 'contains' });
    }
  }

  // imports: file -> file
  for (const [from, specs] of importSpecs) {
    const fromId = pathToId.get(from);
    if (!fromId) continue;
    for (const spec of specs) {
      const target = resolveImport(from, spec, allPaths);
      if (!target) continue;
      const targetId = pathToId.get(target);
      if (targetId && targetId !== fromId) {
        links.push({ id: newNodeId('link'), source: fromId, target: targetId, kind: 'imports' });
      }
    }
  }

  return { entities, links };
}

/** Aggregate file-level edges up to folder level for the zoomed-out view. */
export function aggregateFolderLinks(entities: CodeEntity[], links: CodeLink[]): CodeLink[] {
  const fileToFolder = new Map<string, string>();
  const idToEntity = new Map(entities.map((e) => [e.id, e]));
  for (const e of entities) {
    if (e.kind === 'FILE') {
      const parts = e.path.split('/').slice(0, -1).join('/');
      const folder = entities.find((f) => f.kind === 'FOLDER' && f.path === parts);
      if (folder) fileToFolder.set(e.id, folder.id);
    }
  }
  const seen = new Set<string>();
  const out: CodeLink[] = [];
  for (const l of links) {
    if (l.kind !== 'imports') continue;
    const sf = fileToFolder.get(l.source);
    const tf = fileToFolder.get(l.target);
    if (!sf || !tf || sf === tf) continue;
    const key = `${sf}->${tf}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ id: newNodeId('link'), source: sf, target: tf, kind: 'imports' });
  }
  void idToEntity;
  return out;
}
