import { create } from 'zustand';
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
} from '@xyflow/react';
import type { PromptNode, PromptEdge, PromptNodeData, PromptNodeType, PaletteItem, PromptVersion, PromptNodeState, ResourceType } from './types';
import { PALETTE_ITEMS } from './presets';
import { toast } from './toast';
import { newNodeId, newEdgeId, hashContent } from './lib/ids';

export interface WorkflowClipboard {
  nodes: PromptNode[];
  edges: PromptEdge[];
  meta: {
    copiedAt: number;
    sourceWorkflowId: string;
  };
}

interface AppState {
  nodes: PromptNode[];
  edges: PromptEdge[];
  outputPanelOpen: boolean;
  customPaletteItems: PaletteItem[];
  versions: PromptVersion[];
  historyOpen: boolean;

  // React Flow handlers
  onNodesChange: OnNodesChange<PromptNode>;
  onEdgesChange: OnEdgesChange<PromptEdge>;
  onConnect: OnConnect;

  // Node management
  addNode: (nodeType: PromptNodeType, position?: { x: number; y: number }) => void;
  updateNodeContent: (nodeId: string, content: string) => void;
  updateNodeField: (nodeId: string, fieldId: string, value: string) => void;
  updateNodeEnabled: (nodeId: string, enabled: boolean) => void;
  setNodeState: (nodeId: string, state: PromptNodeState) => void;
  toggleNodeBypassed: (nodeIds: string[]) => void;
  toggleNodeMuted: (nodeIds: string[]) => void;
  updateNodeToggled: (nodeId: string, toggled: boolean) => void;
  removeNode: (nodeId: string) => void;
  duplicateNodes: (nodeIds: string[], offset?: { x: number; y: number }) => void;
  copySelection: (nodeIds: string[]) => WorkflowClipboard | null;
  pasteSelection: (payload?: WorkflowClipboard, offset?: { x: number; y: number }) => PromptNode[];

  // Custom palette
  addCustomPaletteItem: (item: PaletteItem) => void;
  removeCustomPaletteItem: (nodeType: string) => void;
  importNodePack: (items: PaletteItem[]) => void;

  // Workflows
  loadWorkflow: (nodes: PromptNode[], edges: PromptEdge[]) => void;

  // Version history
  saveVersion: (name?: string, xml?: string) => void;
  restoreVersion: (id: string) => void;
  deleteVersion: (id: string) => void;
  setHistoryOpen: (open: boolean) => void;

  // Output panel
  setOutputPanelOpen: (open: boolean) => void;
}

/**
 * Validates if two nodes can be connected based on their port types.
 * CODE/FEATURE ports follow the same overlap rule; FEATURE out=[FEATURE]
 * may only target CODE in=[CODE,ANY] or FEATURE in=[FEATURE,ANY].
 */
function isValidConnection(source: PromptNode, target: PromptNode): boolean {
  const sourceOut = (source.data.portType?.out ?? ['ANY']) as ResourceType[];
  const targetIn = (target.data.portType?.in ?? ['ANY']) as ResourceType[];

  // If source outputs RULES, it can only plug into something that accepts RULES or ANY
  if (sourceOut.includes('RULES')) {
    return targetIn.includes('RULES') || targetIn.includes('ANY');
  }

  // CODE ports: require CODE/ANY overlap (prevents prompt nodes wiring into code by accident)
  if (sourceOut.includes('CODE') || sourceOut.includes('FEATURE')) {
    return (
      targetIn.includes('ANY') ||
      sourceOut.some((t) => targetIn.includes(t))
    );
  }

  // Otherwise, return true if there's any overlap or if either is ANY
  return (
    sourceOut.includes('ANY') ||
    targetIn.includes('ANY') ||
    sourceOut.some((t) => targetIn.includes(t))
  );
}

const CUSTOM_NODES_KEY = 'prompt-crafter:custom-nodes';
const VERSIONS_KEY = 'prompt-crafter:versions';
const MAX_VERSIONS = 30;

// Prototype-pollution-safe JSON reviver: drops __proto__ / constructor / prototype keys
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

function loadCustomItems(): PaletteItem[] {
  try {
    const raw = localStorage.getItem(CUSTOM_NODES_KEY);
    return raw ? (JSON.parse(raw, safeReviver) as PaletteItem[]) : [];
  } catch {
    return [];
  }
}

function loadVersions(): PromptVersion[] {
  try {
    const raw = localStorage.getItem(VERSIONS_KEY);
    return raw ? (JSON.parse(raw, safeReviver) as PromptVersion[]) : [];
  } catch {
    return [];
  }
}

function saveVersions(versions: PromptVersion[]): void {
  try {
    localStorage.setItem(VERSIONS_KEY, JSON.stringify(versions));
  } catch { /* storage full */ }
}

