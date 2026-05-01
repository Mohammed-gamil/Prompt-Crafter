import type { OutputFormat } from './types';
import { encodeSystemInstructionsToToon, type ToonInstructionBlock } from './toon';

// ── XML → Markdown ──
function xmlToMarkdown(xml: string): string {
  const tagMap: Record<string, string> = {
    system_instructions: '# System Instructions',
    domain_context: '## Domain Context',
    role_identity: '## Role',
    task_objective: '## Objective',
    technical_memory: '## Context / Memory',
    guardrail: '## Guardrail',
    reasoning_directive: '## Reasoning Directive',
    output_blueprint: '## Output Format',
    examples: '## Examples',
    output_schema: '## Output Schema',
    meta_processor: '## Meta Processor',
    reasoning_pattern: '## Reasoning Pattern',
    constraints_and_rules: '## Constraints',
    custom_extensions: '## Custom Extensions',
  };

  const md = xml
    // Remove wrapping system_instructions tags
    .replace(/<system_instructions>\s*/g, '')
    .replace(/\s*<\/system_instructions>/g, '')
    // Replace known opening tags with markdown headings
    .replace(/<(\w+)[^>]*>/g, (_, tag: string) => {
      // domain_rule, custom_block, extension — use label attribute as heading
      return tagMap[tag] ? `\n${tagMap[tag]}\n\n` : `\n**${tag.replace(/_/g, ' ')}**\n\n`;
    })
    // Remove all closing tags
    .replace(/<\/\w+>/g, '\n')
    // Unescape XML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    // Collapse more than 2 consecutive newlines
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return md;
}

// ── XML → JSON ──
function parseXmlBlocks(xml: string): ToonInstructionBlock[] {
  const blocks: ToonInstructionBlock[] = [];
  const blockRe = /<(\w+)([^>]*)>([\s\S]*?)<\/\1>/g;
  let m: RegExpExecArray | null;

  // Strip outer wrapper first
  const inner = xml.replace(/<\/?system_instructions>/g, '').trim();

  while ((m = blockRe.exec(inner)) !== null) {
    const tag     = m[1];
    const attribs = m[2];
    const content = m[3]
      .trim()
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"');

    const labelM = /label="([^"]*)"/.exec(attribs);
    const typeM  = /type="([^"]*)"/.exec(attribs);

    blocks.push({
      tag,
      ...(labelM ? { label: labelM[1] } : {}),
      ...(typeM  ? { type:  typeM[1]  } : {}),
      content,
    });
  }

  return blocks;
}

function xmlToJson(xml: string): string {
  const blocks = parseXmlBlocks(xml);

  return JSON.stringify({ system_instructions: blocks }, null, 2);
}

function xmlToToon(xml: string): string {
  const blocks = parseXmlBlocks(xml);
  return encodeSystemInstructionsToToon(blocks);
}

// ── XML → Plain text ──
function xmlToText(xml: string): string {
  return xml
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function convertOutput(xml: string, format: OutputFormat): string {
  switch (format) {
    case 'xml':      return xml;
    case 'markdown': return xmlToMarkdown(xml);
    case 'json':     return xmlToJson(xml);
    case 'text':     return xmlToText(xml);
    case 'toon':     return xmlToToon(xml);
  }
}

export const FORMAT_LABELS: Record<OutputFormat, string> = {
  xml:      'XML',
  markdown: 'Markdown',
  json:     'JSON',
  text:     'Plain Text',
  toon:     'TOON',
};
