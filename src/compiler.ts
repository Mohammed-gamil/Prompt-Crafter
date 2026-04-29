import type {
  PromptNode,
  PromptEdge,
  CompilationResult,
  CompilerAudit,
  CompilerWarning,
  CompileEnvelope,
  WarningCode,
  NodeField,
} from './types';

// ── Rule 2: Calm Tone Conversion ──
const TONE_MAP: [RegExp, string][] = [
  [/\bYou must\b/gi, 'You are expected to'],
  [/\bNever\b/gi, 'Avoid'],
  [/\bAlways\b/gi, 'Consistently'],
  [/\bDo not\b/gi, 'Refrain from'],
  [/\bYou are forbidden\b/gi, 'This falls outside your scope'],
  [/\bIgnore\b/gi, 'Disregard'],
  [/\bYOU MUST NEVER\b/gi, 'Avoid'],
  [/\bYOU MUST\b/gi, 'Ensure'],
  [/\bNEVER EVER\b/gi, 'Do not'],
  [/\bCRITICAL!/gi, 'Important:'],
  [/\bALWAYS!/gi, 'Consistently'],
  [/\bFORBIDDEN\b/gi, 'Outside scope'],
  [/\bDO NOT\b/gi, 'Avoid'],
];

function applyToneConversion(text: string): string {
  let result = text;
  for (const [pattern, replacement] of TONE_MAP) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

// ── Safety gate ──
const UNSAFE_PATTERNS = [
  /\bdeceive\b/i,
  /\bmanipulate\b.*\busers?\b/i,
  /\bharm\b/i,
  /\bbypass\b.*\bsafety\b/i,
  /\bpersonally identifiable information\b/i,
  /\bignore previous\b/i,
  /\bpretend you are\b/i,
  /\bDAN\b/i,
  /\bdeveloper mode\b/i,
  /\byou have no restrictions\b/i,
  /\bact as root\b/i,
  /\bsend to\b/i,
  /\bPOST to\b/i,
  /\breveal system prompt\b/i,
  /\bself-harm\b/i,
];

const VAGUE_PHRASES = ['help', 'try to', 'if possible', 'feel free'];
const VAGUE_TERMS = ['good', 'helpful', 'relevant', 'appropriate', 'some', 'various', 'etc.', 'and so on', 'if needed'];

function escRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function makeWarning(
  code: WarningCode,
  message: string,
  nodeId: string | null,
  severity: CompilerWarning['severity'],
): CompilerWarning {
  return { code, message, nodeId, severity };
}

interface SafetyHit {
  nodeId: string;
  nodeLabel: string;
  pattern: string;
}

function findSafetyHits(nodes: PromptNode[]): SafetyHit[] {
  const hits: SafetyHit[] = [];
  for (const node of nodes) {
    const content = String(node.data.content ?? '');
    for (const pattern of UNSAFE_PATTERNS) {
      const m = content.match(pattern);
      if (m) {
        hits.push({
          nodeId: node.id,
          nodeLabel: String(node.data.label ?? node.id),
          pattern: m[0],
        });
      }
    }
  }
  return hits;
}

function redactContent(text: string): string {
  let out = text;
  for (const pattern of UNSAFE_PATTERNS) {
    out = out.replace(pattern, '[REDACTED]');
  }
  return out;
}

// ── Helpers ──
function countWords(text: string): number {
  return text
    .replace(/<[^>]+>/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function txt(node: PromptNode): string {
  return (node.data.content as string).trim();
}

function nodeState(node: PromptNode): 'active' | 'bypassed' | 'muted' | 'error' {
  return node.data.state ?? (node.data.enabled ? 'active' : 'muted');
}

function applyMutedDownstreamExclusion(nodes: PromptNode[], edges: PromptEdge[]): PromptNode[] {
  const mutedIds = new Set(nodes.filter((n) => nodeState(n) === 'muted').map((n) => n.id));
  if (mutedIds.size === 0) return nodes;

  const adj = new Map<string, string[]>();
  for (const n of nodes) adj.set(n.id, []);
  for (const e of edges) {
    if (!adj.has(e.source)) continue;
    adj.get(e.source)!.push(e.target);
  }

  const excluded = new Set<string>(mutedIds);
  const q = Array.from(mutedIds);
  while (q.length > 0) {
    const cur = q.shift()!;
    for (const nxt of adj.get(cur) ?? []) {
      if (!excluded.has(nxt)) {
        excluded.add(nxt);
        q.push(nxt);
      }
    }
  }

  return nodes.filter((n) => !excluded.has(n.id));
}

function applyBypassPassThrough(nodes: PromptNode[], edges: PromptEdge[]): { nodes: PromptNode[]; edges: PromptEdge[] } {
  const bypassedIds = new Set(nodes.filter((n) => nodeState(n) === 'bypassed').map((n) => n.id));
  if (bypassedIds.size === 0) return { nodes, edges };

  let nextBypassEdgeId = 0;
  const existingEdgeKey = new Set(edges.map((e) => `${e.source}->${e.target}`));
  const passthrough: PromptEdge[] = [];

  for (const bid of bypassedIds) {
    const incoming = edges.filter((e) => e.target === bid && !bypassedIds.has(e.source));
    const outgoing = edges.filter((e) => e.source === bid && !bypassedIds.has(e.target));
    for (const inc of incoming) {
      for (const out of outgoing) {
        if (inc.source === out.target) continue;
        const key = `${inc.source}->${out.target}`;
        if (existingEdgeKey.has(key)) continue;
        existingEdgeKey.add(key);
        passthrough.push({
          id: `bypass_e_${++nextBypassEdgeId}`,
          source: inc.source,
          target: out.target,
          animated: false,
          style: { stroke: '#94a3b8', strokeDasharray: '4 3' },
        });
      }
    }
  }

  const keptEdges = edges.filter((e) => !bypassedIds.has(e.source) && !bypassedIds.has(e.target));
  const keptNodes = nodes.filter((n) => !bypassedIds.has(n.id));
  return { nodes: keptNodes, edges: [...keptEdges, ...passthrough] };
}

// ── Topological sort (Kahn's algorithm) ──
// Determines compilation order from graph connections.
// Nodes with no incoming edges keep their original array order (stable).
// Cycle members are appended at the end so nothing is silently dropped.
function topoSort(nodes: PromptNode[], edges: PromptEdge[]): { sorted: PromptNode[]; cycleMembers: PromptNode[] } {
  const nodeIds  = new Set(nodes.map((n) => n.id));
  const inDegree = new Map(nodes.map((n) => [n.id, 0]));
  const adj      = new Map(nodes.map((n) => [n.id, [] as string[]]));

  for (const e of edges) {
    if (!nodeIds.has(e.source) || !nodeIds.has(e.target)) continue;
    adj.get(e.source)!.push(e.target);
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
  }

  const queue   = nodes.filter((n) => (inDegree.get(n.id) ?? 0) === 0);
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const result: PromptNode[] = [];

  while (queue.length > 0) {
    const node = queue.shift()!;
    result.push(node);
    for (const nid of (adj.get(node.id) ?? [])) {
      const deg = (inDegree.get(nid) ?? 1) - 1;
      inDegree.set(nid, deg);
      if (deg === 0 && nodeMap.has(nid)) queue.push(nodeMap.get(nid)!);
    }
  }

  // Append cycle members so they still compile
  const inResult = new Set(result.map((n) => n.id));
  const cycleMembers: PromptNode[] = [];
  for (const n of nodes) {
    if (!inResult.has(n.id)) {
      cycleMembers.push(n);
      result.push(n);
    }
  }

  return { sorted: result, cycleMembers };
}

// ── Per-node XML block compiler ──
// Every enabled node produces exactly one typed XML block.
// Returns null only when a node carries no content worth emitting.
function nodeToBlock(node: PromptNode): string | null {
  const c   = txt(node);
  const nt  = node.data.nodeType as string;
  const cat = node.data.category as string;
  const lbl = esc((node.data.label as string).trim());
  const fields = node.data.fields as NodeField[] | undefined;
  const command = node.data.commandTrigger as string | undefined;

  // ── Spec-Kit & ComfyUI Extension Logic ──
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

  switch (nt) {
    case 'domain':
      return c
        ? `  <domain_context>\n    ${esc(applyToneConversion(c))}\n  </domain_context>`
        : null;

    case 'role':
      return c
        ? `  <role_identity>\n    ${esc(applyToneConversion(c))}\n  </role_identity>`
        : null;

    case 'mission_goal':
      return c
        ? `  <task_objective>\n    ${esc(applyToneConversion(c))}\n  </task_objective>`
        : null;

    case 'context_ram':
      return c
        ? `  <technical_memory>\n    ${c}\n  </technical_memory>`
        : null;

    case 'guardrail':
      return c
        ? `  <guardrail>\n    ${esc(applyToneConversion(c))}\n  </guardrail>`
        : null;

    case 'logic_reasoning':
      if (node.data.toggled !== true) return null;
      return [
        '  <reasoning_directive>',
        '    Before producing output, reason step-by-step:',
        '    1. Restate the objective in your own words to confirm understanding.',
        '    2. Identify any constraint that conflicts with the objective.',
        '    3. Draft a solution outline and validate each step against the rules.',
        '    4. Produce final output only after completing steps 1-3.',
        '    Show your reasoning inside a <thinking> block before the answer.',
        '  </reasoning_directive>',
      ].join('\n');

    case 'format':
      return c
        ? `  <output_blueprint>\n    ${esc(applyToneConversion(c))}\n  </output_blueprint>`
        : null;

    case 'SMART-01':
      return [
        '  <meta_processor type="refiner">',
        '    Calm Tone Conversion and Positive Instruction Bias applied as final post-pass.',
        '  </meta_processor>',
      ].join('\n');

    case 'SMART-02':
      return [
        '  <meta_processor type="validator">',
        '    Validation active: required-node check, word-count gate, safety gate.',
        '  </meta_processor>',
      ].join('\n');

    case 'SMART-03':
      return c
        ? `  <reasoning_pattern type="react">\n    ${esc(applyToneConversion(c))}\n  </reasoning_pattern>`
        : null;

    case 'SMART-04':
      return c
        ? `  <examples>\n    ${esc(applyToneConversion(c))}\n  </examples>`
        : null;

    case 'SMART-05':
      return c
        ? `  <output_schema>\n    ${esc(applyToneConversion(c))}\n  </output_schema>`
        : null;

    default: {
      if (cat === 'domain-library') {
        return c
          ? `  <domain_rule label="${lbl}" type="${nt}">\n    ${esc(applyToneConversion(c))}\n  </domain_rule>`
          : null;
      }
      if (cat === 'custom') {
        return c
          ? `  <custom_block label="${lbl}">\n    ${esc(applyToneConversion(c))}\n  </custom_block>`
          : null;
      }
      return c
        ? `  <extension label="${lbl}" type="${nt}">\n    ${esc(applyToneConversion(c))}\n  </extension>`
        : null;
    }
  }
}

// ── Main Compiler ──
// compile(nodes, edges) — edges determine the XML block order via topological sort.
// Without edges all nodes compile in insertion order.
export function compile(nodes: PromptNode[], edges: PromptEdge[] = []): CompilationResult {
  const warnings: CompilerWarning[] = [];
  const enabledNodes = nodes.filter((n) => nodeState(n) !== 'muted');
  const totalNodes   = nodes.length;
  let activeNodes  = enabledNodes.length;

  if (enabledNodes.length === 0) {
    const audit: CompilerAudit = {
      wordCount: 0, charCountRam: 0, activeNodes: 0, totalNodes,
      cotEnabled: false, safetyStatus: 'PASS', safetyFlag: false, refinerApplied: false,
      qualityScore: 20, completenessScore: 0, specificityScore: 100,
    };
    warnings.push(makeWarning('MISSING_DOMAIN', 'Domain context is missing', null, 'error'));
    warnings.push(makeWarning('MISSING_ROLE', 'Role identity is missing', null, 'error'));
    warnings.push(makeWarning('MISSING_MISSION', 'Mission/goal is missing', null, 'error'));
    warnings.push(makeWarning('MISSING_FORMAT', 'Output format node is missing', null, 'warning'));
    return { xml: '<system_instructions/>', audit, warnings };
  }

  // ── Apply execution semantics: MUTED stops downstream, BYPASSED routes through ──
  const afterMuted = applyMutedDownstreamExclusion(enabledNodes, edges);
  const effectiveEdgesPre = edges.filter((e) => afterMuted.some((n) => n.id === e.source) && afterMuted.some((n) => n.id === e.target));
  const { nodes: executableNodes, edges: executableEdges } = applyBypassPassThrough(afterMuted, effectiveEdgesPre);
  activeNodes = executableNodes.length;

  // ── Safety scan + redaction ──
  const safetyHits = findSafetyHits(executableNodes);
  const safetyFlag = safetyHits.length > 0;
  const sanitizedEnabledNodes = executableNodes.map((n) => {
    const wasHit = safetyHits.some((h) => h.nodeId === n.id);
    if (!wasHit) return n;
    return {
      ...n,
      data: {
        ...n.data,
        content: redactContent(String(n.data.content ?? '')),
      },
    } as PromptNode;
  });

  for (const hit of safetyHits) {
    warnings.push(
      makeWarning(
        'SAFETY_FLAG',
        `Safety rule matched in "${hit.nodeLabel}" (${hit.pattern}); content was redacted`,
        hit.nodeId,
        'error',
      ),
    );
  }

  // ── Required-node checks (on ALL canvas nodes, not just the connected chain) ──
  const hasDomain  = sanitizedEnabledNodes.some(
    (n) => (n.data.nodeType === 'domain' && txt(n) !== '') ||
           n.data.category === 'domain-library',
  );
  const hasRole    = sanitizedEnabledNodes.some(
    (n) => n.data.nodeType === 'role' && txt(n) !== '',
  );
  const hasMission = sanitizedEnabledNodes.some(
    (n) => n.data.nodeType === 'mission_goal' && txt(n) !== '',
  );
  const hasFormat = sanitizedEnabledNodes.some(
    (n) => n.data.nodeType === 'format' && txt(n) !== '',
  );
  const hasGuardrail = sanitizedEnabledNodes.some(
    (n) => n.data.nodeType === 'guardrail' && txt(n) !== '',
  );
  const hasFewShot = sanitizedEnabledNodes.some((n) => n.data.nodeType === 'SMART-04');
  const hasSchema = sanitizedEnabledNodes.some((n) => n.data.nodeType === 'SMART-05');
  const hasContextRam = sanitizedEnabledNodes.some((n) => n.data.nodeType === 'context_ram' && txt(n) !== '');
  const hasSmartNode = sanitizedEnabledNodes.some((n) => String(n.data.nodeType).startsWith('SMART-'));

  const missingRequired: string[] = [];
  if (!hasDomain)  missingRequired.push('domain');
  if (!hasRole)    missingRequired.push('role');
  if (!hasMission) missingRequired.push('mission_goal');
  if (!hasDomain) warnings.push(makeWarning('MISSING_DOMAIN', 'Required domain/domain-library node is missing', null, 'error'));
  if (!hasRole) warnings.push(makeWarning('MISSING_ROLE', 'Required role node is missing', null, 'error'));
  if (!hasMission) warnings.push(makeWarning('MISSING_MISSION', 'Required mission_goal node is missing', null, 'error'));
  if (!hasFormat) warnings.push(makeWarning('MISSING_FORMAT', 'Format node is missing — output shape is underspecified', null, 'warning'));
  if (!hasGuardrail) warnings.push(makeWarning('WEAK_GUARDRAIL', 'Guardrail node is missing', null, 'warning'));

  // ── Safety ──
  const safetyStatus = safetyFlag ? 'FLAG' : 'PASS';

  // ── Post-processor flags ──
  const refinerNode   = sanitizedEnabledNodes.find((n) => n.data.nodeType === 'SMART-01');
  const validatorNode = sanitizedEnabledNodes.find((n) => n.data.nodeType === 'SMART-02');

  // ── Topology-aware compilation ──
  const { sorted, cycleMembers } = topoSort(sanitizedEnabledNodes, executableEdges);
  const cotEnabled = sorted.some(
    (n) => n.data.nodeType === 'logic_reasoning' && n.data.toggled === true,
  );

  if (cycleMembers.length > 0) {
    warnings.push(
      makeWarning(
        'CYCLE_DETECTED',
        `Cycle detected across ${cycleMembers.length} node(s); cycle members were appended at end`,
        cycleMembers[0]?.id ?? null,
        'warning',
      ),
    );
  }

  const blocks: string[] = ['<system_instructions>', ''];
  const injectedSafetyGuardrail = safetyFlag
    ? '  <guardrail>\n    Refrain from bypassing safeguards, data exfiltration, and harmful or deceptive requests.\n  </guardrail>'
    : null;
  let injectedAfterRole = false;

  for (const node of sorted) {
    const block = nodeToBlock(node);
    if (block) {
      blocks.push(block);
      blocks.push('');
      if (injectedSafetyGuardrail && node.data.nodeType === 'role' && !injectedAfterRole) {
        blocks.push(injectedSafetyGuardrail);
        blocks.push('');
        injectedAfterRole = true;
      }
    }
  }

  if (injectedSafetyGuardrail && !injectedAfterRole) {
    // role missing: still inject as earliest practical guardrail
    blocks.splice(2, 0, injectedSafetyGuardrail, '');
  }

  blocks.push('</system_instructions>');
  let xml = blocks.join('\n');

  // SMART-01 Refiner: apply tone conversion as final post-pass over the full XML
  const refinerApplied = !!refinerNode;
  if (refinerApplied) xml = applyToneConversion(xml);

  // ── Audit metrics ──
  const ramContent = sorted
    .filter((n) => n.data.nodeType === 'context_ram')
    .map((n) => txt(n))
    .filter(Boolean)
    .join('\n\n');

  const wordCount    = countWords(xml.replace(ramContent, ''));
  const charCountRam = ramContent.length;

  if (wordCount > 300) {
    warnings.push(
      makeWarning(
        'WORD_COUNT_HIGH',
        `Compiled body is ${wordCount} words (target: ≤300 excluding RAM)`,
        null,
        'warning',
      ),
    );
  }

  const allEnabledText = sorted.map((n) => txt(n).toLowerCase()).join('\n');
  const vagueMatches = VAGUE_PHRASES.filter((p) => new RegExp(`\\b${escRegExp(p)}\\b`, 'i').test(allEnabledText));
  for (const phrase of vagueMatches) {
    warnings.push(
      makeWarning(
        'VAGUE_LANGUAGE',
        `Vague phrase detected: "${phrase}" — prefer explicit verb-led instructions`,
        null,
        'info',
      ),
    );
  }

  // SMART-02 Validator: extra cross-check warnings
  if (validatorNode) {
    if (missingRequired.length > 0) {
      warnings.push(
        makeWarning(
          'MISSING_MISSION',
          `Validator flag: missing required node(s): ${missingRequired.join(', ')}`,
          null,
          'warning',
        ),
      );
    }
    if (wordCount > 300) {
      warnings.push(
        makeWarning(
          'WORD_COUNT_HIGH',
          `Validator flag: word count ${wordCount} exceeds 300-word target`,
          null,
          'warning',
        ),
      );
    }
    if (safetyFlag) {
      warnings.push(
        makeWarning('SAFETY_FLAG', 'Validator flag: safety scan detected policy-risk content', null, 'error'),
      );
    }
  }

  // ── Scoring ──
  const requiredCount = [hasDomain, hasRole, hasMission].filter(Boolean).length;
  let completenessScore = requiredCount * 20;
  if (hasGuardrail) completenessScore += 10;
  if (hasFormat) completenessScore += 10;
  if (hasContextRam) completenessScore += 10;
  if (hasSmartNode) completenessScore += 10;
  completenessScore = Math.max(0, Math.min(100, completenessScore));

  const lowerXml = xml.toLowerCase();
  const vagueTermHits = VAGUE_TERMS.reduce((acc, term) => {
    const re = new RegExp(`\\b${escRegExp(term)}\\b`, 'gi');
    const m = lowerXml.match(re);
    return acc + (m?.length ?? 0);
  }, 0);
  const specificityScore = Math.max(0, 100 - vagueTermHits * 4);

  let qualityScore = 100;
  if (!hasRole) qualityScore -= 20;
  if (!hasDomain) qualityScore -= 20;
  if (!hasMission) qualityScore -= 15;
  if (!hasFormat) qualityScore -= 10;
  if (safetyFlag) qualityScore -= 10;
  if (wordCount > 300) qualityScore -= 5;
  qualityScore -= vagueMatches.length * 5;
  if (!hasGuardrail) qualityScore -= 5;
  const complexTask = sorted.some((n) => ['SEC-01', 'AI-02', 'DS-04', 'logic_reasoning'].includes(String(n.data.nodeType)));
  if (complexTask && !hasFewShot) qualityScore -= 5;
  const aggressiveTone = /\b(you must|never|do not|forbidden)\b/i.test(xml);
  if (!refinerApplied && aggressiveTone) qualityScore -= 3;
  const structuredUseCase = /\b(json|schema|structured)\b/i.test(xml);
  if (structuredUseCase && !hasSchema) qualityScore -= 3;
  qualityScore = Math.max(0, Math.min(100, qualityScore));

  const audit: CompilerAudit = {
    wordCount,
    charCountRam,
    activeNodes,
    totalNodes,
    cotEnabled,
    safetyStatus,
    safetyFlag,
    refinerApplied,
    qualityScore,
    completenessScore,
    specificityScore,
  };

  return { xml, audit, warnings };
}

export function compileEnvelope(nodes: PromptNode[], edges: PromptEdge[] = []): CompileEnvelope {
  const result = compile(nodes, edges);
  const resolvedNodes = nodes.filter((n) => nodeState(n) !== 'muted' && nodeState(n) !== 'bypassed').map((n) => n.id);
  return {
    compiled_xml: result.xml,
    audit: {
      word_count: result.audit.wordCount,
      active_nodes: result.audit.activeNodes,
      ram_chars: result.audit.charCountRam,
      cot_enabled: result.audit.cotEnabled,
      safety_flag: result.audit.safetyFlag,
      quality_score: result.audit.qualityScore,
      completeness_score: result.audit.completenessScore,
      specificity_score: result.audit.specificityScore,
    },
    warnings: result.warnings.map((w) => ({
      code: w.code,
      message: w.message,
      node_id: w.nodeId,
      severity: w.severity,
    })),
    resolved_nodes: resolvedNodes,
  };
}
