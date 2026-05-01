# Spec-Kit & ComfyUI Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Prompt Crafter into a master-class prompt engineering tool using GitHub Spec-Kit methodology and ComfyUI-style typed wiring.

**Architecture:** Implement a strict Typed Resource Registry for node ports, upgrade nodes to "Mini-Workspaces" with multiple fields, and enforce logic guardrails via a specialized connection validation algorithm.

**Tech Stack:** React 18, TypeScript, React Flow (@xyflow/react), Zustand, Tailwind CSS.

---

### Task 1: Foundation & Type System

**Files:**
- Modify: `src/types.ts`
- Modify: `src/presets.ts`

- [ ] **Step 1: Update `src/types.ts` with Resource Types and Node Field structures**

```typescript
// Add to src/types.ts

export type ResourceType = 'RULES' | 'SPECS' | 'ARCH' | 'TASKS' | 'CONTEXT' | 'FORMAT' | 'ANY';

export interface NodeField {
  id: string;
  label: string;
  value: string;
  type: 'text' | 'textarea' | 'list';
  placeholder?: string;
}

export interface PromptNodeData {
  // ... existing fields ...
  fields?: NodeField[];
  commandTrigger?: string;
  portType?: {
    in?: ResourceType[];
    out?: ResourceType[];
  };
}
```

- [ ] **Step 2: Update `src/presets.ts` to include Spec-Kit nodes with Typed Ports**

```typescript
// Add Spec-Kit nodes to PALETTE_ITEMS in src/presets.ts

{
  nodeType: 'speckit_constitution',
  label: '/CONSTITUTION',
  category: 'core',
  description: 'Project governance, tech stack, and rules.',
  color: '#eab308', // Gold
  defaultContent: '',
  commandTrigger: '/speckit.constitution',
  portType: {
    out: ['RULES']
  },
  fields: [
    { id: 'stack', label: 'Tech Stack', value: '', type: 'text', placeholder: 'e.g. React, Node, TS' },
    { id: 'rules', label: 'Core Rules', value: '', type: 'textarea', placeholder: 'Immutable project rules...' }
  ]
},
{
  nodeType: 'speckit_specify',
  label: '/SPECIFY',
  category: 'core',
  description: 'Functional requirements and user stories.',
  color: '#3b82f6', // Blue
  defaultContent: '',
  commandTrigger: '/speckit.specify',
  portType: {
    in: ['RULES'],
    out: ['SPECS']
  },
  fields: [
    { id: 'stories', label: 'User Stories', value: '', type: 'textarea', placeholder: 'As a user...' },
    { id: 'requirements', label: 'Requirements', value: '', type: 'textarea', placeholder: 'The system must...' }
  ]
},
{
  nodeType: 'speckit_plan',
  label: '/PLAN',
  category: 'core',
  description: 'Technical architecture and strategy.',
  color: '#10b981', // Green
  defaultContent: '',
  commandTrigger: '/speckit.plan',
  portType: {
    in: ['SPECS', 'RULES'],
    out: ['ARCH']
  },
  fields: [
    { id: 'arch', label: 'Architecture', value: '', type: 'textarea', placeholder: 'Service mapping...' },
    { id: 'schema', label: 'Data Schema', value: '', type: 'textarea', placeholder: 'Types and Interfaces...' }
  ]
},
{
  nodeType: 'speckit_tasks',
  label: '/TASKS',
  category: 'core',
  description: 'Atomic implementation checklist.',
  color: '#8b5cf6', // Purple
  defaultContent: '',
  commandTrigger: '/speckit.tasks',
  portType: {
    in: ['ARCH', 'RULES'],
    out: ['TASKS']
  },
  fields: [
    { id: 'tasks', label: 'Task List', value: '', type: 'textarea', placeholder: '- [ ] Step 1...' }
  ]
}
```

- [ ] **Step 3: Commit Phase 1**

```bash
git add src/types.ts src/presets.ts
git commit -m "feat: add Spec-Kit node types and resource registry"
```

---

### Task 2: The Logic Engine (Typed Connections)

**Files:**
- Modify: `src/store.ts`
- Modify: `src/components/organisms/Sidebar.tsx`

- [ ] **Step 1: Implement `isValidConnection` helper in `src/store.ts`**

