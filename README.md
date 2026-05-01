# Prompt Crafter

Prompt Crafter is a **node-based prompt compiler** built with React + TypeScript.
You compose prompt instructions visually as a directed graph, and the app compiles that graph into structured system instructions (XML by default), with audit metrics and warnings.

This README explains the **actual current implementation** in this repository (not an aspirational roadmap).

---

## What this app does

At a high level:

1. You drag prompt nodes (Domain, Role, Mission, Guardrails, Smart processors, etc.) onto a canvas.
2. You connect nodes to define execution/assembly order.
3. The compiler converts enabled nodes into structured XML blocks.
4. The output panel shows:
   - compiled prompt text,
   - audit stats (word count, active nodes, RAM chars, CoT on/off, safety flag),
   - warnings (missing required nodes, safety flags, length checks).
5. You can copy output as XML / Markdown / JSON / plain text.
6. You can save/import/export workflows, share via URL hash, and test prompts against an OpenAI-compatible API.

---

## Current feature set (implemented now)

### Visual prompt graph editor

- Built on `@xyflow/react` (React Flow).
- Custom node type: `promptNode`.
- Drag from sidebar or click to add nodes.
- Connect nodes with animated edges.
- Per-node controls:
  - enable/disable node,
  - remove node,
  - edit text content (except logic toggle node).

### Node libraries

- **Core nodes**: domain, role, context RAM, mission/goal, guardrail, logic/reasoning, format.
- **Domain library nodes**: web, AI/automation, security/devops, data science/ML, writing/content, marketing.
- **Smart nodes**: refiner, validator, ReAct pattern, few-shot injector, JSON schema output.
- **Custom nodes**:
  - create in-app,
  - import/export as node packs,
  - persist in localStorage.

### Templates

Starter templates currently included:

- Customer Support Bot
- Code Review Assistant
- RAG Research Assistant
- Marketing Copy Generator

Selecting a template replaces current canvas content.

### Compiler + output formats

- Compiler entry point: `src/compiler.ts` (`compile(nodes, edges)`).
- Advanced envelope API: `compileEnvelope(nodes, edges)` for structured COMPILE-mode JSON output.
- Produces XML wrapped in `<system_instructions>...</system_instructions>`.
- Output can be converted to:
  - XML,
  - Markdown,
  - JSON,
  - plain text.

### Validation and warnings

- Required checks for enabled canvas nodes:
  - domain (or any enabled domain-library node),
  - role,
  - mission_goal.
- Safety pattern scan (keyword-based) over enabled node content.
- On safety hits, offending text is redacted and a guardrail block is injected near the top of compiled output.
- Word-count warning when compiled body exceeds 300 words (excluding RAM content).
- Optional validator node (`SMART-02`) adds explicit validator flags.
- Warnings are structured (`code`, `severity`, `message`, `node_id`) and shown in the output panel.

### Versioning / snapshots

- Local snapshots of nodes + edges + compiled XML.
- Auto-snapshot when opening output panel with non-empty canvas.
- Manual save, restore, delete.
- Max stored versions: 30.

### Import / export / share

- Export workflow JSON (`kind: "workflow"`).
- Import workflow JSON.
- Export custom nodes JSON (`kind: "node-pack"`).
- Import node pack JSON (duplicates skipped by `nodeType`).
- Share current workflow through URL hash encoding (`#share=...`).
- On load, app auto-imports valid shared hash, then clears hash from URL.

### Prompt test panel (live API call)

- Uses compiled XML as **system message**.
- Sends chat requests to an OpenAI-compatible endpoint (`/chat/completions`).
- Configurable in UI:
  - base URL,
  - model id,
  - API key.
- Settings are stored locally in browser localStorage.

### Prompt advisor (ADVISE mode)

- Built-in advisor (`src/advisor.ts`) analyzes compiled XML against prompt-engineering heuristics.
- Output panel now shows an advisor score and top actionable issues.
- Advisor report includes missing-node suggestions and targeted rewrites.

---

## How compilation actually works

Core compiler flow in `src/compiler.ts`:

1. **Filter enabled nodes**.
2. **Run required-node checks** on enabled nodes.
3. **Run safety scan** against unsafe regex patterns.
4. **Detect post-processors**:
   - `SMART-01` refiner,
   - `SMART-02` validator.
5. **Sort nodes by graph order** using topological sort (Kahn algorithm):
   - respects edge dependency order,
   - stable for zero in-degree nodes,
   - cycle members are appended (not dropped).
6. **Compile each node** into a typed XML block.
7. **Apply tone conversion post-pass** if `SMART-01` is enabled.
8. **Compute audit metrics** and generate warnings.