function saveCustomItems(items: PaletteItem[]): void {
  try {
    localStorage.setItem(CUSTOM_NODES_KEY, JSON.stringify(items));
  } catch { /* storage full or unavailable */ }
}

let internalClipboard: WorkflowClipboard | null = null;
const nextId = () => newNodeId('node');
const nextEdgeId = () => newEdgeId('e');

export const useAppStore = create<AppState>((set, get) => ({
  nodes: [],
  edges: [],
  outputPanelOpen: false,
  historyOpen: false,
  customPaletteItems: loadCustomItems(),
  versions: loadVersions(),

  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) });
  },

  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) });
  },

  onConnect: (connection) => {
    const { nodes, edges } = get();
    const sourceNode = nodes.find((n) => n.id === connection.source);
    const targetNode = nodes.find((n) => n.id === connection.target);

    if (sourceNode && targetNode && !isValidConnection(sourceNode, targetNode)) {
      toast('Invalid connection: Port types do not match.', 'error');
      return;
    }

    set({ edges: addEdge({ ...connection, animated: true }, edges) });
  },

  addNode: (nodeType, position) => {
    const palette =
      PALETTE_ITEMS.find((p) => p.nodeType === nodeType) ??
      get().customPaletteItems.find((p) => p.nodeType === nodeType);
    if (!palette) return;

    const existingCount = get().nodes.length;
    const pos = position ?? { x: 100 + (existingCount % 4) * 320, y: 80 + Math.floor(existingCount / 4) * 280 };

    const data: PromptNodeData = {
      nodeType,
      label: palette.label,
      category: palette.category,
      description: palette.description,
      content: palette.defaultContent,
      enabled: true,
      state: 'active',
      color: palette.color,
      toggled: nodeType === 'logic_reasoning' ? true : undefined,
    };

    const newNode: PromptNode = {
      id: nextId(),
      type: 'promptNode',
      position: pos,
      data,
    };

    set({ nodes: [...get().nodes, newNode] });
  },

  addCustomPaletteItem: (item) => {
    const next = [...get().customPaletteItems, item];
    set({ customPaletteItems: next });
    saveCustomItems(next);
  },

  removeCustomPaletteItem: (nodeType) => {
    const next = get().customPaletteItems.filter((p) => p.nodeType !== nodeType);
    set({ customPaletteItems: next });
    saveCustomItems(next);
  },

  importNodePack: (items) => {
    // Merge, skipping duplicates (same nodeType)
    const existing = get().customPaletteItems;
    const existingTypes = new Set(existing.map((p) => p.nodeType));
    const toAdd = items.filter((p) => !existingTypes.has(p.nodeType));
    const next = [...existing, ...toAdd];
    set({ customPaletteItems: next });
    saveCustomItems(next);
  },

  loadWorkflow: (nodes, edges) => {
    // Re-assign fresh IDs to avoid collisions
    const idMap = new Map<string, string>();
    const remappedNodes: PromptNode[] = nodes.map((n) => {
      const newId = nextId();
      idMap.set(n.id, newId);
      return { ...n, id: newId, type: 'promptNode' };
    });
    const remappedEdges: PromptEdge[] = edges.map((e) => ({
      ...e,
      id: nextEdgeId(),
      source: idMap.get(e.source) ?? e.source,
      target: idMap.get(e.target) ?? e.target,
    }));
    set({ nodes: remappedNodes, edges: remappedEdges });
  },

  updateNodeContent: (nodeId, content) => {
    set({
      nodes: get().nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, content } } : n,
      ),
    });
  },

  updateNodeField: (nodeId, fieldId, value) => {
    set({
      nodes: get().nodes.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              data: {
                ...n.data,
                fields: n.data.fields?.map((f) =>
                  f.id === fieldId ? { ...f, value } : f
                ),
              },
            }
          : n
      ),
    });
  },

  updateNodeEnabled: (nodeId, enabled) => {
    set({
      nodes: get().nodes.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              data: {
                ...n.data,
                enabled,
                state: enabled ? 'active' : 'muted',
              },
            }
          : n,
      ),
    });
  },

  setNodeState: (nodeId, state) => {
    set({
      nodes: get().nodes.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              data: {
                ...n.data,
                state,
                enabled: state !== 'muted',
              },
            }
          : n,
      ),
    });
  },

  toggleNodeBypassed: (nodeIds) => {
    if (nodeIds.length === 0) return;
    const selected = new Set(nodeIds);
    set({
      nodes: get().nodes.map((n) => {
        if (!selected.has(n.id)) return n;
        const cur = n.data.state ?? (n.data.enabled ? 'active' : 'muted');
        const next: PromptNodeState = cur === 'bypassed' ? 'active' : 'bypassed';
        return {
          ...n,
          data: {
            ...n.data,
            state: next,
            enabled: true,
          },
        };
      }),
    });
  },

  toggleNodeMuted: (nodeIds) => {
    if (nodeIds.length === 0) return;
    const selected = new Set(nodeIds);
    set({
      nodes: get().nodes.map((n) => {
        if (!selected.has(n.id)) return n;
        const cur = n.data.state ?? (n.data.enabled ? 'active' : 'muted');
        const next: PromptNodeState = cur === 'muted' ? 'active' : 'muted';
        return {
          ...n,
          data: {
            ...n.data,
            state: next,
            enabled: next !== 'muted',
          },
        };
      }),
    });
  },

  updateNodeToggled: (nodeId, toggled) => {
    set({
      nodes: get().nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, toggled } } : n,
      ),
    });
  },

  removeNode: (nodeId) => {
    set({
      nodes: get().nodes.filter((n) => n.id !== nodeId),
      edges: get().edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
    });
  },

  duplicateNodes: (nodeIds, offset = { x: 20, y: 20 }) => {
    if (nodeIds.length === 0) return;
    const selected = new Set(nodeIds);
    const nodes = get().nodes;
    const edges = get().edges;
    const selectedNodes = nodes.filter((n) => selected.has(n.id));
    if (selectedNodes.length === 0) return;

    const idMap = new Map<string, string>();
    const dupNodes: PromptNode[] = selectedNodes.map((n) => {
      const newId = nextId();
      idMap.set(n.id, newId);
      return {
        ...n,
        id: newId,
        selected: true,
        position: {
          x: n.position.x + offset.x,
          y: n.position.y + offset.y,
        },
      };
    });

    const dupEdges: PromptEdge[] = edges
      .filter((e) => selected.has(e.source) && selected.has(e.target))
      .map((e) => ({
        ...e,
        id: nextEdgeId(),
        source: idMap.get(e.source) ?? e.source,
        target: idMap.get(e.target) ?? e.target,
      }));

    set({
      nodes: [...nodes.map((n) => ({ ...n, selected: false })), ...dupNodes],
      edges: [...edges, ...dupEdges],
    });
  },

  copySelection: (nodeIds) => {
    if (nodeIds.length === 0) return null;
    const selected = new Set(nodeIds);
    const nodes = get().nodes.filter((n) => selected.has(n.id));
    if (nodes.length === 0) return null;
    const edges = get().edges.filter((e) => selected.has(e.source) && selected.has(e.target));
    const payload: WorkflowClipboard = {
      nodes,
      edges,
      meta: {
        copiedAt: Date.now(),
        sourceWorkflowId: 'local-workspace',
      },
    };
    internalClipboard = payload;
    return payload;
  },

  pasteSelection: (payload, offset = { x: 40, y: 40 }) => {
    const source = payload ?? internalClipboard;
    if (!source || source.nodes.length === 0) return [];

    const nodes = get().nodes;
    const edges = get().edges;

    const idMap = new Map<string, string>();
    const pastedNodes: PromptNode[] = source.nodes.map((n) => {
      const newId = nextId();
      idMap.set(n.id, newId);
      return {
        ...n,
        id: newId,
        selected: true,
        position: {
          x: n.position.x + offset.x,
          y: n.position.y + offset.y,
        },
      };
    });

    const pastedEdges: PromptEdge[] = source.edges.map((e) => ({
      ...e,
      id: nextEdgeId(),
      source: idMap.get(e.source) ?? e.source,
      target: idMap.get(e.target) ?? e.target,
    }));

    set({
      nodes: [...nodes.map((n) => ({ ...n, selected: false })), ...pastedNodes],
      edges: [...edges, ...pastedEdges],
    });

    return pastedNodes;
  },

  setOutputPanelOpen: (open) => set({ outputPanelOpen: open }),

  setHistoryOpen: (open) => set({ historyOpen: open }),

  saveVersion: (name, xml = '') => {
    const { nodes, edges, versions } = get();
    const autoName = name ?? `Auto-save ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const hash = hashContent(JSON.stringify([nodes.map((n) => [n.id, n.data]), edges.map((e) => [e.source, e.target])]));
    const version: PromptVersion = {
      id: `v_${Date.now().toString(36)}_${hash}`,
      name: autoName,
      timestamp: Date.now(),
      nodes,
      edges,
      xml,
      hash,
      parentId: versions[0]?.id ?? null,
    };
    const next = [version, ...versions].slice(0, MAX_VERSIONS);
    set({ versions: next });
    saveVersions(next);
  },

  restoreVersion: (id) => {
    const version = get().versions.find((v) => v.id === id);
    if (!version) return;
    get().loadWorkflow(version.nodes, version.edges);
  },

  deleteVersion: (id) => {
    const next = get().versions.filter((v) => v.id !== id);
    set({ versions: next });
    saveVersions(next);
  },
}));