```typescript
function isValidConnection(source: PromptNode, target: PromptNode): boolean {
  const sourceOut = source.data.portType?.out ?? ['ANY'];
  const targetIn = target.data.portType?.in ?? ['ANY'];
  
  // RULES can plug into anything that accepts RULES or ANY
  if (sourceOut.includes('RULES')) {
    return targetIn.includes('RULES') || targetIn.includes('ANY');
  }
  
  // Check for intersection
  return sourceOut.some(type => targetIn.includes(type)) || targetIn.includes('ANY') || sourceOut.includes('ANY');
}
```

- [ ] **Step 2: Update `onConnect` in `src/store.ts` to enforce rules**

```typescript
// Inside useAppStore...
onConnect: (connection) => {
  const { nodes, edges } = get();
  const sourceNode = nodes.find(n => n.id === connection.source);
  const targetNode = nodes.find(n => n.id === connection.target);
  
  if (sourceNode && targetNode && !isValidConnection(sourceNode, targetNode)) {
    // We'll need a way to notify the user. For now, we'll use a simple alert or toast if available.
    console.error("Invalid Connection: Port types do not match.");
    return;
  }
  
  set({ edges: addEdge({ ...connection, animated: true }, edges) });
},
```

- [ ] **Step 3: Update `Sidebar.tsx` to handle dragging new nodes into the palette**

Ensure the new Spec-Kit nodes appear in the sidebar and can be added to the canvas.

- [ ] **Step 4: Commit Phase 2**

```bash
git add src/store.ts src/components/organisms/Sidebar.tsx
git commit -m "feat: implement typed connection logic and guardrails"
```

---

### Task 3: The Rich Node UI (ComfyUI Aesthetic)

**Files:**
- Modify: `src/components/organisms/PromptNode.tsx`
- Modify: `src/App.css`

- [ ] **Step 1: Update `PromptNode.tsx` to render multiple fields**

```typescript
// In PromptNode.tsx, handle data.fields rendering
{data.fields?.map(field => (
  <div key={field.id} className="mt-2">
    <label className="text-[10px] uppercase font-bold text-gray-500">{field.label}</label>
    {field.type === 'textarea' ? (
      <textarea
        value={field.value}
        onChange={(e) => updateField(id, field.id, e.target.value)}
        className="..."
      />
    ) : (
      <input
        type="text"
        value={field.value}
        onChange={(e) => updateField(id, field.id, e.target.value)}
        className="..."
      />
    )}
  </div>
))}
```

- [ ] **Step 2: Add color-coded port styling to `PromptNode.tsx`**

```typescript
// Map ResourceType to color
const typeColors: Record<ResourceType, string> = {
  RULES: '#eab308',
  SPECS: '#3b82f6',
  ARCH: '#10b981',
  TASKS: '#8b5cf6',
  CONTEXT: '#64748b',
  FORMAT: '#f43f5e',
  ANY: '#94a3b8'
};
```

- [ ] **Step 3: Add ComfyUI wire animation to `App.css`**

```css
.react-flow__edge-path {
  stroke-width: 3;
  filter: drop-shadow(0 0 3px rgba(59, 130, 246, 0.5));
}

.react-flow__edge.animated path {
  stroke-dasharray: 10;
  animation: dashdraw 0.5s linear infinite;
}

@keyframes dashdraw {
  from { stroke-dashoffset: 20; }
  to { stroke-dashoffset: 0; }
}
```

- [ ] **Step 4: Commit Phase 3**

```bash
git add src/components/organisms/PromptNode.tsx src/App.css
git commit -m "feat: upgrade node UI and add ComfyUI wire aesthetics"
```

---

### Task 4: Compiler & Command Integration

**Files:**
- Modify: `src/compiler.ts`

- [ ] **Step 1: Update `nodeToBlock` in `src/compiler.ts` to handle rich fields**

```typescript
// Inside nodeToBlock...
if (node.data.fields) {
  const fieldContent = node.data.fields.map(f => `  <${f.id}>\n    ${esc(f.value)}\n  </${f.id}>`).join('\n');
  const trigger = node.data.commandTrigger ? ` command="${node.data.commandTrigger}"` : '';
  return `  <speckit_phase type="${nt}"${trigger}>\n${fieldContent}\n  </speckit_phase>`;
}
```

- [ ] **Step 2: Add "Master Spec" generation logic**

Ensure the final XML wraps the Spec-Kit phases in a way that AI Agents recognize the command triggers.

- [ ] **Step 3: Run full verification test**

1. Create a chain: Constitution -> Spec -> Plan -> Tasks.
2. Fill in some data.
3. Compile and verify the output contains the fields and the command triggers.

- [ ] **Step 4: Final Commit**

```bash
git add src/compiler.ts
git commit -m "feat: update compiler for Spec-Kit fields and commands"
```
