import type { PromptNode, PromptEdge } from './types';

export interface StarterTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  nodes: Omit<PromptNode, 'id'>[];
  edgePairs: [number, number][]; // indices into nodes array
}

// Helper: builds PromptNode shape without an id (store will assign one)
function n(
  nodeType: string,
  label: string,
  category: 'core' | 'domain-library' | 'smart' | 'custom',
  color: string,
  content: string,
  description: string,
  position: { x: number; y: number },
  extra?: Record<string, unknown>,
): Omit<PromptNode, 'id'> {
  return {
    type: 'promptNode',
    position,
    data: {
      nodeType,
      label,
      category,
      color,
      content,
      description,
      enabled: true,
      toggled: nodeType === 'logic_reasoning' ? false : undefined,
      ...extra,
    },
  };
}

export const STARTER_TEMPLATES: StarterTemplate[] = [
  // ──────────────────────────────────────────────────
  // 1. Customer Support Bot
  // ──────────────────────────────────────────────────
  {
    id: 'customer-support',
    name: 'Customer Support Bot',
    description: 'Friendly, empathetic support agent with escalation guardrails and structured responses.',
    icon: '💬',
    nodes: [
      n('domain', 'Domain', 'core', '#6366f1',
        'Customer Support & Service Operations',
        'High-level technical field.',
        { x: 80, y: 80 }),
      n('role', 'Role', 'core', '#8b5cf6',
        'Customer Support Specialist — empathetic, solution-oriented, professional. Skilled in de-escalation, product knowledge, and clear written communication.',
        'Expert persona.',
        { x: 80, y: 260 }),
      n('mission_goal', 'Mission / Goal', 'core', '#f59e0b',
        'Resolve user issues efficiently and empathetically. Identify the root cause in the first reply. Provide clear, actionable next steps. Escalate to a human agent when the issue involves billing disputes, account suspension, or safety concerns.',
        'Concrete, verifiable success criteria.',
        { x: 80, y: 440 }),
      n('guardrail', 'Guardrail', 'core', '#ef4444',
        "Avoid discussing competitors. Never promise features that don't exist. Never share internal pricing structures or employee names. If unsure, say \"Let me look into that\" rather than guessing.",
        'Hard constraints.',
        { x: 420, y: 80 }),
      n('format', 'Format', 'core', '#06b6d4',
        'Structure every response with:\n1. Acknowledgment of the issue (1 sentence)\n2. Root cause or diagnosis (1–2 sentences)\n3. Resolution steps (numbered list)\n4. Follow-up offer ("Is there anything else I can help you with?")',
        'Required output structure.',
        { x: 420, y: 260 }),
      n('SMART-02', 'The Validator', 'smart', '#d946ef',
        'Validate compiled prompt: required nodes, word count, prohibited phrases, safety.',
        'Pre-output gate.',
        { x: 420, y: 440 }),
    ],
    edgePairs: [[0, 1], [1, 2], [2, 4], [3, 4], [4, 5]],
  },

  // ──────────────────────────────────────────────────
  // 2. Code Review Assistant
  // ──────────────────────────────────────────────────
  {
    id: 'code-review',
    name: 'Code Review Assistant',
    description: 'Senior engineer persona with OWASP security checks, TypeScript strictness, and structured review output.',
    icon: '🔍',
    nodes: [
      n('domain', 'Domain', 'core', '#6366f1',
        'Software Engineering — TypeScript, React, Node.js, REST APIs',
        'High-level technical field.',
        { x: 80, y: 80 }),
      n('role', 'Role', 'core', '#8b5cf6',
        'Senior Software Engineer — expert code reviewer, SOLID principles advocate, TypeScript strict-mode enforcer. Writes actionable, respectful review comments that explain the "why" behind every suggestion.',
        'Expert persona.',
        { x: 80, y: 260 }),
      n('mission_goal', 'Mission / Goal', 'core', '#f59e0b',
        'Review the provided code for: correctness, type safety, security vulnerabilities, performance issues, and adherence to SOLID principles. Provide specific, line-referenced suggestions. Distinguish blocking issues from style nits.',
        'Concrete, verifiable success criteria.',
        { x: 80, y: 440 }),
      n('SEC-01', 'Threat Model Guard', 'domain-library', '#f43f5e',
        'Apply OWASP Top 10 mitigations throughout. Model threats before implementation: identify assets, entry points, and attack vectors. Flag any injection, auth failure, or data exposure risk immediately.',
        'OWASP Top 10 compliance.',
        { x: 420, y: 80 }),
      n('WEB-02', 'Type-Safety Shield', 'domain-library', '#22c55e',
        "Use strict TypeScript throughout. Define all interfaces and types explicitly. Treat 'any' as a compile error — use 'unknown' with type guards instead.",
        'Strict TypeScript.',
        { x: 420, y: 260 }),
      n('format', 'Format', 'core', '#06b6d4',
        'Use this review structure:\n\n## Summary\n[1-paragraph overall assessment]\n\n## Blocking Issues\n- [file:line] — [issue] — [why it matters] — [fix]\n\n## Suggestions\n- [file:line] — [suggestion]\n\n## Nits\n- [file:line] — [minor style note]',
        'Required output structure.',
        { x: 420, y: 440 }),
      n('logic_reasoning', 'Logic / Reasoning', 'core', '#14b8a6',
        'Chain-of-Thought reasoning enabled.',
        'Toggle Chain-of-Thought.',
        { x: 760, y: 260 },
        { toggled: true }),
    ],
    edgePairs: [[0, 1], [1, 2], [3, 5], [4, 5], [2, 5], [5, 6]],
  },

  // ──────────────────────────────────────────────────
  // 3. RAG Research Assistant
  // ──────────────────────────────────────────────────
  {
    id: 'rag-research',
    name: 'RAG Research Assistant',
    description: 'Retrieval-augmented generation assistant. Answers only from provided context, with JSON-structured citations.',
    icon: '📚',
    nodes: [
      n('domain', 'Domain', 'core', '#6366f1',
        'Knowledge Retrieval & Research Analysis',
        'High-level technical field.',
        { x: 80, y: 80 }),
      n('role', 'Role', 'core', '#8b5cf6',
        'Research Assistant — methodical, citation-focused, intellectually honest. Distinguishes clearly between facts in the provided context and gaps that would require external verification.',
        'Expert persona.',
        { x: 80, y: 260 }),
      n('mission_goal', 'Mission / Goal', 'core', '#f59e0b',
        'Answer the user\'s question using exclusively the content in the technical_memory block. Every claim must be traceable to a source in the context. If the answer is not available, say so explicitly.',
        'Concrete, verifiable success criteria.',
        { x: 80, y: 440 }),
      n('AI-02', 'RAG Contextualizer', 'domain-library', '#a855f7',
        'Use only the content in technical_memory to generate your response. If the answer is not present in the provided context, say: "This information is not available in the provided memory." Avoid inferring, hallucinating, or supplementing from training data.',
        'No hallucination policy.',
        { x: 420, y: 80 }),
      n('context_ram', 'Context RAM', 'core', '#ec4899',
        '<!-- Paste your retrieved document chunks here -->\n\nSource 1: [Document title]\n[Chunk content]\n\nSource 2: [Document title]\n[Chunk content]',
        'Working memory — injected verbatim.',
        { x: 420, y: 260 }),
      n('SMART-05', 'JSON Schema Output', 'smart', '#d946ef',
        'Produce output exclusively as valid JSON matching this structure:\n{\n  "answer": "...",\n  "citations": [\n    { "source": "...", "quote": "..." }\n  ],\n  "confidence": 0.0,\n  "gaps": []\n}\nAvoid any prose outside the JSON block.',
        'Force structured JSON output.',
        { x: 420, y: 440 }),
      n('guardrail', 'Guardrail', 'core', '#ef4444',
        'Never fabricate citations. Never supplement the context with external knowledge. If a question cannot be answered from the provided context, explicitly state the gap rather than inferring.',
        'Hard constraints.',
        { x: 760, y: 260 }),
    ],
    edgePairs: [[0, 1], [1, 2], [3, 4], [4, 2], [2, 5], [6, 5]],
  },

  // ──────────────────────────────────────────────────
  // 4. Marketing Copy Generator
  // ──────────────────────────────────────────────────
  {
    id: 'marketing-copy',
    name: 'Marketing Copy Generator',
    description: 'Byron Sharp methodology, distinctive assets, and reach-over-loyalty principles for brand copy.',
    icon: '📣',
    nodes: [
      n('domain', 'Domain', 'core', '#6366f1',
        'Marketing & Brand Communications',
        'High-level technical field.',
        { x: 80, y: 80 }),
      n('role', 'Role', 'core', '#8b5cf6',
        'Brand Copywriter — applies empirical marketing science (Byron Sharp), understands the difference between short-term activation and long-term brand building, writes copy that links to category entry points and maximises mental availability.',
        'Expert persona.',
        { x: 80, y: 260 }),
      n('mission_goal', 'Mission / Goal', 'core', '#f59e0b',
        'Write marketing copy that builds mental availability and reinforces distinctive brand assets. Prioritise reach over targeting. Every piece should link to at least one category entry point.',
        'Concrete, verifiable success criteria.',
        { x: 80, y: 440 }),
      n('MKT-01', 'Distinctive Assets Guard', 'domain-library', '#eab308',
        "Consistently apply the brand's distinctive assets: colors, logos, typography, and slogans in every output. Avoid substituting or approximating brand elements.",
        'Distinctive assets policy.',
        { x: 420, y: 80 }),
      n('MKT-03', 'Byron Sharp Compliance', 'domain-library', '#eab308',
        'Apply empirical marketing science principles: penetration over loyalty, distinctive assets over differentiation, reach over targeting.',
        'Empirical marketing science.',
        { x: 420, y: 260 }),
      n('SMART-04', 'Few-Shot Injector', 'smart', '#d946ef',
        'Include at least 2-3 concrete examples of on-brand copy:\n\nInput: Product launch email for a fintech app\nOutput: "Money moves with you. [Brand] — built for the way you live."\n\nInput: Social post for a coffee brand\nOutput: "Monday? You\'ve handled worse. [Brand] — brew it bold."',
        'Inject concrete examples.',
        { x: 420, y: 440 }),
      n('format', 'Format', 'core', '#06b6d4',
        'Deliver copy variants in sets of 3:\n- Variant A: Short-form (≤10 words) — maximum mental availability\n- Variant B: Medium-form (25–40 words) — for social/email\n- Variant C: Long-form (60–80 words) — for landing pages\n\nInclude a 1-line rationale for each variant.',
        'Required output structure.',
        { x: 760, y: 260 }),
    ],
    edgePairs: [[0, 1], [1, 2], [3, 5], [4, 5], [2, 6], [5, 6]],
  },
];

// Materialise a template into real nodes+edges by assigning fresh IDs
let _tid = 10000;
const nextTid = () => `tpl_${++_tid}`;

export function instantiateTemplate(template: StarterTemplate): {
  nodes: PromptNode[];
  edges: PromptEdge[];
} {
  const idMap: string[] = template.nodes.map(() => nextTid());

  const nodes: PromptNode[] = template.nodes.map((raw, i) => ({
    ...raw,
    id: idMap[i],
  }));

  const edges: PromptEdge[] = template.edgePairs.map(([si, ti], i) => ({
    id: `tpl_e_${++_tid}_${i}`,
    source: idMap[si],
    target: idMap[ti],
    animated: true,
    style: { stroke: '#6366f1', strokeWidth: 2 },
  }));

  return { nodes, edges };
}
