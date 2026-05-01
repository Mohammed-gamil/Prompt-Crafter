import type { AdviseEnvelope, AdviseIssue } from './types';

const VAGUE_TERMS = ['good', 'helpful', 'relevant', 'appropriate', 'some', 'various', 'etc.', 'and so on', 'if needed'];

function excerpt(text: string, maxWords = 30): string {
  const words = text.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  if (words.length <= maxWords) return words.join(' ');
  return words.slice(0, maxWords).join(' ') + '…';
}

function hasTag(xml: string, tag: string): boolean {
  return new RegExp(`<${tag}(\\s|>)`, 'i').test(xml);
}

function pushIssue(issues: AdviseIssue[], issue: AdviseIssue): void {
  issues.push(issue);
}

export function adviseCompiledXml(xml: string): AdviseEnvelope {
  const lower = xml.toLowerCase();
  const issues: AdviseIssue[] = [];
  const strengths: string[] = [];
  const missingNodes: string[] = [];

  const hasDomain = hasTag(xml, 'domain_context') || hasTag(xml, 'domain_rule');
  const hasRole = hasTag(xml, 'role_identity');
  const hasMission = hasTag(xml, 'task_objective');
  const hasFormat = hasTag(xml, 'output_blueprint');
  const hasGuardrail = hasTag(xml, 'guardrail');
  const hasCot = hasTag(xml, 'reasoning_directive') || hasTag(xml, 'reasoning_pattern');
  const hasExamples = hasTag(xml, 'examples');
  const hasSchema = hasTag(xml, 'output_schema');

  if (!hasDomain) {
    missingNodes.push('domain or domain-library');
    pushIssue(issues, {
      category: 'completeness',
      severity: 'critical',
      description: 'Domain context is missing; model behavior may drift without boundary context.',
      original_excerpt: '<system_instructions> missing <domain_context> or <domain_rule>',
      rewrite: 'Add a <domain_context> block naming domain scope, terminology, and boundaries.',
    });
  } else {
    strengths.push('Domain context present, improving scope control.');
  }

  if (!hasRole) {
    missingNodes.push('role');
    pushIssue(issues, {
      category: 'completeness',
      severity: 'critical',
      description: 'Role identity is missing; persona constraints are underdefined.',
      original_excerpt: '<system_instructions> missing <role_identity>',
      rewrite: 'Add <role_identity> with explicit expertise, style, and decision boundaries.',
    });
  } else {
    strengths.push('Role identity is defined.');
  }

  if (!hasMission) {
    missingNodes.push('mission_goal');
    pushIssue(issues, {
      category: 'completeness',
      severity: 'critical',
      description: 'Task objective is missing; output target is ambiguous.',
      original_excerpt: '<system_instructions> missing <task_objective>',
      rewrite: 'Add a verb-led <task_objective> with measurable success criteria.',
    });
  } else {
    strengths.push('Task objective is explicitly declared.');
  }

  if (!hasFormat) {
    missingNodes.push('format');
    pushIssue(issues, {
      category: 'format',
      severity: 'major',
      description: 'No output blueprint found; response structure may vary by run.',
      original_excerpt: excerpt(xml),
      rewrite: 'Add <output_blueprint> specifying exact sections, ordering, and length constraints.',
    });
  }

  if (!hasGuardrail) {
    missingNodes.push('guardrail');
    pushIssue(issues, {
      category: 'guardrail',
      severity: 'major',
      description: 'No guardrail block is present; safety and refusal boundaries are weaker.',
      original_excerpt: excerpt(xml),
      rewrite: 'Add <guardrail> with prohibited actions, refusal policy, and escalation behavior.',
    });
  } else {
    strengths.push('Guardrail coverage is present.');
  }

  if (!hasExamples) {
    missingNodes.push('SMART-04 few-shot examples');
    pushIssue(issues, {
      category: 'few_shot',
      severity: 'minor',
      description: 'No examples detected; behavior anchoring may be less consistent for complex tasks.',
      original_excerpt: excerpt(xml),
      rewrite: 'Add <examples> containing 2-3 high-quality input/output demonstrations.',
    });
  }

  if (!hasSchema && /\bjson\b|\bschema\b|\bstructured\b/i.test(lower)) {
    missingNodes.push('SMART-05 output schema');
    pushIssue(issues, {
      category: 'format',
      severity: 'major',
      description: 'Prompt references structured output but no explicit output schema tag is present.',
      original_excerpt: excerpt(xml),
      rewrite: 'Add <output_schema> with required fields, enums, and validation constraints.',
    });
  }

  const vagueFound = VAGUE_TERMS.filter((t) => new RegExp(`\\b${t.replace(/[.*+?^${}()|[\\]\\]/g, '\\\\$&')}\\b`, 'i').test(lower));
  for (const term of vagueFound) {
    pushIssue(issues, {
      category: 'specificity',
      severity: 'minor',
      description: `Vague phrasing detected ("${term}") which weakens instruction precision.`,
      original_excerpt: excerpt(xml),
      rewrite: `Replace "${term}" with concrete nouns, exact counts, and bounded constraints.`,
    });
  }

  if (/\b(you must|never|do not|forbidden)\b/i.test(lower) && !hasTag(xml, 'meta_processor')) {
    pushIssue(issues, {
      category: 'tone',
      severity: 'minor',
      description: 'Directive tone is somewhat hard-edged and no explicit refiner signal is visible.',
      original_excerpt: excerpt(xml),
      rewrite: 'Soften command phrasing to assertive-neutral wording (e.g., "You are expected to", "Avoid").',
    });
  }

  if (hasCot) strengths.push('Reasoning directive/pattern is present for complex tasks.');
  if (hasSchema) strengths.push('Schema-oriented output guidance is present.');
  if (hasExamples) strengths.push('Few-shot examples are included.');

  let qualityScore = 100;
  qualityScore -= issues.reduce((acc, i) => acc + (i.severity === 'critical' ? 12 : i.severity === 'major' ? 7 : 3), 0);
  qualityScore = Math.max(0, Math.min(100, qualityScore));

  return {
    quality_score: qualityScore,
    issues,
    missing_nodes: missingNodes,
    strengths,
  };
}