Audit now includes:

- `qualityScore` (0–100)
- `completenessScore` (0–100)
- `specificityScore` (0–100)
- `safetyFlag` (boolean)

### Node-to-XML mapping (key examples)

- `domain` → `<domain_context>`
- `role` → `<role_identity>`
- `mission_goal` → `<task_objective>`
- `context_ram` → `<technical_memory>`
- `guardrail` → `<guardrail>`
- `format` → `<output_blueprint>`
- `logic_reasoning` (toggled on) → `<reasoning_directive>` (fixed instruction body)
- `SMART-04` → `<examples>`
- `SMART-05` → `<output_schema>`
- domain-library items → `<domain_rule ...>`
- custom items → `<custom_block ...>`

### Tone conversion behavior

The app replaces aggressive instruction phrases with calmer alternatives (regex map) both:

- at per-node compilation time for many blocks, and
- globally on final XML when `SMART-01` is active.

---

## Architecture overview

### Tech stack

- React 18 + TypeScript
- Vite 5
- Zustand (global app state)
- React Flow (`@xyflow/react`) for canvas/graph UX
- Tailwind CSS (via Vite plugin)

### Main modules

- `src/store.ts`
  - central Zustand store,
  - node/edge mutations,
  - custom palette persistence,
  - version history persistence,
  - workflow loading and ID remapping.

- `src/components/templates/AppLayout.tsx`
  - top-level UI composition,
  - canvas + sidebar + output panel + history + test panel,
  - initial shared-hash import.

- `src/compiler.ts`
  - graph-aware prompt compilation,
  - warnings and audit metadata.

- `src/formatConverter.ts`
  - XML converters to Markdown/JSON/plain text.

- `src/templates.ts`
  - starter templates and instantiation logic.

- `src/shareUrl.ts`
  - URL hash serialization/deserialization for sharing.

- `src/components/organisms/TestPanel.tsx`
  - API settings UI,
  - chat request/response loop against OpenAI-compatible endpoint.

### State and persistence

Persisted localStorage keys:

- `prompt-crafter:custom-nodes`
- `prompt-crafter:versions`
- `prompt-crafter:api-settings`

Data stored in browser only (no server in this repo).

---

## Security notes (current behavior)

- JSON imports use a custom reviver that strips `__proto__`, `constructor`, and `prototype` keys to reduce prototype-pollution risk.
- Shared URL hash decoding enforces a max encoded length to avoid oversized payload freezes.
- API base URL validation allows:
  - `https://` for normal endpoints,
  - `http://` only for localhost/loopback.

Important: API keys are stored in localStorage and used client-side. For production use in hostile environments, a server-side proxy pattern is usually safer.

---

## Known limitations / current state gaps

This is what is currently true in the codebase:

- No backend service in this repository.
- No user auth / multi-user collaboration.
- No automated test suite included yet.
- Compiler safety checks are heuristic regex checks, not a full policy engine.
- URL sharing keeps full workflow in hash; very large graphs can produce large URLs.
- Workflow and node-pack schema validation is basic (shape checks, not strict schema library).

---

## Run locally

Requirements:

- Node.js 18+
- npm

Install and start:

```bash
npm install
npm run dev
```

Other scripts:

```bash
npm run build
npm run preview
npm run lint
```

---

## Typical usage walkthrough

1. Add `Domain`, `Role`, and `Mission / Goal` nodes.
2. Fill their content.
3. Add optional guardrails, format node, and domain/smart nodes.
4. Connect nodes in desired order.
5. Click **Compile Prompt** (or `Ctrl+Enter`).
6. Review warnings + audit stats.
7. Copy output in desired format.
8. Optionally test in the **Test Prompt** panel with your API key.
9. Save a snapshot or export/share workflow.

---

## File map (quick orientation)

- `src/components/organisms/Sidebar.tsx` — palette, search, compile action
- `src/components/organisms/PromptNode.tsx` — node UI/editor
- `src/components/organisms/Toolbar.tsx` — templates/history/share/import/export controls
- `src/components/organisms/OutputPanel.tsx` — compiled output and format conversion
- `src/components/organisms/VersionHistoryPanel.tsx` — snapshots
- `src/components/organisms/TestPanel.tsx` — runtime prompt testing
- `src/presets.ts` — built-in palette + role presets
- `src/types.ts` — shared domain types

---

## License and source notes

Role presets include material inspired by:

- `f/awesome-chatgpt-prompts` (CC0 1.0)
- `mustvlad/ChatGPT-System-Prompts` (MIT)

See comments in `src/presets.ts`.

