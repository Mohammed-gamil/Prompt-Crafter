import { useMemo } from 'react';
import { Folder, FileCode, Function, Sparkle } from '@phosphor-icons/react';
import { useCodeStore } from '../../codeIndex/store';

export default function FileTree() {
  const entities = useCodeStore((s) => s.entities);
  const links = useCodeStore((s) => s.links);
  const selectedId = useCodeStore((s) => s.selectedId);
  const select = useCodeStore((s) => s.select);
  const focusFolder = useCodeStore((s) => s.focusFolder);
  const level = useCodeStore((s) => s.level);
  const setLevel = useCodeStore((s) => s.setLevel);
  const view = useCodeStore((s) => s.view);

  const tree = useMemo(() => {
    const folders = entities.filter((e) => e.kind === 'FOLDER').sort((a, b) => a.path.localeCompare(b.path));
    const byFolder = new Map<string, typeof entities>();
    for (const e of entities) {
      if (e.kind !== 'FILE') continue;
      const dir = e.path.split('/').slice(0, -1).join('/') || '(root)';
      if (!byFolder.has(dir)) byFolder.set(dir, []);
      byFolder.get(dir)!.push(e);
    }
    return { folders, byFolder };
  }, [entities]);

  if (view === 'feature') {
    const feats = entities.filter((e) => e.kind === 'FEATURE' || e.kind === 'FEATURE_PROPOSED');
    const memberCount = new Map<string, number>();
    for (const l of links) {
      if (l.kind === 'belongs-to' || l.kind === 'proposed-touches') {
        memberCount.set(l.source, (memberCount.get(l.source) ?? 0) + 1);
      }
    }
    return (
      <div className="w-64 shrink-0 h-full overflow-auto bg-zinc-950 border-r border-zinc-800 p-4">
        <p className="text-[11px] text-zinc-600 mb-3">Features</p>
        {feats.length === 0 && <p className="text-[11px] text-zinc-600">No features yet — detect them or add one.</p>}
        {feats.map((f) => (
          <button key={f.id} onClick={() => select(f.id)}
            className={`w-full text-left p-3 mb-2 rounded-lg border transition-colors ${selectedId === f.id ? 'border-zinc-500 bg-zinc-900' : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-600'}`}>
            <div className="flex items-center gap-2 mb-1">
              <Sparkle size={12} className="text-zinc-500 shrink-0" />
              <span className="text-xs text-white truncate">{f.symbol || f.path}</span>
              {f.proposed && <span className="ml-auto text-[9px] text-zinc-500 font-mono">new</span>}
            </div>
            <p className="text-[10px] text-zinc-600">{memberCount.get(f.id) ?? 0} items</p>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="w-64 shrink-0 h-full overflow-auto bg-zinc-950 border-r border-zinc-800 p-4">
      <div className="flex items-center gap-0.5 mb-3 p-0.5 rounded-md bg-zinc-900 border border-zinc-800 w-fit">
        {(['folder', 'file', 'func'] as const).map((l) => (
          <button key={l} onClick={() => setLevel(l)}
            className={`px-2 py-1 rounded text-[11px] capitalize ${level === l ? 'bg-zinc-800 text-white' : 'text-zinc-600 hover:text-zinc-300'}`}>
            {l === 'func' ? 'functions' : `${l}s`}
          </button>
        ))}
      </div>
      {tree.folders.map((f) => (
        <div key={f.id} className="mb-1">
          <button
            onClick={() => { select(f.id); focusFolder(f.path); setLevel('file'); }}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left ${selectedId === f.id ? 'bg-blue-600/10 text-blue-200' : 'text-zinc-300 hover:bg-zinc-900'}`}
          >
            <Folder size={13} className="text-amber-500/80 shrink-0" />
            <span className="text-[11px] font-mono truncate">{f.path}</span>
          </button>
          {(level !== 'folder') && tree.byFolder.get(f.path)?.map((file) => (
            <div key={file.id} className="ml-4">
              <button onClick={() => select(file.id)}
                className={`w-full flex items-center gap-2 px-2 py-1 rounded-lg text-left ${selectedId === file.id ? 'bg-blue-600/10 text-blue-200' : 'text-zinc-400 hover:bg-zinc-900'}`}>
                <FileCode size={12} className="shrink-0 text-zinc-500" />
                <span className="text-[10px] font-mono truncate">{file.path.split('/').pop()}</span>
                {file.proposed && <span className="text-[8px] text-purple-300 font-bold">NEW</span>}
              </button>
              {level === 'func' && entities.filter((e) => e.kind === 'FUNC' && e.path === file.path).map((fn) => (
                <button key={fn.id} onClick={() => select(fn.id)}
                  className={`ml-4 w-[calc(100%-1rem)] flex items-center gap-2 px-2 py-0.5 rounded text-left ${selectedId === fn.id ? 'bg-blue-600/10 text-blue-200' : 'text-zinc-500 hover:bg-zinc-900'}`}>
                  <Function size={11} className="shrink-0" />
                  <span className="text-[10px] font-mono truncate">{fn.symbol}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      ))}
      {/* root-level files */}
      {(tree.byFolder.get('(root)') ?? []).map((file) => (
        <button key={file.id} onClick={() => select(file.id)}
          className="w-full flex items-center gap-2 px-2 py-1 rounded-lg text-left text-zinc-400 hover:bg-zinc-900">
          <FileCode size={12} className="shrink-0 text-zinc-500" />
          <span className="text-[10px] font-mono truncate">{file.path}</span>
        </button>
      ))}
    </div>
  );
}
