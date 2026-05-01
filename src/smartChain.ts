import { compile } from './compiler';
import type { PromptEdge, PromptNode } from './types';

type Severity = 'error' | 'warning' | 'info';
type Priority = 'critical' | 'high' | 'medium' | 'low';
type PatternMatch = 'STANDARD' | 'MINIMAL' | 'FULL' | 'CUSTOM' | 'BROKEN';

interface ChainViolation {
  rule: string;
  severity: Severity;
  node_id: string | null;
  message: string;
  fix_hint: string;
}

interface ValidateResult {
  valid: boolean;
  violations: ChainViolation[];
  quality_score: number;
  chain_pattern_match: PatternMatch;
}

interface ChainSuggestion {
  node_type: string;
  reason: string;
  quality_delta: number;
  priority: Priority;
  placement: string;
}

interface SuggestResult {
  current_quality: number;
  suggestions: ChainSuggestion[];
}

interface RepairItem {
  rule: string;
  action: 'ADD' | 'REORDER' | 'DISCONNECT' | 'CONNECT';
  node_type?: string;
  node_id?: string;
  default_content?: string;
  position?: string;
  moved_from?: string;
  moved_to?: string;
  reason: string;
}

interface RepairResult {
  repairs_applied: RepairItem[];
  quality_before: number;
  quality_after: number;
  repaired_graph: {
    nodes: PromptNode[];
    edges: PromptEdge[];
  };
}

function isEnabled(node: PromptNode): boolean {
  const state = node.data.state ?? (node.data.enabled ? 'active' : 'muted');
  return state !== 'muted';
}

function nodeType(node: PromptNode): string {
  return String(node.data.nodeType);
}

function isDomain(node: PromptNode): boolean {
  return nodeType(node) === 'domain';
}

function isRole(node: PromptNode): boolean {
  return nodeType(node) === 'role';
}

function isMission(node: PromptNode): boolean {
  return nodeType(node) === 'mission_goal';
}

function isGuardrail(node: PromptNode): boolean {
  return nodeType(node) === 'guardrail';
}

function isFormat(node: PromptNode): boolean {
  return nodeType(node) === 'format';
}

function isLogic(node: PromptNode): boolean {
  return nodeType(node) === 'logic_reasoning';
}

function isContextRam(node: PromptNode): boolean {
  return nodeType(node) === 'context_ram';
}

function isSmart01or02(node: PromptNode): boolean {
  return nodeType(node) === 'SMART-01' || nodeType(node) === 'SMART-02';
}

function isSmart04(node: PromptNode): boolean {
  return nodeType(node) === 'SMART-04';
}

function isSmart05(node: PromptNode): boolean {
  return nodeType(node) === 'SMART-05';
}

function isDomainRule(node: PromptNode): boolean {
  return node.data.category === 'domain-library';
}

function topo(nodes: PromptNode[], edges: PromptEdge[]): { order: PromptNode[]; hasCycle: boolean } {
  const enabledNodes = nodes.filter(isEnabled);
  const idSet = new Set(enabledNodes.map((n) => n.id));
  const indeg = new Map(enabledNodes.map((n) => [n.id, 0]));
  const adj = new Map(enabledNodes.map((n) => [n.id, [] as string[]]));

  for (const e of edges) {
    if (!idSet.has(e.source) || !idSet.has(e.target)) continue;
    adj.get(e.source)!.push(e.target);
    indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1);
  }

  const q = enabledNodes.filter((n) => (indeg.get(n.id) ?? 0) === 0);
  const out: PromptNode[] = [];
  const byId = new Map(enabledNodes.map((n) => [n.id, n]));

  while (q.length > 0) {
    const n = q.shift()!;
    out.push(n);
    for (const t of adj.get(n.id) ?? []) {
      const d = (indeg.get(t) ?? 1) - 1;
      indeg.set(t, d);
      if (d === 0 && byId.has(t)) q.push(byId.get(t)!);
    }
  }

  const hasCycle = out.length !== enabledNodes.length;
  if (hasCycle) {
    const inOut = new Set(out.map((n) => n.id));
    for (const n of enabledNodes) if (!inOut.has(n.id)) out.push(n);
  }

  return { order: out, hasCycle };
}

function orderIndex(order: PromptNode[]): Map<string, number> {
  return new Map(order.map((n, i) => [n.id, i]));
}

