import type { CodeEntity, CodeLink, CodeRepoMeta } from '../types';
import { closureAround } from './store';

export interface ExportInput {
  featureId: string;
  entities: CodeEntity[];
  links: CodeLink[];
  snippets: Record<string, string>;
  repo: CodeRepoMeta | null;
}

function escXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function featureOf(input: ExportInput): CodeEntity | null {
  return input.entities.find((e) => e.id === input.featureId) ?? null;
}

function relatedOf(input: ExportInput): { entities: CodeEntity[]; links: CodeLink[] } {
  const feat = featureOf(input);
  if (!feat) return { entities: [], links: [] };
  // seeds: feature + its direct touches + members
  const seeds = [feat.id];
  for (const l of input.links) {
    if (l.source === feat.id) seeds.push(l.target);
    if (l.target === feat.id) seeds.push(l.source);
  }
  return closureAround(input.entities, input.links, seeds, 1);
}

/** Deterministic builder prompt any coding agent can execute. */
export function buildBuilderPrompt(input: ExportInput): string {
  const feat = featureOf(input);
  if (!feat) return 'Select a feature first.';
  const { entities, links } = relatedOf(input);
  const reuse = entities.filter((e) => !e.proposed && (e.kind === 'FILE' || e.kind === 'FUNC'));
  const proposed = entities.filter((e) => e.proposed);
  const fileTree = [...new Set(entities.filter((e) => e.kind === 'FILE' || e.kind === 'FILE_PROPOSED').map((e) => e.path))].sort().slice(0, 80);

  const sections: string[] = [];
  sections.push(`<role_identity>\nYou are a senior engineer implementing a feature in an existing codebase. Follow the plan exactly; do not refactor unrelated files.\n</role_identity>`);
  sections.push(`<feature_intent name="${escXml(feat.symbol || feat.path)}">\n${escXml(feat.description || feat.summary || '')}\n</feature_intent>`);
  sections.push(`<repo_context name="${escXml(input.repo?.name ?? 'repo')}" graph_hash="${input.repo?.graphHash ?? ''}">\nFiles in scope:\n${fileTree.map((p) => `- ${p}`).join('\n')}\n</repo_context>`);
  if (reuse.length > 0) {
    sections.push(`<reuse>\n${reuse.slice(0, 40).map((e) => `- ${e.kind === 'FUNC' ? `${e.path}#${e.symbol}` : e.path}${e.summary ? ` — ${e.summary}` : ''}`).join('\n')}\n</reuse>`);
  }
  if (proposed.length > 0) {
    sections.push(`<to_create>\n${proposed.map((e) => `- [${e.kind}] ${e.symbol ? `${e.path}#${e.symbol}` : e.path} — ${e.summary || e.description || ''}`).join('\n')}\n</to_create>`);
  }
  const edgeLines = links.filter((l) => l.kind === 'proposed-touches' || l.kind === 'imports').slice(0, 40);
  if (edgeLines.length > 0) {
    const byId = new Map(entities.map((e) => [e.id, e]));
    const label = (id: string) => {
      const e = byId.get(id);
      return e ? (e.symbol ? `${e.path}#${e.symbol}` : e.path) : id;
    };
    sections.push(`<relations>\n${edgeLines.map((l) => `- ${label(l.source)} --${l.kind}--> ${label(l.target)}`).join('\n')}\n</relations>`);
  }
  // code excerpts for reuse files (capped)
  let chars = 0;
  const excerpts: string[] = [];
  for (const e of reuse.filter((x) => x.kind === 'FILE').slice(0, 10)) {
    const snip = input.snippets[e.path]?.slice(0, 1500) ?? '';
    if (!snip) continue;
    if (chars + snip.length > 9000) break;
    chars += snip.length;
    excerpts.push(`--- ${e.path} ---\n${snip}`);
  }
  if (excerpts.length > 0) sections.push(`<code_excerpts>\n${excerpts.join('\n')}\n</code_excerpts>`);
  sections.push(`<constraints>\n- Only touch files listed in <reuse> plus files under <to_create>.\n- Keep existing import edges valid; add missing imports for new files.\n- Match repo language/style; no new dependencies unless justified.\n- Output a file-by-file diff summary at the end.\n</constraints>`);
  sections.push(`<acceptance>\n- All touched files typecheck/lint clean.\n- New symbols from <to_create> exist and are wired per <relations>.\n- No broken imports; no changes outside scope.\n</acceptance>`);
  return `<system_instructions>\n${sections.join('\n\n')}\n</system_instructions>`;
}

/** Checker prompt: verify an agent's diff WITHOUT re-indexing the whole repo. */
export function buildCheckerPrompt(input: ExportInput): string {
  const feat = featureOf(input);
  if (!feat) return 'Select a feature first.';
  const { entities } = relatedOf(input);
  const proposed = entities.filter((e) => e.proposed);
  const scope = [...new Set(entities.filter((e) => e.kind !== 'FOLDER').map((e) => e.path))].sort().slice(0, 60);

  return `<system_instructions>
<role_identity>
You are a strict code reviewer verifying a feature implementation against its proposal. Only inspect the diff and files in scope.
</role_identity>

<feature_intent name="${escXml(feat.symbol || feat.path)}">
${escXml(feat.description || feat.summary || '')}
</feature_intent>

<expected scope_hash="${input.repo?.graphHash ?? ''}">
New items expected:
${proposed.length > 0 ? proposed.map((e) => `- [${e.kind}] ${e.symbol ? `${e.path}#${e.symbol}` : e.path}`).join('\n') : '(none — feature maps to existing files only)'}
Files in scope:
${scope.map((p) => `- ${p}`).join('\n')}
</expected>

<diff_to_review>
[PASTE git diff or changed files here]
</diff_to_review>

<checks>
1. Every [to_create] item exists with the proposed path/symbol.
2. Reuse files were modified only where needed; no out-of-scope changes.
3. Imports/calls match the proposed relations; no new cycles introduced.
4. Types + lint pass (report the command output).
5. Summaries still accurate: each touched symbol does what its summary claims.
</checks>

<verdict_format>
PASS/FAIL per check + file-by-file notes + minimal fix list. Do NOT re-architect; only flag deviations from the proposal.
</verdict_format>
</system_instructions>`;
}
