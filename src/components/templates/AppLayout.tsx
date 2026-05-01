import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  type NodeTypes,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useAppStore, type WorkflowClipboard } from '../../store';
import PromptNodeComponent from '../organisms/PromptNode';
import Sidebar from '../organisms/Sidebar';
import OutputPanel from '../organisms/OutputPanel';
import Toolbar from '../organisms/Toolbar';
import ToastContainer from '../organisms/ToastContainer';
import TemplatesModal from '../organisms/TemplatesModal';
import VersionHistoryPanel from '../organisms/VersionHistoryPanel';
import TestPanel from '../organisms/TestPanel';
import { decodeWorkflowFromHash, clearShareHash } from '../../shareUrl';
import { toast } from '../../toast';
import { DRAG_TYPE } from '../molecules/PaletteNodeItem';

const nodeTypes: NodeTypes = {
  promptNode: PromptNodeComponent,
};

function FlowCanvas({ onOpenTemplates }: { onOpenTemplates: () => void }) {
  const nodes = useAppStore((s) => s.nodes);
  const edges = useAppStore((s) => s.edges);
  const onNodesChange = useAppStore((s) => s.onNodesChange);
  const onEdgesChange = useAppStore((s) => s.onEdgesChange);
  const onConnect = useAppStore((s) => s.onConnect);
  const addNode = useAppStore((s) => s.addNode);
  const setOutputPanelOpen = useAppStore((s) => s.setOutputPanelOpen);
  const toggleNodeBypassed = useAppStore((s) => s.toggleNodeBypassed);
  const toggleNodeMuted = useAppStore((s) => s.toggleNodeMuted);
  const duplicateNodes = useAppStore((s) => s.duplicateNodes);
  const copySelection = useAppStore((s) => s.copySelection);
  const pasteSelection = useAppStore((s) => s.pasteSelection);
  const { screenToFlowPosition } = useReactFlow();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isEditing = tag === 'input' || tag === 'textarea' || target?.isContentEditable;
      if (isEditing) return;

      const selectedIds = useAppStore
        .getState()
        .nodes
        .filter((n) => n.selected)
        .map((n) => n.id);

      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        setOutputPanelOpen(!useAppStore.getState().outputPanelOpen);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        toggleNodeBypassed(selectedIds);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === 'm' || e.key === 'M')) {
        e.preventDefault();
        toggleNodeMuted(selectedIds);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        duplicateNodes(selectedIds, { x: 20, y: 20 });
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        const payload = copySelection(selectedIds);
        if (!payload) return;
        const wrapped = JSON.stringify({ kind: 'prompt-crafter-selection', version: 1, ...payload });
        void navigator.clipboard.writeText(wrapped).catch(() => {
          // Clipboard write can fail on some browser contexts; internal clipboard still works.
        });
        toast(`Copied ${payload.nodes.length} node${payload.nodes.length === 1 ? '' : 's'}`, 'success', 1500);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        void (async () => {
          try {
            const text = await navigator.clipboard.readText();
            const parsed = JSON.parse(text) as {
              kind?: string;
              nodes?: unknown[];
              edges?: unknown[];
              meta?: { copiedAt?: number; sourceWorkflowId?: string };
            };
            if (parsed.kind === 'prompt-crafter-selection' && Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
              const payload: WorkflowClipboard = {
                nodes: parsed.nodes as WorkflowClipboard['nodes'],
                edges: parsed.edges as WorkflowClipboard['edges'],
                meta: {
                  copiedAt: parsed.meta?.copiedAt ?? Date.now(),
                  sourceWorkflowId: parsed.meta?.sourceWorkflowId ?? 'external-clipboard',
                },
              };
              const pasted = pasteSelection(payload, { x: 40, y: 40 });
              if (pasted.length > 0) {
                toast(`Pasted ${pasted.length} node${pasted.length === 1 ? '' : 's'}`, 'success', 1500);
                return;
              }
            }
          } catch {
            // fallback to internal clipboard below
          }

          const pasted = pasteSelection(undefined, { x: 40, y: 40 });
          if (pasted.length > 0) {
            toast(`Pasted ${pasted.length} node${pasted.length === 1 ? '' : 's'}`, 'success', 1500);
          }
        })();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [copySelection, duplicateNodes, pasteSelection, setOutputPanelOpen, toggleNodeBypassed, toggleNodeMuted]);

  const defaultEdgeOptions = useMemo(
    () => ({ animated: true, style: { stroke: '#6366f1', strokeWidth: 2 } }),
    [],
  );
  const renderedEdges = useMemo(() => {
    const nodeById = new Map(nodes.map((n) => [n.id, n]));
    return edges.map((e) => {
      const s = nodeById.get(e.source);
      const t = nodeById.get(e.target);
      const sState = s?.data.state ?? (s?.data.enabled ? 'active' : 'muted');
      const tState = t?.data.state ?? (t?.data.enabled ? 'active' : 'muted');

      if (sState === 'muted' || tState === 'muted') {
        return {
          ...e,
          animated: false,
          style: { ...(e.style ?? {}), stroke: '#6b7280', strokeWidth: 2, strokeDasharray: '2 5', opacity: 0.5 },
        };
      }

      if (sState === 'bypassed' || tState === 'bypassed') {
        return {
          ...e,
          animated: false,
          style: { ...(e.style ?? {}), stroke: '#94a3b8', strokeWidth: 2, strokeDasharray: '5 4' },
        };
      }

      return {
        ...e,
        animated: true,
        style: { ...(e.style ?? {}), stroke: '#6366f1', strokeWidth: 2 },
      };
    });
  }, [edges, nodes]);
  const proOptions = useMemo(() => ({ hideAttribution: true }), []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes(DRAG_TYPE)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const nodeType = e.dataTransfer.getData(DRAG_TYPE);
      if (!nodeType) return;
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      addNode(nodeType as Parameters<typeof addNode>[0], position);
    },
    [addNode, screenToFlowPosition],
  );

  return (
    <div className="flex-1 relative flex flex-col overflow-hidden">
      <div className="flex-1 relative">
        <Toolbar onOpenTemplates={onOpenTemplates} />
        <ReactFlow
          nodes={nodes}
          edges={renderedEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDragOver={onDragOver}
          onDrop={onDrop}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          proOptions={proOptions}
          fitView
          className="bg-ink-950"
        >
          <Background color="#1a1a24" gap={24} size={1} />
          <Controls
            className="!bg-ink-900 !border-white/5 !rounded !shadow-2xl [&>button]:!bg-ink-900 [&>button]:!border-white/5 [&>button]:!text-gray-500 [&>button:hover]:!bg-white/5"
          />
          <MiniMap
            nodeColor={(node) => {
              const data = node.data as { color?: string };
              return data.color ?? '#6366f1';
            }}
            className="!bg-ink-900 !border-white/5 !rounded !shadow-2xl"
            maskColor="rgba(0, 0, 0, 0.7)"
          />
        </ReactFlow>

        {/* Empty state */}
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center max-w-sm px-6">
              <div className="text-5xl mb-8 opacity-5 text-indigo-500 font-bold">⬡</div>
              <h3 className="text-white/80 text-sm font-bold uppercase tracking-[0.2em] mb-6">System Initialization</h3>
              <div className="space-y-4 text-left">
                {[
                  { n: '01', text: 'Deploy components from the tactical sidebar' },
                  { n: '02', text: 'Configure Role, Domain and Mission parameters' },
                  { n: '03', text: 'Execute Compile (Ctrl+Enter) to generate protocol' },
                ].map((step) => (
                  <div key={step.n} className="flex items-start gap-4 group">
                    <span className="flex-shrink-0 w-6 h-6 rounded border border-white/10 bg-white/5 text-indigo-400 text-[9px] font-mono font-bold flex items-center justify-center tracking-tighter shadow-inner">
                      {step.n}
                    </span>
                    <p className="text-gray-500 text-[11px] leading-relaxed font-medium uppercase tracking-tight">{step.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AppLayout() {
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [testPanelOpen, setTestPanelOpen] = useState(false);
  const loadWorkflow = useAppStore((s) => s.loadWorkflow);

  // Load shared workflow from URL hash on first mount
  useEffect(() => {
    const shared = decodeWorkflowFromHash();
    if (shared) {
      loadWorkflow(shared.nodes, shared.edges);
      clearShareHash();
      toast('Shared workflow loaded from URL', 'success');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ReactFlowProvider>
      <div className="relative h-screen w-screen bg-gray-950 overflow-hidden font-sans">
        <VersionHistoryPanel />

        {/* Sidebar */}
        <div className="absolute inset-0 z-20 pointer-events-none flex">
          <Sidebar />

          <div className="flex-1 relative flex flex-col pointer-events-none">
            <Toolbar onOpenTemplates={() => setTemplatesOpen(true)} />

            {/* Dynamic Panel Anchors */}
            <div className="flex-1 pointer-events-none" />

            <TestPanel open={testPanelOpen} onClose={() => setTestPanelOpen(false)} />
          </div>

          <OutputPanel />
        </div>

        {/* Main Canvas: Edge-to-Edge */}
        <div className="absolute inset-0 z-10">
          <FlowCanvas onOpenTemplates={() => setTemplatesOpen(true)} />
        </div>

        <ToastContainer />

        {/* Modals */}
        {templatesOpen && <TemplatesModal onClose={() => setTemplatesOpen(false)} />}

        {/* Floating test button */}
        {!testPanelOpen && (
          <div className="fixed bottom-10 right-10 z-30">
            <button
              onClick={() => setTestPanelOpen(true)}
              className="flex items-center gap-3 px-4 py-2 rounded-full bg-gray-800 border border-gray-700 shadow-lg hover:bg-gray-700 transition-colors active:scale-95"
              title="Test compiled prompt against an LLM"
            >
              <span className="text-xs font-semibold text-gray-200">Test Protocol</span>
              <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center shadow-md">
                <span className="text-xs text-white">⚡</span>
              </div>
            </button>
          </div>
        )}
      </div>
    </ReactFlowProvider>
  );}
