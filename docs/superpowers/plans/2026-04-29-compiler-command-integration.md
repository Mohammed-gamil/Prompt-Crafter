# Task 4: Compiler & Command Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the compiler to support Spec-Kit fields and commands by producing structured XML blocks for nodes with defined fields.

**Architecture:** Modify `nodeToBlock` in `src/compiler.ts` to detect `fields` in `PromptNodeData`. If present, it will generate a `<speckit_phase>` block instead of falling back to default text-based blocks.

**Tech Stack:** TypeScript, React (for context), Vite (for build).

---

### Task 1: Update `nodeToBlock` in `src/compiler.ts`

**Files:**
- Modify: `src/compiler.ts`

- [ ] **Step 1: Update `nodeToBlock` to handle `fields` and `commandTrigger`**

```typescript
function nodeToBlock(node: PromptNode): string | null {
  const c   = txt(node);
  const nt  = node.data.nodeType as string;
  const cat = node.data.category as string;
  const lbl = esc((node.data.label as string).trim());
  const fields = node.data.fields as any[]; // Use any[] temporarily or import NodeField
  const command = node.data.commandTrigger as string | undefined;

  // New Spec-Kit fields logic
  if (fields && fields.length > 0) {
    const fieldBlocks = fields
      .map((f) => {
        const val = f.value ? esc(applyToneConversion(String(f.value).trim())) : '';
        const fid = esc(f.id);
        return `    <${fid}>\n      ${val}\n    </${fid}>`;
      })
      .join('\n');

    const cmdAttr = command ? ` command="${esc(command)}"` : '';
    return `  <speckit_phase type="${nt}" label="${lbl}"${cmdAttr}>\n${fieldBlocks}\n  </speckit_phase>`;
  }

  // ... existing switch statement ...
}
```

- [ ] **Step 2: Ensure `NodeField` is imported if needed (it is in `src/types.ts`)**

- [ ] **Step 3: Verify the implementation visually and through a build**

Run: `npm run build`
Expected: SUCCESS

- [ ] **Step 4: Commit changes**

```bash
git add src/compiler.ts
git commit -m "feat: update compiler for Spec-Kit fields and commands"
```

---

### Task 2: Verification

- [ ] **Step 1: Check if `nodeToBlock` correctly escapes field IDs and values**
- [ ] **Step 2: Confirm `commandTrigger` is included when present**
- [ ] **Step 3: Ensure fallback logic still works for nodes without fields**
