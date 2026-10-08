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
import { useCodeStore } from '../../codeIndex/store';
import PromptNodeComponent from '../organisms/PromptNode';
import Sidebar from '../organisms/Sidebar';
import OutputPanel from '../organisms/OutputPanel';
import Toolbar from '../organisms/Toolbar';
import ToastContainer from '../organisms/ToastContainer';
import TemplatesModal from '../organisms/TemplatesModal';
import VersionHistoryPanel from '../organisms/VersionHistoryPanel';
import TestPanel from '../organisms/TestPanel';
import IngestScreen from '../organisms/IngestScreen';
import BuildingScreen from '../organisms/BuildingScreen';
import ExploreScreen from '../organisms/ExploreScreen';
import CodebaseEntryButton from '../molecules/CodebaseEntryButton';
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
    // Robust check for drag types (e.dataTransfer.types is not always an array)
    const isOurType = e.dataTransfer.types && Array.from(e.dataTransfer.types).includes(DRAG_TYPE);
    if (!isOurType) return;
    
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
    <div className="h-full w-full relative flex flex-col overflow-hidden">
      <div className="flex-1 relative">
        <Toolbar onOpenTemplates={onOpenTemplates} />
        <div className="absolute top-4 left-4 z-20">
          <CodebaseEntryButton />
        </div>
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
            className="!bg-zinc-900 !border-zinc-800 !rounded-lg [&>button]:!bg-zinc-900 [&>button]:!border-zinc-800 [&>button]:!text-zinc-500 [&>button:hover]:!bg-zinc-800 [&>button:hover]:!text-zinc-300"
          />
          <MiniMap
            nodeColor={(node) => {
              const data = node.data as { color?: string };
              return data.color ?? '#3b82f6';
            }}
            className="!bg-zinc-900 !border-zinc-800 !rounded-lg"
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
                <div className="mb-8 text-zinc-700">
                   <Cube size={48} weight="duotone" />
                </div>
                <h3 className="text-zinc-300 text-base font-semibold mb-6">Start building</h3>
                <div className="space-y-2 text-left">
                  {[
                    { n: '01', text: 'Add nodes from the sidebar', icon: CursorClick },
                    { n: '02', text: 'Configure node content', icon: Selection },
                    { n: '03', text: 'Compile to preview output', icon: TerminalWindow },
                  ].map((step) => (
                    <div
                      key={step.n}
                      className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900 border border-zinc-800"
                    >
                      <span className="flex-shrink-0 w-6 h-6 rounded-md border border-zinc-700 bg-zinc-800 text-zinc-400 text-[10px] font-mono flex items-center justify-center">
                        {step.n}
                      </span>
                      <p className="flex-1 text-zinc-400 text-xs">{step.text}</p>
                      <step.icon size={15} className="text-zinc-600" />
                    </div>
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
  const codeScreen = useCodeStore((s) => s.screen);

  // Load shared workflow from URL hash on first mount (must stay before early returns)
  useEffect(() => {
    const shared = decodeWorkflowFromHash();
    if (shared) {
      loadWorkflow(shared.nodes, shared.edges);
      clearShareHash();
      toast('Shared protocol loaded from hash', 'success');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (codeScreen === 'ingest') {
    return (
      <ReactFlowProvider>
        <div className="relative h-screen w-screen bg-zinc-950 overflow-hidden font-sans">
          <IngestScreen />
          <ToastContainer />
        </div>
      </ReactFlowProvider>
    );
  }

  if (codeScreen === 'building') {
    return (
      <ReactFlowProvider>
        <div className="relative h-screen w-screen bg-zinc-950 overflow-hidden font-sans">
          <BuildingScreen />
          <ToastContainer />
        </div>
      </ReactFlowProvider>
    );
  }

  if (codeScreen === 'explore') {
    return (
      <ReactFlowProvider>
        <div className="relative h-screen w-screen bg-zinc-950 overflow-hidden font-sans">
          <ExploreScreen />
          <ToastContainer />
        </div>
      </ReactFlowProvider>
    );
  }

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
        <div className="absolute inset-0 z-10 flex flex-col">
          <FlowCanvas onOpenTemplates={() => setTemplatesOpen(true)} />
        </div>

        <ToastContainer />

        {/* Modals */}
        {templatesOpen && <TemplatesModal onClose={() => setTemplatesOpen(false)} />}

        {/* Test panel toggle */}
        {!testPanelOpen && (
          <div className="fixed bottom-6 right-6 z-30">
            <button
              onClick={() => setTestPanelOpen(true)}
              className="flex items-center gap-2 pl-4 pr-1.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-600 transition-colors pointer-events-auto"
              title="Open test panel"
            >
              <span className="text-xs text-zinc-300">Test</span>
              <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center">
                <Lightning size={14} weight="fill" className="text-white" />
              </div>
            </button>
          </div>
        )}
      </div>
    </ReactFlowProvider>
  );
}