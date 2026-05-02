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
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Lightning, 
  TerminalWindow, 
  Selection, 
  Cube, 
  CursorClick 
} from '@phosphor-icons/react';
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

const SPRING_TRANSITION: any = { type: 'spring', stiffness: 300, damping: 30 };

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
        toast(`Copied ${payload.nodes.length} unit${payload.nodes.length === 1 ? '' : 's'}`, 'success', 1500);
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
                toast(`Pasted ${pasted.length} unit${pasted.length === 1 ? '' : 's'}`, 'success', 1500);
                return;
              }
            }
          } catch {
            // fallback to internal clipboard below
          }

          const pasted = pasteSelection(undefined, { x: 40, y: 40 });
          if (pasted.length > 0) {
            toast(`Pasted ${pasted.length} unit${pasted.length === 1 ? '' : 's'}`, 'success', 1500);
          }
        })();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [copySelection, duplicateNodes, pasteSelection, setOutputPanelOpen, toggleNodeBypassed, toggleNodeMuted]);

  const defaultEdgeOptions = useMemo(
    () => ({ animated: true, style: { stroke: '#3b82f6', strokeWidth: 2 } }),
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
          style: { ...(e.style ?? {}), stroke: '#3f3f46', strokeWidth: 2, strokeDasharray: '2 5', opacity: 0.5 },
        };
      }

      if (sState === 'bypassed' || tState === 'bypassed') {
        return {
          ...e,
          animated: false,
          style: { ...(e.style ?? {}), stroke: '#3b82f6', strokeWidth: 2, strokeDasharray: '5 4', opacity: 0.7 },
        };
      }

      return {
        ...e,
        animated: true,
        style: { ...(e.style ?? {}), stroke: '#3b82f6', strokeWidth: 2 },
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
          className="bg-zinc-950"
        >
          <Background color="#27272a" gap={24} size={1} />
          <Controls
            className="!bg-zinc-900 !border-zinc-800 !rounded-xl !shadow-2xl [&>button]:!bg-zinc-900 [&>button]:!border-zinc-800 [&>button]:!text-zinc-500 [&>button:hover]:!bg-zinc-800 [&>button:hover]:!text-zinc-300"
          />
          <MiniMap
            nodeColor={(node) => {
              const data = node.data as { color?: string };
              return data.color ?? '#3b82f6';
            }}
            className="!bg-zinc-900 !border-zinc-800 !rounded-xl !shadow-2xl"
            maskColor="rgba(0, 0, 0, 0.7)"
          />
        </ReactFlow>

        {/* Empty state */}
        <AnimatePresence>
          {nodes.length === 0 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <div className="text-center max-w-sm px-6">
                <div className="relative inline-block mb-10">
                   <div className="text-6xl text-blue-500/20 font-bold">
                      <Cube size={64} weight="duotone" />
                   </div>
                   <motion.div 
                      animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                      transition={{ repeat: Infinity, duration: 4 }}
                      className="absolute inset-0 text-blue-400 blur-xl flex items-center justify-center"
                   >
                      <Cube size={64} weight="fill" />
                   </motion.div>
                </div>
                <h3 className="text-white/80 text-lg font-bold uppercase tracking-[0.2em] mb-8">System Initialized</h3>
                <div className="space-y-4 text-left">
                  {[
                    { n: '01', text: 'Deploy units from tactical sidebar', icon: CursorClick },
                    { n: '02', text: 'Configure mission parameters', icon: Selection },
                    { n: '03', text: 'Initialize compilation protocol', icon: TerminalWindow },
                  ].map((step) => (
                    <motion.div 
                      key={step.n} 
                      className="flex items-start gap-4 p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/50 backdrop-blur-sm shadow-inner"
                    >
                      <span className="flex-shrink-0 w-6 h-6 rounded-lg border border-zinc-700 bg-zinc-800 text-blue-400 text-[10px] font-mono font-bold flex items-center justify-center tracking-tighter">
                        {step.n}
                      </span>
                      <div className="flex-1">
                         <p className="text-zinc-400 text-[11px] leading-relaxed font-bold uppercase tracking-wide">{step.text}</p>
                      </div>
                      <step.icon size={16} className="text-zinc-700" />
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
      toast('Shared protocol loaded from hash', 'success');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ReactFlowProvider>
      <div className="relative h-screen w-screen bg-zinc-950 overflow-hidden font-sans">
        <VersionHistoryPanel />

        {/* Tactical UI Layers */}
        <div className="absolute inset-0 z-20 pointer-events-none flex">
          <Sidebar />

          <div className="flex-1 relative flex flex-col pointer-events-none">
            <div className="flex-1 pointer-events-none" />

            <TestPanel open={testPanelOpen} onClose={() => setTestPanelOpen(false)} />
          </div>

          <OutputPanel />
        </div>

        {/* Main Canvas Layer */}
        <div className="absolute inset-0 z-10">
          <FlowCanvas onOpenTemplates={() => setTemplatesOpen(true)} />
        </div>

        <ToastContainer />

        {/* Modals */}
        {templatesOpen && <TemplatesModal onClose={() => setTemplatesOpen(false)} />}

        {/* Floating Action Button */}
        <AnimatePresence>
          {!testPanelOpen && (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={SPRING_TRANSITION}
              className="fixed bottom-10 right-10 z-30"
            >
              <button
                onClick={() => setTestPanelOpen(true)}
                className="group flex items-center gap-4 pl-6 pr-2 py-2 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl hover:bg-zinc-800 hover:border-zinc-700 transition-all active:scale-95 pointer-events-auto"
                title="Initialize LLM Neural Link"
              >
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 group-hover:text-white transition-colors">Test Protocol</span>
                <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.3)] group-hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] transition-all">
                  <Lightning size={16} weight="fill" className="text-white animate-pulse" />
                </div>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ReactFlowProvider>
  );
}