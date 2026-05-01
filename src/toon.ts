export interface ToonInstructionBlock {
	tag: string;
	content: string;
	label?: string;
	type?: string;
}

const SINGLETON_TAGS = new Set([
	'domain_context',
	'role_identity',
	'task_objective',
	'output_blueprint',
	'reasoning_directive',
	'technical_memory',
]);

const REPEATED_TAGS = new Set(['domain_rule', 'guardrail', 'custom_block', 'examples']);

const ARRAY_NAME_BY_TAG: Record<string, string> = {
	domain_rule: 'rules',
	guardrail: 'guardrails',
	custom_block: 'custom_blocks',
	examples: 'examples',
};

function quoteIfNeededCsv(value: string): string {
	const oneLine = value.replace(/\r?\n/g, ' ').trim();
	return oneLine.includes(',') ? `"${oneLine.replace(/"/g, '\\"')}"` : oneLine;
}

function truncateForRepeatedContent(content: string): string {
	if (content.length <= 60) return content;
	const sentenceMatch = content.match(/^\s*([^.!?]+[.!?])/);
	const firstSentence = sentenceMatch ? sentenceMatch[1].trim() : content.slice(0, 60).trim();
	return `${firstSentence}...`;
}

function toBlockScalar(key: string, content: string): string {
	const lines = content.split(/\r?\n/);
	return [
		`${key}: |`,
		...lines.map((line) => `  ${line}`),
	].join('\n');
}

function parseReasoningSteps(content: string): string[] {
	const matches = content
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter((line) => /^\d+\.\s+/.test(line))
		.map((line) => line.replace(/^\d+\.\s+/, '').trim())
		.filter(Boolean);
	return matches;
}

function renderReasoningDirective(content: string): string {
	const steps = parseReasoningSteps(content);
	if (steps.length === 0) {
		if (content.includes('\n')) return toBlockScalar('reasoning_directive', content);
		return `reasoning_directive: ${content.trim()}`;
	}
	const lines = ['reasoning_directive:'];
	steps.forEach((step, i) => {
		lines.push(`  step${i + 1}: ${step}`);
	});
	lines.push('  show_thinking: true');
	return lines.join('\n');
}

function collectRun(blocks: ToonInstructionBlock[], start: number): { run: ToonInstructionBlock[]; nextIndex: number } {
	const tag = blocks[start].tag;
	const run: ToonInstructionBlock[] = [blocks[start]];
	let i = start + 1;
	while (i < blocks.length && blocks[i].tag === tag) {
		run.push(blocks[i]);
		i += 1;
	}
	return { run, nextIndex: i };
}

export function encodeSystemInstructionsToToon(blocks: ToonInstructionBlock[]): string {
	const lines: string[] = [];

	let i = 0;
	while (i < blocks.length) {
		const { run, nextIndex } = collectRun(blocks, i);
		const tag = run[0].tag;

		if (REPEATED_TAGS.has(tag) && run.length >= 2) {
			const arrayName = ARRAY_NAME_BY_TAG[tag] ?? `${tag}s`;
			const fields = ['tag', 'label', 'type', 'content'];
			lines.push('');
			lines.push(`${arrayName}[${run.length}]{${fields.join(',')}}:`);
			for (const row of run) {
				const shortContent = truncateForRepeatedContent(row.content);
				const values = [
					row.tag,
					row.label ?? '',
					row.type ?? '',
					shortContent,
				].map(quoteIfNeededCsv);
				lines.push(values.join(','));
			}
			i = nextIndex;
			continue;
		}

		for (const block of run) {
			lines.push('');

			if (block.tag === 'reasoning_directive') {
				lines.push(renderReasoningDirective(block.content));
				continue;
			}

			const key = block.tag;
			if (SINGLETON_TAGS.has(block.tag) || !REPEATED_TAGS.has(block.tag)) {
				if (block.content.includes('\n')) {
					lines.push(toBlockScalar(key, block.content));
				} else {
					lines.push(`${key}: ${block.content.trim()}`);
				}
				continue;
			}

			// repeated tag appearing once: still keep the tag losslessly
			const content = block.content.trim();
			lines.push(`${key}: ${content}`);
		}

		i = nextIndex;
	}

	return lines.join('\n').trim();
}