function hasAny(nodes: PromptNode[], predicate: (n: PromptNode) => boolean): boolean {
  return nodes.some((n) => isEnabled(n) && predicate(n));
}

function mkViolation(rule: string, severity: Severity, nodeId: string | null, message: string, fixHint: string): ChainViolation {
  return { rule, severity, node_id: nodeId, message, fix_hint: fixHint };
}

function detectPattern(enabled: PromptNode[], idx: Map<string, number>): PatternMatch {
  const domain = enabled.find(isDomain);
  const role = enabled.find(isRole);
  const mission = enabled.find(isMission);
  const format = enabled.find(isFormat);
  const guardrail = enabled.find(isGuardrail);
  const logic = enabled.find(isLogic);
  const hasDomainRules = enabled.some(isDomainRule);
  const hasSmart04 = enabled.some(isSmart04);
  const hasSmart01 = enabled.some((n) => nodeType(n) === 'SMART-01');
  const hasSmart02 = enabled.some((n) => nodeType(n) === 'SMART-02');

  if (!domain || !role || !mission) return 'BROKEN';
  if (!format) return 'CUSTOM';

  const isOrdered = (a?: PromptNode, b?: PromptNode) => (a && b ? (idx.get(a.id) ?? 0) <= (idx.get(b.id) ?? 0) : true);

  if (
    domain && role && mission && format &&
    isOrdered(domain, role) && isOrdered(role, mission) && isOrdered(mission, format) &&
    !guardrail && !logic && !hasDomainRules
  ) {
    return 'MINIMAL';
  }

  if (
    domain && role && mission && guardrail && logic && format &&
    isOrdered(domain, role) && isOrdered(role, mission) && isOrdered(mission, guardrail) && isOrdered(guardrail, logic) && isOrdered(logic, format)
  ) {
    if (hasDomainRules && hasSmart04 && hasSmart01 && hasSmart02) return 'FULL';
    return 'STANDARD';
  }

  return 'CUSTOM';
}

