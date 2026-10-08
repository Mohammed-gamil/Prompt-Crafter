import { useMemo } from 'react';
import { ReactFlow, Background, Controls, MiniMap, Handle, Position, type Node, type Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useCodeStore } from '../../codeIndex/store';
import { aggregateFolderLinks } from '../../codeIndex/parse';

const KIND_COLOR: Record<string, string> = {
  FOLDER: '#f59e0b',
  FILE: '#3b82f6',
  FUNC: '#10b981',
  FEATURE: '#8b5cf6',
  FEATURE_PROPOSED: '#8b5cf6',
  FILE_PROPOSED: '#8b5cf6',
  FUNC_PROPOSED: '#8b5cf6',
};

function layoutGrid(count: number): { x: number; y: number }[] {
  const cols = Math.max(1, Math.ceil(Math.sqrt(count)));
  return Array.from({ length: count }, (_, i) => ({
    x: (i % cols) * 300 + 40,
    y: Math.floor(i / cols) * 190 + 40,
  }));
}

function CodeNode({ data }: { data: { label: string; sub?: string; summary?: string; color: string; proposed?: boolean; kind: string } }) {
  return (
    <div
      className="rounded-lg border border-zinc-800 bg-zinc-950 overflow-hidden"
      style={{
        width: 250, opacity: data.proposed ? 0.7 : 1,
        borderColor: `${data.color}66`, borderStyle: data.proposed ? 'dashed' : 'solid',
      }}
    >
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-zinc-700 !border-zinc-950" />
      <div className="px-3 py-2 border-b border-zinc-800 flex items-center gap-2" style={{ backgroundColor: `${data.color}10` }}>
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: data.color }} />
        <span className="text-[11px] font-bold text-zinc-100 truncate">{data.label}</span>
        {data.proposed && <span className="ml-auto text-[8px] font-bold text-purple-300 uppercase">proposed</span>}
      </div>
      <div className="px-3 py-2">
        {data.sub && <p className="text-[9px] font-mono text-zinc-500 truncate mb-1">{data.sub}</p>}
        <p className="text-[10px] text-zinc-400 leading-snug">{data.summary || data.kind}</p>
      </div>
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-zinc-700 !border-zinc-950" />
    </div>
  );
}

const nodeTypes = { codeNode: CodeNode };

