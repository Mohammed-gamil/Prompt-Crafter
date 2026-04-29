# Spec-Kit & ComfyUI Integration - Design Spec

## 1. Overview
Transform the "Prompt Crafter" from a linear prompt assembler into a **Master World-Class Prompt Engineering Tool**. This transition involves adopting the **GitHub Spec-Kit** methodology and a **ComfyUI-inspired** node-based logic flow.

## 2. Core Concepts

### 2.1 The Spec-Kit Methodology
We are integrating the 4 pillars of Spec-Driven Development (SDD):
- **Constitution (`/constitution`)**: Global project rules, tech stack, and safety standards.
- **Specify (`/specify`)**: Functional requirements, user stories, and acceptance criteria.
- **Plan (`/plan`)**: Technical architecture, data models, and implementation strategy.
- **Tasks (`/tasks`)**: Granular, executable checklist for the AI agent.

## 2. The Laws of Wiring (Typed Resource Registry)

To achieve world-class precision, the canvas is governed by a strict Type System. Every Port on every Node is assigned a **Resource Type**. 

### 2.1 Resource Type Definitions
Wires can only carry specific "flavors" of data. Connecting mismatched ports is physically impossible in the UI.

| Resource Type | Data Contract | Example Nodes |
| :--- | :--- | :--- |
| `RULES` | Global constraints & Tech Stack | `/constitution`, Guardrails |
| `SPECS` | Functional/User Requirements | `/specify`, User Stories |
| `ARCH` | Technical design & Data Models | `/plan`, API Design |
| `TASKS` | Atomic implementation steps | `/tasks`, Checklist |
| `CONTEXT` | Raw data, RAM, and external info | Context RAM, Docs |
| `FORMAT` | Structural output instructions | Format Node, JSON Schema |

### 2.2 Port Validation Algorithm
The `onConnect` handler in `src/store.ts` will implement the **Resource Compatibility Matrix**:

- **Exact Match**: `ARCH` -> `ARCH` (Pass)
- **Sub-Type Inheritance**: `RULES` is a "Master Type" and can be plugged into any `RULES_IN` port.
- **Explicit Casting**: A special `TRANSFORM` node is required to turn a `SPEC` into an `ARCH` (this is the function of the `/PLAN` node).
- **Strict Blocking**: You cannot plug `TASKS` into `RULES`.

### 2.3 Visual Enforcement
- **Color Coding**: Ports and Wires change color based on the type (e.g., `SPECS` are Blue, `ARCH` is Green, `RULES` is Gold).
- **Port Shapes**: Different port types will have distinct shapes (Circle, Square, Triangle) to provide immediate visual feedback on compatibility.
- **Active Highlighting**: When dragging a wire, only compatible input ports will "light up" on the canvas.


### 2.3 Spec-Kit Command Integration
The tool will not only generate text but also serve as a "Command Center" for Spec-Kit.
- **Node-to-Command Mapping**: Each core Spec-Kit node will have an associated "Command Trigger" (e.g., the `/PLAN` node generates output prefixed with `/speckit.plan`).
- **Phase Syncing**: When a node is compiled, it includes the necessary metadata to inform an AI Agent (like Claude Code or Gemini CLI) that it should transition to that specific Spec-Kit phase.
- **Interactive Command Execution**: The UI will include a "Copy Command" shortcut on each node to quickly trigger that phase in an external agent.

## 3. Technical Design

### 3.1 Data Model Updates (`src/types.ts`)
We need to expand `PromptNodeData` to support "Mini-Workspace" nodes and Command Triggers.

```typescript
export interface NodeField {
  id: string;
  label: string;
  value: string;
  type: 'text' | 'textarea' | 'list';
}

export interface PromptNodeData {
  // ... existing fields ...
  fields?: NodeField[]; // New: For complex nodes like /PLAN
  commandTrigger?: string; // New: e.g., "/speckit.plan"
  portType?: {
    in?: string[];
    out?: string[];
  };
}
```

### 3.2 UI/UX: The "Master" Aesthetic
- **ComfyUI Wires**: Animated, glowing edges that "flow" from source to target.
- **Rich Node UI**: Upgrading `PromptNode.tsx` to render a grid of fields for Spec-Kit nodes.
- **Sidebar Overhaul**: Grouping nodes into "Spec-Kit Core", "Prompt Atoms", and "Smart Processors".

### 3.3 The Connecting Algorithm (`src/store.ts`)
The `onConnect` handler will be upgraded to check for port compatibility.

```typescript
const onConnect = (connection) => {
  const sourceNode = get().nodes.find(n => n.id === connection.source);
  const targetNode = get().nodes.find(n => n.id === connection.target);
  
  if (!isValidConnection(sourceNode, targetNode)) {
    // Show Toast warning and prevent connection
    return;
  }
  // ... standard addEdge logic ...
}
```

### 3.4 Compiler Evolution (`src/compiler.ts`)
The compiler will be updated to:
1.  **Extract Fields**: Iterate through node fields for structured output.
2.  **Spec-Kit Wrapper**: Produce a "Master Spec" document that mirrors the `.specify/` artifact structure (Markdown/XML hybrid).

## 4. Implementation Plan

### Phase 1: Foundation & Types
- Update `types.ts` with new node types and field structures.
- Define the "Contract" for Spec-Kit nodes in `presets.ts`.

### Phase 2: The Logic Engine
- Implement the `isValidConnection` logic in `store.ts`.
- Add "Logic Guardrail" toast notifications.

### Phase 3: The Rich Node UI
- Refactor `PromptNode.tsx` to support the `fields` array.
- Implement the ComfyUI wire styling in `index.css` or `App.css`.

### Phase 4: Compiler & Output
- Update `compiler.ts` to handle the new rich nodes.
- Create a new "Master Spec" output format.

## 5. Success Criteria
- [ ] Users can build a full Spec-Kit chain (Constitution -> Specify -> Plan -> Tasks).
- [ ] Attempting to connect incompatible nodes results in a clear logic warning.
- [ ] The UI feels like a professional engineering tool (dark, high-signal, interactive).
- [ ] The compiled output is a structured specification ready for an AI Agent.