export function validateChain(nodes: PromptNode[], edges: PromptEdge[]): ValidateResult {
  const enabled = nodes.filter(isEnabled);
  const { order, hasCycle } = topo(enabled, edges);
  const idx = orderIndex(order);
  const violations: ChainViolation[] = [];

  const hasDomain = hasAny(enabled, isDomain);
  const hasRole = hasAny(enabled, isRole);
  const hasMission = hasAny(enabled, isMission);
  const hasGuardrail = hasAny(enabled, isGuardrail);
  const hasFormat = hasAny(enabled, isFormat);

  // C-01 Anchor rule
  if (order.length > 0 && !(isDomain(order[0]) || isRole(order[0]))) {
    violations.push(
      mkViolation(
        'C-01',
        'error',
        order[0].id,
        'Chain has no anchor. Add a Domain or Role node first — the AI needs to know who it is before it can do anything.',
        'Move Domain or Role to the beginning of the chain.',
      ),
    );
  }

  // C-02 orphaned domain rules
  if (!hasDomain) {
    for (const n of enabled.filter(isDomainRule)) {
      violations.push(
        mkViolation(
          'C-02',
          'warning',
          n.id,
          `Domain Rule "${String(n.data.label)}" has no parent Domain node. Add a Domain node to give this rule its context.`,
          'Add a Domain node and connect it upstream of domain rules.',
        ),
      );
    }
  }

  // C-03 actor rule
  if (hasMission && !hasRole) {
    const m = enabled.find(isMission) ?? null;
    violations.push(
      mkViolation(
        'C-03',
        'warning',
        m?.id ?? null,
        'Mission/Goal exists but no Role is defined. Who should carry out this objective?',
        'Add a Role node before Mission/Goal.',
      ),
    );
  }
  if (hasMission && !hasDomain) {
    const m = enabled.find(isMission) ?? null;
    violations.push(
      mkViolation(
        'C-03',
        'warning',
        m?.id ?? null,
        'Mission/Goal exists but no Domain is defined. The task scope is unclear.',
        'Add a Domain node before Mission/Goal.',
      ),
    );
  }

  // C-04 guardrail position
  const missionNode = order.find(isMission);
  const missionPos = missionNode ? (idx.get(missionNode.id) ?? -1) : -1;
  for (const g of order.filter(isGuardrail)) {
    const gp = idx.get(g.id) ?? -1;
    if (missionPos < 0 || gp < missionPos) {
      violations.push(
        mkViolation(
          'C-04',
          'warning',
          g.id,
          'Guardrail appears before Mission/Goal. Guardrails bound behavior relative to an objective — define the mission first.',
          'Move Guardrail to appear after Mission/Goal.',
        ),
      );
    }
  }

  // C-05 smart guard
  if (!hasGuardrail) {
    for (const s of order.filter(isSmart01or02)) {
      violations.push(
        mkViolation(
          'C-05',
          'error',
          s.id,
          `SMART processor "${s.id}" is active with no Guardrail. Add a Guardrail node before enabling post-processors.`,
          'Add and connect a Guardrail node before SMART-01/SMART-02.',
        ),
      );
    }
  }

  // C-06 format last + after anchors
  const formatNode = order.find(isFormat);
  if (formatNode) {
    const fp = idx.get(formatNode.id) ?? -1;
    const rolePos = order.find(isRole) ? (idx.get(order.find(isRole)!.id) ?? -1) : -1;
    const domainPos = order.find(isDomain) ? (idx.get(order.find(isDomain)!.id) ?? -1) : -1;
    if (rolePos < 0 || domainPos < 0 || missionPos < 0 || fp < rolePos || fp < domainPos || fp < missionPos) {
      violations.push(
        mkViolation(
          'C-06',
          'warning',
          formatNode.id,
          'Format node is placed before core identity/objective nodes. Format defines HOW to respond — define WHO and WHAT first.',
          'Move Format after Domain, Role, and Mission/Goal.',
        ),
      );
    }

    const contentAfterFormat = order.find((n) => {
      const p = idx.get(n.id) ?? -1;
      const t = nodeType(n);
      const isTerminalSmart = t === 'SMART-01' || t === 'SMART-02';
      return p > fp && !isTerminalSmart;
    });

    if (contentAfterFormat) {
      violations.push(
        mkViolation(
          'C-06',
          'warning',
          contentAfterFormat.id,
          'A content node appears after Format. Format should be the last content node before compilation.',
          'Move downstream content nodes before Format.',
        ),
      );
    }
  }

  // C-07 logic position
  for (const l of order.filter(isLogic)) {
    const lp = idx.get(l.id) ?? -1;
    const fp = formatNode ? (idx.get(formatNode.id) ?? Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER;
    if (missionPos < 0 || lp < missionPos || lp > fp) {
      violations.push(
        mkViolation(
          'C-07',
          'warning',
          l.id,
          'Logic/Reasoning node should come after Mission and before Format. Reasoning applies to an objective — reorder your chain.',
          'Move Logic/Reasoning between Mission/Goal and Format.',
        ),
      );
    }
  }

  // C-08 schema redundancy
  if (!hasFormat) {
    for (const s of order.filter(isSmart05)) {
      violations.push(
        mkViolation(
          'C-08',
          'info',
          s.id,
          'SMART-05 schema output is active but no Format node exists. Adding a Format node would give your schema structural context.',
          'Add a Format node downstream of Mission/Goal.',
        ),
      );
    }
  }

  // C-09 context RAM position
  const roleNode = order.find(isRole);
  const rolePos = roleNode ? (idx.get(roleNode.id) ?? -1) : -1;
  for (const r of order.filter(isContextRam)) {
    const rp = idx.get(r.id) ?? -1;
    if (rolePos < 0 || missionPos < 0 || rp < rolePos || rp > missionPos) {
      violations.push(
        mkViolation(
          'C-09',
          'warning',
          r.id,
          'Context RAM should appear after Role and before Mission. Memory context informs the role — not the output format.',
          'Move Context RAM between Role and Mission/Goal.',
        ),
      );
    }
  }

  // C-10 few-shot position
  for (const fs of order.filter(isSmart04)) {
    const sp = idx.get(fs.id) ?? -1;
    const fp = formatNode ? (idx.get(formatNode.id) ?? Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER;
    if (missionPos < 0 || sp < missionPos || sp > fp) {
      violations.push(
        mkViolation(
          'C-10',
          'warning',
          fs.id,
          'Few-Shot examples should come after Mission and before Format. Examples demonstrate HOW to do the task — define the task first.',
          'Move SMART-04 between Mission/Goal and Format.',
        ),
      );
    }
  }

  // C-11 cycles
  if (hasCycle) {
    violations.push(
      mkViolation(
        'C-11',
        'error',
        order[0]?.id ?? null,
        'Cycle detected in chain. A prompt chain must be a one-way flow. Remove one of the cyclic edges.',
        'Disconnect one edge in the cycle to restore DAG flow.',
      ),
    );
  }

  // C-12 isolation
  const enabledIds = new Set(enabled.map((n) => n.id));
  const degree = new Map(enabled.map((n) => [n.id, 0]));
  for (const e of edges) {
    if (!enabledIds.has(e.source) || !enabledIds.has(e.target)) continue;
    degree.set(e.source, (degree.get(e.source) ?? 0) + 1);
    degree.set(e.target, (degree.get(e.target) ?? 0) + 1);
  }
  for (const n of enabled) {
    if ((degree.get(n.id) ?? 0) === 0) {
      violations.push(
        mkViolation(
          'C-12',
          'info',
          n.id,
          `Node "${n.id}" (${nodeType(n)}) is isolated — no connections. Connect it to the chain or it won't affect compilation.`,
          'Connect the node to at least one upstream/downstream neighbor.',
        ),
      );
    }
  }

  const qualityScore = compile(nodes, edges).audit.qualityScore;
  const hasErrors = violations.some((v) => v.severity === 'error');

  return {
    valid: !hasErrors,
    violations,
    quality_score: qualityScore,
    chain_pattern_match: detectPattern(enabled, idx),
  };
}

export function suggestChain(nodes: PromptNode[], edges: PromptEdge[]): SuggestResult {
  const validation = validateChain(nodes, edges);
  const enabled = nodes.filter(isEnabled);
  const hasDomain = hasAny(enabled, isDomain);
  const hasRole = hasAny(enabled, isRole);
  const hasMission = hasAny(enabled, isMission);
  const hasGuardrail = hasAny(enabled, isGuardrail);
  const hasFormat = hasAny(enabled, isFormat);
  const hasSmart04 = hasAny(enabled, isSmart04);
  const hasSmart01 = enabled.some((n) => nodeType(n) === 'SMART-01');
  const hasDomainRules = enabled.some(isDomainRule);
  const hasContextRam = hasAny(enabled, isContextRam);

  const out: ChainSuggestion[] = [];

  const push = (s: ChainSuggestion): void => {
    if (!out.some((x) => x.node_type === s.node_type)) out.push(s);
  };

  if (enabled.length === 0) {
    push({
      node_type: 'domain',
      reason: 'Start with what domain this AI operates in.',
      quality_delta: 20,
      priority: 'critical',
      placement: 'first node',
    });
    push({
      node_type: 'role',
      reason: 'Then define who the AI is in that domain.',
      quality_delta: 20,
      priority: 'critical',
      placement: 'after domain',
    });
  }

  if (hasDomain && !hasRole) {
    push({
      node_type: 'role',
      reason: 'Domain exists, but no actor is defined for executing tasks.',
      quality_delta: 20,
      priority: 'critical',
      placement: 'after domain',
    });
    push({
      node_type: 'context_ram',
      reason: 'Context RAM enriches domain details and improves response relevance.',
      quality_delta: 8,
      priority: 'medium',
      placement: 'after role, before mission_goal',
    });
  }

  if (hasDomain && hasRole && !hasMission) {
    push({
      node_type: 'mission_goal',
      reason: 'Your chain has identity (domain+role) but no objective. The AI does not know what to do.',
      quality_delta: 15,
      priority: 'critical',
      placement: 'after role',
    });
  }

  if (hasDomain && hasRole && hasMission && !hasGuardrail) {
    push({
      node_type: 'guardrail',
      reason: 'Guardrails constrain behavior and are required before safe smart post-processing.',
      quality_delta: 5,
      priority: 'high',
      placement: 'after mission_goal, before logic_reasoning/SMART nodes',
    });
  }

  if (hasDomain && hasRole && hasMission && hasGuardrail && !hasFormat) {
    push({
      node_type: 'format',
      reason: 'Format defines output structure; without it, your chain loses output control.',
      quality_delta: 10,
      priority: 'high',
      placement: 'after mission/guardrail and before SMART-01/SMART-02',
    });
    push({
      node_type: 'logic_reasoning',
      reason: 'Reasoning strategy improves objective execution consistency.',
      quality_delta: 7,
      priority: 'medium',
      placement: 'after mission_goal, before format',
    });
  }

  if (hasFormat && !hasSmart04) {
    push({
      node_type: 'SMART-04',
      reason: 'Few-shot examples anchor behavior and improve output specificity.',
      quality_delta: 5,
      priority: 'medium',
      placement: 'after mission_goal, before format',
    });
  }

  if (hasFormat && !hasSmart01) {
    push({
      node_type: 'SMART-01',
      reason: 'Refiner improves tone and polish in final output.',
      quality_delta: 3,
      priority: 'low',
      placement: 'after format',
    });
  }

  if (hasDomainRules && !hasDomain) {
    push({
      node_type: 'domain',
      reason: 'Domain rules are orphaned without a domain anchor.',
      quality_delta: 20,
      priority: 'critical',
      placement: 'before all domain rules',
    });
  }

  if (hasContextRam && !hasRole) {
    push({
      node_type: 'role',
      reason: 'Context RAM needs an actor context (role) to be meaningful.',
      quality_delta: 20,
      priority: 'critical',
      placement: 'before context_ram',
    });
  }

  if (validation.quality_score < 50 && out.length > 0) {
    out.sort((a, b) => b.quality_delta - a.quality_delta);
    return {
      current_quality: validation.quality_score,
      suggestions: [out[0]],
    };
  }

  const prio = { critical: 0, high: 1, medium: 2, low: 3 } as const;
  out.sort((a, b) => prio[a.priority] - prio[b.priority] || b.quality_delta - a.quality_delta);

  return {
    current_quality: validation.quality_score,
    suggestions: out,
  };
}

let repairIdCounter = 0;
function nextRepairNodeId(prefix: string): string {
  repairIdCounter += 1;
  return `${prefix}_${Date.now()}_${repairIdCounter}`;
}

function addEdgeIfMissing(edges: PromptEdge[], source: string, target: string): PromptEdge[] {
  if (edges.some((e) => e.source === source && e.target === target)) return edges;
  return [
    ...edges,
    {
      id: `repair_e_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      source,
      target,
      animated: true,
      style: { stroke: '#6366f1', strokeWidth: 2 },
    },
  ];
}

export function repairChain(nodes: PromptNode[], edges: PromptEdge[]): RepairResult {
  const qualityBefore = compile(nodes, edges).audit.qualityScore;
  let repairedNodes: PromptNode[] = nodes.map((n) => ({ ...n, data: { ...n.data } }));
  let repairedEdges: PromptEdge[] = edges.map((e) => ({ ...e }));
  const repairs: RepairItem[] = [];

  const hasDomain = repairedNodes.some((n) => isEnabled(n) && isDomain(n));
  const hasRole = repairedNodes.some((n) => isEnabled(n) && isRole(n));
  const hasMission = repairedNodes.some((n) => isEnabled(n) && isMission(n));
  const hasGuardrail = repairedNodes.some((n) => isEnabled(n) && isGuardrail(n));

  const addNode = (
    nodeTypeValue: string,
    label: string,
    description: string,
    content: string,
    position: { x: number; y: number },
  ): PromptNode => {
    const node: PromptNode = {
      id: nextRepairNodeId(nodeTypeValue.toLowerCase()),
      type: 'promptNode',
      position,
      data: {
        nodeType: nodeTypeValue,
        label,
        category: nodeTypeValue.startsWith('SMART') ? 'smart' : 'core',
        description,
        content,
        enabled: true,
        state: 'active',
        color: nodeTypeValue === 'guardrail' ? '#ef4444' : '#6366f1',
      },
    };
    repairedNodes = [...repairedNodes, node];
    return node;
  };

  let domainNode = repairedNodes.find((n) => isEnabled(n) && isDomain(n));
  if (!hasDomain) {
    domainNode = addNode(
      'domain',
      'Domain',
      'High-level technical field.',
      'General AI assistance domain with clear scope boundaries.',
      { x: 120, y: 80 },
    );
    repairs.push({
      rule: 'C-01',
      action: 'ADD',
      node_type: 'domain',
      default_content: String(domainNode.data.content),
      position: 'first anchor position',
      reason: 'Chain requires an identity anchor before downstream semantics are meaningful.',
    });
  }

  let roleNode = repairedNodes.find((n) => isEnabled(n) && isRole(n));
  if (!hasRole) {
    roleNode = addNode(
      'role',
      'Role',
      'Expert persona.',
      'Senior AI assistant focused on safe, structured, and actionable responses.',
      { x: 420, y: 80 },
    );
    repairs.push({
      rule: 'C-03',
      action: 'ADD',
      node_type: 'role',
      default_content: String(roleNode.data.content),
      position: 'after domain anchor',
      reason: 'Mission objectives require a defined actor.',
    });
  }

  let missionNode = repairedNodes.find((n) => isEnabled(n) && isMission(n));
  if (!hasMission) {
    missionNode = addNode(
      'mission_goal',
      'Mission / Goal',
      'Concrete objective.',
      'Produce a complete, safe, and structured answer aligned with user intent and active constraints.',
      { x: 720, y: 80 },
    );
    repairs.push({
      rule: 'C-03',
      action: 'ADD',
      node_type: 'mission_goal',
      default_content: String(missionNode.data.content),
      position: 'after role',
      reason: 'Identity anchors without objective leave the chain directionless.',
    });
  }

  if (!hasGuardrail) {
    const smartActive = repairedNodes.some((n) => isEnabled(n) && isSmart01or02(n));
    if (smartActive) {
      const g = addNode(
        'guardrail',
        'Guardrail',
        'Behavior constraints.',
        'Refrain from harmful, deceptive, or out-of-scope content. Prioritize safe refusal when required.',
        { x: 1020, y: 80 },
      );
      repairs.push({
        rule: 'C-05',
        action: 'ADD',
        node_type: 'guardrail',
        default_content: String(g.data.content),
        position: 'after mission_goal, before SMART post-processors',
        reason: 'SMART processors amplify behavior and must be bounded by guardrails.',
      });
    }
  }

  // Basic connective repair for canonical spine domain -> role -> mission -> format(if exists)
  const d = repairedNodes.find((n) => isEnabled(n) && isDomain(n));
  const r = repairedNodes.find((n) => isEnabled(n) && isRole(n));
  const m = repairedNodes.find((n) => isEnabled(n) && isMission(n));
  const f = repairedNodes.find((n) => isEnabled(n) && isFormat(n));

  if (d && r) {
    repairedEdges = addEdgeIfMissing(repairedEdges, d.id, r.id);
    repairs.push({
      rule: 'C-01',
      action: 'CONNECT',
      node_id: r.id,
      reason: 'Connect domain to role to establish scoped actor identity.',
    });
  }
  if (r && m) {
    repairedEdges = addEdgeIfMissing(repairedEdges, r.id, m.id);
    repairs.push({
      rule: 'C-03',
      action: 'CONNECT',
      node_id: m.id,
      reason: 'Mission should follow role identity in the execution chain.',
    });
  }
  if (m && f) {
    repairedEdges = addEdgeIfMissing(repairedEdges, m.id, f.id);
    repairs.push({
      rule: 'C-06',
      action: 'CONNECT',
      node_id: f.id,
      reason: 'Format is downstream of objective and shapes final output.',
    });
  }

  // Reorder logic node if it appears after format
  const logic = repairedNodes.find((n) => isEnabled(n) && isLogic(n));
  if (logic && f && m) {
    if (logic.position.x > f.position.x) {
      const from = `x=${logic.position.x}`;
      logic.position = { ...logic.position, x: Math.max(m.position.x + 180, f.position.x - 220) };
      repairs.push({
        rule: 'C-07',
        action: 'REORDER',
        node_id: logic.id,
        moved_from: from,
        moved_to: `x=${logic.position.x}`,
        reason: 'Reasoning must occur before output formatting.',
      });
    }
  }

  const qualityAfter = compile(repairedNodes, repairedEdges).audit.qualityScore;

  return {
    repairs_applied: repairs,
    quality_before: qualityBefore,
    quality_after: qualityAfter,
    repaired_graph: {
      nodes: repairedNodes,
      edges: repairedEdges,
    },
  };
}

export function runSmartChainEngine(
  mode: 'VALIDATE' | 'SUGGEST' | 'REPAIR',
  nodes: PromptNode[],
  edges: PromptEdge[],
): ValidateResult | SuggestResult | RepairResult {
  if (mode === 'VALIDATE') return validateChain(nodes, edges);
  if (mode === 'SUGGEST') return suggestChain(nodes, edges);
  return repairChain(nodes, edges);
}