export default function CodeGraphCanvas() {
  const entities = useCodeStore((s) => s.entities);
  const links = useCodeStore((s) => s.links);
  const features = useCodeStore((s) => s.features);
  const view = useCodeStore((s) => s.view);
  const level = useCodeStore((s) => s.level);
  const selectedId = useCodeStore((s) => s.selectedId);
  const select = useCodeStore((s) => s.select);
  const focusedFolder = useCodeStore((s) => s.focusedFolder);

  const { nodes, edges, detail } = useMemo(() => {
    if (view === 'feature') {
      const featEnts = entities.filter((e) => e.kind === 'FEATURE' || e.kind === 'FEATURE_PROPOSED');
      const items = features.length > 0
        ? features
        : featEnts.map((e) => ({ id: e.id, name: e.symbol || e.path, description: e.description || '', members: [] as string[], confidence: 1, auto: false }));
      const pos = layoutGrid(Math.max(1, items.length));
      const nodes: Node[] = items.map((f, i) => ({
        id: f.id, type: 'codeNode', position: pos[i],
        selected: selectedId === f.id,
        data: {
          label: f.name, sub: `${f.members.length} items`,
          summary: f.description || 'Feature cluster — files + functions serving it.',
          color: KIND_COLOR.FEATURE, kind: 'FEATURE',
          proposed: featEnts.find((e) => e.id === f.id)?.proposed,
        },
      }));
      // feature -> member edges
      const byId = new Set(entities.map((e) => e.id));
      const edges: Edge[] = [];
      for (const f of features) {
        for (const m of f.members) {
          if (!byId.has(m)) continue;
          edges.push({ id: `e-${f.id}-${m}`, source: f.id, target: m, animated: false, style: { stroke: '#8b5cf6', strokeWidth: 1.5, opacity: 0.6 } });
        }
      }
      const detail = entities.find((e) => e.id === selectedId) ?? null;
      return { nodes, edges, detail };
    }

    let list = entities.filter((e) => {
      if (level === 'folder') return e.kind === 'FOLDER' || e.kind === 'FEATURE' || e.kind === 'FEATURE_PROPOSED';
      if (level === 'file') {
        if (e.kind === 'FEATURE' || e.kind === 'FEATURE_PROPOSED') return true;
        if (focusedFolder) return (e.kind === 'FILE' || e.kind === 'FILE_PROPOSED') && e.path.startsWith(focusedFolder);
        return e.kind === 'FILE' || e.kind === 'FILE_PROPOSED';
      }
      // func level: funcs of focused file/folder + their parent files
      if (focusedFolder) {
        if (e.kind === 'FILE' && e.path.startsWith(focusedFolder)) return true;
        if ((e.kind === 'FUNC' || e.kind === 'FUNC_PROPOSED') && e.path.startsWith(focusedFolder)) return true;
        return false;
      }
      const sel = entities.find((x) => x.id === selectedId);
      if (sel && (sel.kind === 'FILE' || sel.kind === 'FILE_PROPOSED')) {
        return e.id === sel.id || (e.kind === 'FUNC' && e.path === sel.path);
      }
      return e.kind === 'FUNC' || e.kind === 'FUNC_PROPOSED';
    });
    if (list.length === 0) list = entities.slice(0, 50);
    list = list.slice(0, 150); // render cap — drill down for more

    const pos = layoutGrid(list.length);
    const nodes: Node[] = list.map((e, i) => ({
      id: e.id, type: 'codeNode', position: pos[i],
      selected: selectedId === e.id,
      data: {
        label: e.kind === 'FUNC' || e.kind === 'FUNC_PROPOSED' ? (e.symbol || e.path) : e.path.split('/').pop() || e.path,
        sub: e.kind === 'FUNC' ? e.path : e.symbol ? `${e.symbol}` : undefined,
        summary: e.summary,
        color: KIND_COLOR[e.kind] ?? '#3b82f6',
        kind: e.kind, proposed: e.proposed,
      },
    }));
    const ids = new Set(list.map((e) => e.id));
    let edges: Edge[];
    if (level === 'folder') {
      const agg = aggregateFolderLinks(entities, links);
      edges = agg.filter((l) => ids.has(l.source) && ids.has(l.target)).map((l) => ({
        id: l.id, source: l.source, target: l.target, animated: true,
        style: { stroke: '#f59e0b', strokeWidth: 1.5, opacity: l.proposed ? 0.7 : 0.9, strokeDasharray: l.proposed ? '5 4' : undefined },
      }));
    } else {
      edges = links.filter((l) => ids.has(l.source) && ids.has(l.target)).slice(0, 300).map((l) => ({
        id: l.id, source: l.source, target: l.target,
        animated: !l.proposed,
        style: {
          stroke: l.kind === 'imports' ? '#3b82f6' : l.kind === 'contains' ? '#52525b' : '#8b5cf6',
          strokeWidth: 1.5, opacity: l.proposed ? 0.7 : 0.85,
          strokeDasharray: l.proposed ? '5 4' : l.kind === 'contains' ? '2 4' : undefined,
        },
      }));
    }
    const detail = entities.find((e) => e.id === selectedId) ?? null;
    return { nodes, edges, detail };
  }, [entities, links, features, view, level, focusedFolder, selectedId]);

  return (
    <div className="flex-1 relative h-full">
      <ReactFlow
        nodes={nodes} edges={edges}
        onNodeClick={(_, n) => select(n.id)}
        onPaneClick={() => select(null)}
        nodeTypes={nodeTypes} fitView
        className="bg-zinc-950" proOptions={{ hideAttribution: true }}
      >
        <Background color="#27272a" gap={24} size={1} />
        <Controls className="!bg-zinc-900 !border-zinc-800 [&>button]:!bg-zinc-900 [&>button]:!border-zinc-800" />
        <MiniMap nodeColor={(n) => (n.data as { color?: string }).color ?? '#3b82f6'} className="!bg-zinc-900 !border-zinc-800" maskColor="rgba(0,0,0,0.7)" />
      </ReactFlow>
      {detail && (
        <div className="absolute bottom-4 left-4 right-4 md:right-auto md:w-96 p-4 rounded-lg bg-zinc-900 border border-zinc-800">
          <p className="text-[10px] font-mono text-zinc-600 mb-1">{detail.kind} · {detail.language}</p>
          <p className="text-sm font-bold text-white font-mono truncate">{detail.symbol ?? detail.path}</p>
          {detail.symbol && <p className="text-[11px] font-mono text-zinc-500">{detail.path}</p>}
          <p className="mt-2 text-xs text-zinc-300 leading-relaxed">{detail.summary || 'No summary yet — run Summarize to describe precisely what this does.'}</p>
          {detail.range && <p className="mt-1 text-[10px] font-mono text-zinc-600">lines {detail.range.start}–{detail.range.end} · hash {detail.hash}</p>}
        </div>
      )}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-xs text-zinc-600">No nodes at this level — go up a level</p>
        </div>
      )}
    </div>
  );
}
