import { useRef } from 'react';
import { toast } from '../../toast';
import { useAppStore } from '../../store';
import type { PaletteItem } from '../../types';
import type { PromptNode, PromptEdge } from '../../types';
import { encodeWorkflowToHash } from '../../shareUrl';
import ToolbarButton from '../molecules/ToolbarButton';

// ── helpers ─────────────────────────────────────────────
function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const PROTO_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
function safeReviver(_key: string, value: unknown): unknown {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const clean: Record<string, unknown> = Object.create(null);
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (!PROTO_KEYS.has(k)) clean[k] = v;
    }
    return clean;
  }
  return value;
}

function readJsonFile<T>(file: File): Promise<T> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        resolve(JSON.parse(e.target?.result as string, safeReviver) as T);
      } catch {
        reject(new Error('Invalid JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsText(file);
  });
}

interface WorkflowFile {
  version: 1;
  kind: 'workflow';
  nodes: PromptNode[];
  edges: PromptEdge[];
}

interface NodePackFile {
  version: 1;
  kind: 'node-pack';
  nodes: PaletteItem[];
}

export default function Toolbar({ onOpenTemplates }: { onOpenTemplates?: () => void }) {
  const nodes = useAppStore((s) => s.nodes);
  const edges = useAppStore((s) => s.edges);
  const customPaletteItems = useAppStore((s) => s.customPaletteItems);
  const loadWorkflow = useAppStore((s) => s.loadWorkflow);
  const importNodePack = useAppStore((s) => s.importNodePack);
  const historyOpen = useAppStore((s) => s.historyOpen);
  const setHistoryOpen = useAppStore((s) => s.setHistoryOpen);

  const workflowRef = useRef<HTMLInputElement>(null);
  const packRef = useRef<HTMLInputElement>(null);

  const handleExportWorkflow = () => {
    const payload: WorkflowFile = { version: 1, kind: 'workflow', nodes, edges };
    downloadJson(`prompt-workflow-${Date.now()}.json`, payload);
    toast('Protocol export sequence complete', 'success');
  };

  const handleImportWorkflow = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      const data = await readJsonFile<WorkflowFile>(file);
      if (data.kind !== 'workflow' || !Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
        toast('Malformed protocol file detected', 'error');
        return;
      }
      loadWorkflow(data.nodes, data.edges);
      toast('Protocol initialization complete', 'success');
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  };

  const handleExportPack = () => {
    if (customPaletteItems.length === 0) {
      toast('No bespoke components to export', 'warning');
      return;
    }
    const payload: NodePackFile = { version: 1, kind: 'node-pack', nodes: customPaletteItems };
    downloadJson(`prompt-node-pack-${Date.now()}.json`, payload);
    toast(`Library export complete (${customPaletteItems.length} components)`, 'success');
  };

  const handleImportPack = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      const data = await readJsonFile<NodePackFile>(file);
      if (data.kind !== 'node-pack' || !Array.isArray(data.nodes)) {
        toast('Malformed library file detected', 'error');
        return;
      }
      const added = data.nodes.length;
      importNodePack(data.nodes);
      toast(`Library merge complete (${added} components)`, 'success');
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  };

  const handleShare = async () => {
    if (nodes.length === 0) {
      toast('Null canvas cannot be shared', 'warning');
      return;
    }
    const url = encodeWorkflowToHash(nodes, edges);
    try {
      await navigator.clipboard.writeText(url);
      toast('Encrypted share hash generated', 'success');
    } catch {
      toast('Hash generation failed', 'error');
    }
  };

  return (
    <div className="absolute top-4 right-4 z-30 flex flex-col items-end gap-2 pointer-events-none">
      {/* Hidden file inputs */}
      <input ref={workflowRef} type="file" accept=".json" className="hidden" onChange={handleImportWorkflow} />
      <input ref={packRef}     type="file" accept=".json" className="hidden" onChange={handleImportPack} />

      {/* Templates + History group */}
      <div className="flex items-center gap-1 p-1 rounded-md bg-gray-900 border border-gray-800 shadow-md pointer-events-auto"> 
        <ToolbarButton
          icon="✦"
          label="Templates"
          onClick={() => onOpenTemplates?.()}
        />
        <div className="w-[1px] h-4 bg-gray-700 mx-1" />
        <ToolbarButton
          icon="🕐"
          label={historyOpen ? 'Hide History' : 'History'}
          onClick={() => setHistoryOpen(!historyOpen)}
        />
        <div className="w-[1px] h-4 bg-gray-700 mx-1" />
        <ToolbarButton
          icon="🔗"
          label="Share"
          onClick={handleShare}
          disabled={nodes.length === 0}
        />
      </div>

      {/* Workflow group */}
      <div className="flex items-center gap-1 p-1 rounded-md bg-gray-800 border border-gray-700 shadow pointer-events-auto opacity-75 hover:opacity-100 transition-opacity"> 
        <ToolbarButton
          icon="↓"
          label="Import"
          onClick={() => workflowRef.current?.click()}
        />
        <ToolbarButton
          icon="↑"
          label="Export"
          onClick={handleExportWorkflow}
          disabled={nodes.length === 0}
        />
      </div>

      {/* Node pack group */}
      <div className="flex items-center gap-1 p-1 rounded-md bg-gray-800 border border-gray-700 shadow pointer-events-auto opacity-50 hover:opacity-100 transition-opacity">  
        <ToolbarButton
          icon="📦"
          label="Library In"
          onClick={() => packRef.current?.click()}
        />
        <ToolbarButton
          icon="📤"
          label="Library Out"
          onClick={handleExportPack}
          disabled={customPaletteItems.length === 0}
        />
      </div>
    </div>
  );}
