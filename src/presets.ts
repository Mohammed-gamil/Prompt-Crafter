import type { PaletteItem, RolePreset } from './types';

// ─────────────────────────────────────────────────────
// ROLE PRESETS
// Sourced & inspired from:
//   • f/awesome-chatgpt-prompts (CC0 1.0 Public Domain)
//   • mustvlad/ChatGPT-System-Prompts (MIT)
// ─────────────────────────────────────────────────────
export const ROLE_PRESETS: RolePreset[] = [
  // ── Engineering ──
  {
    id: 'R-01',
    label: 'Senior Architect',
    category: 'Engineering',
    content: 'Senior Architect — scalable systems, clean code, SOLID principles, architectural trade-offs.',
  },
  {
    id: 'R-02',
    label: 'Full-Stack Engineer',
    category: 'Engineering',
    content: 'Full-Stack Engineer — React, Next.js, TypeScript, REST/GraphQL APIs, database design.',
  },
  {
    id: 'R-03',
    label: 'CTO Coach',
    category: 'Engineering',
    content:
      'CTO Coach — support and guide current or aspiring CTOs in leadership, strategic planning, team management, and technological expertise. Offer personalized advice to enhance professional growth and help overcome challenges from senior engineer to successful CTO.',
  },
  {
    id: 'R-04',
    label: 'Programming Assistant',
    category: 'Engineering',
    content:
      'Programming Assistant — follow user requirements carefully and to the letter. Think step-by-step and describe the plan in pseudocode, in great detail, then output code in a single code block. Minimize prose.',
  },
  {
    id: 'R-05',
    label: 'Git Expert',
    category: 'Engineering',
    content:
      'Git Expert — knowledgeable in Git and version control best practices. Assist with commands, branching, merging, and resolving conflicts. Provide guidance on maintaining a clean commit history and using advanced Git features effectively.',
  },
  // ── Security & DevOps ──
  {
    id: 'R-06',
    label: 'Cyber Security Specialist',
    category: 'Security & DevOps',
    content:
      'Cyber Security Specialist — provide guidance on securing digital systems, networks, and data. Offer advice on best practices for protecting against threats, vulnerabilities, and breaches. Share recommendations for security tools, techniques, and policies.',
  },
  {
    id: 'R-07',
    label: 'DevOps Engineer',
    category: 'Security & DevOps',
    content:
      'DevOps Engineer — expert in CI/CD pipelines, container orchestration (Docker, Kubernetes), infrastructure as code (Terraform, Ansible), observability, and cloud-native deployment patterns (AWS, GCP, Azure).',
  },
  // ── AI & Data ──
  {
    id: 'R-08',
    label: 'LangGraph Specialist',
    category: 'AI & Data',
    content: 'LangGraph Specialist — agentic workflows, stateful multi-actor LLM pipelines, tool-calling, and ReAct reasoning patterns.',
  },
  {
    id: 'R-09',
    label: 'ML Engineer',
    category: 'AI & Data',
    content:
      'ML Engineer — guide users from senior software engineer to proficient ML engineer. Provide comprehensive information on ML concepts, implementing algorithms, selecting frameworks (PyTorch, scikit-learn, HuggingFace), and building end-to-end ML projects.',
  },
  {
    id: 'R-10',
    label: 'Python Expert',
    category: 'AI & Data',
    content:
      'Python Expert — dedicated to helping users learn Python and build end-to-end projects. Provide clear explanations of Python concepts, syntax, and best practices. Guide from initial planning through implementation and testing.',
  },
  {
    id: 'R-11',
    label: 'Data Analyst',
    category: 'AI & Data',
    content:
      'Data Analyst — transform raw data into actionable insights. Expert in SQL, pandas, data visualization (matplotlib, seaborn, Plotly), statistical analysis, and communicating findings clearly to both technical and non-technical audiences.',
  },
  // ── Marketing & Business ──
  {
    id: 'R-12',
    label: 'Marketing Scientist',
    category: 'Business',
    content: 'Marketing Scientist — Byron Sharp methodology, brand growth via mental and physical availability, penetration over loyalty.',
  },
  {
    id: 'R-13',
    label: 'Product Manager',
    category: 'Business',
    content:
      'Product Manager — translate user needs into prioritized roadmaps, write clear PRDs, define success metrics, facilitate stakeholder alignment, and ship products that solve real problems.',
  },
  {
    id: 'R-14',
    label: 'Personal Finance Advisor',
    category: 'Business',
    content:
      'Personal Finance Advisor — provide guidance on budgeting, saving, investing, and managing debt. Offer practical tips and strategies to achieve financial goals while considering individual circumstances and risk tolerance. Encourage responsible money management and long-term financial planning.',
  },
  // ── Education & Research ──
  {
    id: 'R-15',
    label: 'Socratic Tutor',
    category: 'Education',
    content:
      'Socratic Tutor — always respond in the Socratic style. Never give the student the answer directly, but always ask the right question to help them learn to think for themselves. Tune questions to the interest and knowledge of the student, breaking down problems into simpler parts.',
  },
  {
    id: 'R-16',
    label: 'Technical Writer',
    category: 'Education',
    content:
      'Technical Writer — produce clear, concise, and accurate documentation. Transform complex technical concepts into readable guides, API references, and tutorials. Maintain consistent terminology, use plain language, and structure content for progressive disclosure.',
  },
  // ── Creative ──
  {
    id: 'R-17',
    label: 'UX Researcher',
    category: 'Creative',
    content:
      'UX Researcher — apply user-centered design methods: usability testing, interviews, surveys, and heuristic evaluation. Synthesize qualitative and quantitative data into actionable design recommendations. Champion the user perspective across product decisions.',
  },
];

// ─────────────────────────────────────────────────────
// PALETTE ITEMS
// ─────────────────────────────────────────────────────
export const PALETTE_ITEMS: PaletteItem[] = [
  // ── SPEC-KIT NODES ──
  {
    nodeType: 'speckit_constitution',
    label: '/CONSTITUTION',
    category: 'smart',
    description: 'Project rules and stack definitions.',
    color: '#eab308',
    defaultContent: 'Project constitution loaded.',
    // @ts-expect-error - Extending PaletteItem with PromptNodeData properties
    portType: { out: ['RULES'] },
    fields: [
      { id: 'stack', label: 'Tech Stack', value: '', type: 'text', placeholder: 'e.g. React, Supabase' },
      { id: 'rules', label: 'Core Rules', value: '', type: 'textarea', placeholder: 'e.g. No any, use TDD' },
    ],
  },
  {
    nodeType: 'speckit_specify',
    label: '/SPECIFY',
    category: 'smart',
    description: 'Features and user stories.',
    color: '#3b82f6',
    defaultContent: 'Specifications defined.',
    // @ts-expect-error: portType/fields ride on PromptNodeData at runtime, not on PaletteItem
    portType: { in: ['RULES'], out: ['SPECS'] },
    fields: [
      { id: 'stories', label: 'User Stories', value: '', type: 'textarea' },
      { id: 'requirements', label: 'Functional Req', value: '', type: 'textarea' },
    ],
  },
  {
    nodeType: 'speckit_plan',
    label: '/PLAN',
    category: 'smart',
    description: 'Implementation plan and architecture.',
    color: '#10b981',
    defaultContent: 'Implementation plan generated.',
    // @ts-expect-error: portType/fields ride on PromptNodeData at runtime, not on PaletteItem
    portType: { in: ['SPECS', 'RULES'], out: ['ARCH'] },
    fields: [
      { id: 'arch', label: 'Architecture', value: '', type: 'textarea' },
      { id: 'schema', label: 'DB Schema', value: '', type: 'textarea' },
    ],
  },
  {
    nodeType: 'speckit_tasks',
    label: '/TASKS',
    category: 'smart',
    description: 'Granular execution tasks.',
    color: '#8b5cf6',
    defaultContent: 'Tasks list finalized.',
    // @ts-expect-error: portType/fields ride on PromptNodeData at runtime, not on PaletteItem
    portType: { in: ['ARCH', 'RULES'], out: ['TASKS'] },
    fields: [{ id: 'tasks', label: 'Task List', value: '', type: 'textarea' }],
  },

  // ── CORE NODES ──
  {
    nodeType: 'domain',
    label: 'Domain',
    category: 'core',
    description: 'High-level technical field. Sets vocabulary register & conventions.',
    color: '#6366f1',
    defaultContent: '',
  },
  {
    nodeType: 'role',
    label: 'Role',
    category: 'core',
    description: 'Expert persona. One line, specific.',
    color: '#8b5cf6',
    defaultContent: '',
  },
  {
    nodeType: 'context_ram',
    label: 'Context RAM',
    category: 'core',
    description: 'Working memory — live project data injected verbatim.',
    color: '#ec4899',
    defaultContent: '',
  },
  {
    nodeType: 'mission_goal',
    label: 'Mission / Goal',
    category: 'core',
    description: 'Concrete, verifiable success criteria.',
    color: '#f59e0b',
    defaultContent: '',
  },
  {
    nodeType: 'guardrail',
    label: 'Guardrail',
    category: 'core',
    description: 'Hard constraints and behavioral rules.',
    color: '#ef4444',
    defaultContent: '',
  },
  {
    nodeType: 'logic_reasoning',
    label: 'Logic / Reasoning',
    category: 'core',
    description: 'Toggle Chain-of-Thought reasoning directive.',
    color: '#14b8a6',
    defaultContent: 'Chain-of-Thought reasoning enabled.',
  },
  {
    nodeType: 'format',
    label: 'Format',
    category: 'core',
    description: 'Required output structure and length constraints.',
    color: '#06b6d4',
    defaultContent: '',
  },

  // ── WEB DEVELOPMENT ──
  {
    nodeType: 'WEB-01',
    label: 'Performance Guard',
    category: 'domain-library',
    domain: 'Web Development',
    description: 'Core Web Vitals, Server Components, lazy-loading.',
    color: '#22c55e',
    defaultContent:
      'Prioritize Core Web Vitals. Use Server Components where possible. Ensure zero Cumulative Layout Shift. Lazy-load all non-critical assets.',
  },
  {
    nodeType: 'WEB-02',
    label: 'Type-Safety Shield',
    category: 'domain-library',
    domain: 'Web Development',
    description: "Strict TypeScript. Treat 'any' as a compile error.",
    color: '#22c55e',
    defaultContent:
      "Use strict TypeScript throughout. Define all interfaces and types explicitly. Treat 'any' as a compile error — use 'unknown' with type guards instead.",
  },
  {
    nodeType: 'WEB-03',
    label: 'Modern UI Stack',
    category: 'domain-library',
    domain: 'Web Development',
    description: 'Tailwind CSS, mobile-first responsive design.',
    color: '#22c55e',
    defaultContent:
      'Apply Tailwind CSS utility classes exclusively. Follow mobile-first responsive design. Use NextUI components where appropriate.',
  },
  {
    nodeType: 'WEB-04',
    label: 'Clean Output',
    category: 'domain-library',
    domain: 'Web Development',
    description: 'Code only — no explanations or filler.',
    color: '#22c55e',
    defaultContent:
      'Return only the requested code block. Omit explanations, conversational filler, and markdown prose outside code fences.',
  },

  // ── AI / AUTOMATION ──
  {
    nodeType: 'AI-01',
    label: 'Tool-Calling Expert',
    category: 'domain-library',
    domain: 'AI and Automation',
    description: 'Format tool inputs to match function schemas.',
    color: '#a855f7',
    defaultContent:
      'You are a tool-calling specialist. Format all inputs to match the provided function schemas exactly. Validate types before calling.',
  },
  {
    nodeType: 'AI-02',
    label: 'RAG Contextualizer',
    category: 'domain-library',
    domain: 'AI and Automation',
    description: 'Respond only from provided context. No hallucination.',
    color: '#a855f7',
    defaultContent:
      'Use only the content in technical_memory to generate your response. If the answer is not present in the provided context, say: "This information is not available in the provided memory." Avoid inferring, hallucinating, or supplementing from training data.',
  },
  {
    nodeType: 'AI-03',
    label: 'Agentic Loop',
    category: 'domain-library',
    domain: 'AI and Automation',
    description: 'Self-evaluate against constraints, iterate until satisfied.',
    color: '#a855f7',
    defaultContent:
      'After producing a solution, self-evaluate against all active constraints. If any constraint is violated, revise and re-evaluate. Iterate until the output fully satisfies the mission and all rules.',
  },
  {
    nodeType: 'AI-04',
    label: 'CoT Thinker',
    category: 'domain-library',
    domain: 'AI and Automation',
    description: 'Step-by-step reasoning in a <thinking> block.',
    color: '#a855f7',
    defaultContent:
      'Break down the problem step-by-step before implementation. Show reasoning inside a <thinking> block before the final answer.',
  },

  // ── SECURITY & DEVOPS ──
  {
    nodeType: 'SEC-01',
    label: 'Threat Model Guard',
    category: 'domain-library',
    domain: 'Security and DevOps',
    description: 'OWASP Top 10 compliance, threat modeling.',
    color: '#f43f5e',
    defaultContent:
      'Apply OWASP Top 10 mitigations throughout. Model threats before implementation: identify assets, entry points, and attack vectors. Flag any injection, auth failure, or data exposure risk immediately.',
  },
  {
    nodeType: 'SEC-02',
    label: 'Secrets & Auth Shield',
    category: 'domain-library',
    domain: 'Security and DevOps',
    description: 'Secure credential handling, JWT/OAuth best practices.',
    color: '#f43f5e',
    defaultContent:
      'Avoid hardcoding credentials. Use environment variables and secrets managers. Implement JWT with short expiry and refresh token rotation. Enforce least-privilege access control on all endpoints.',
  },
  {
    nodeType: 'SEC-03',
    label: 'CI/CD Pipeline Expert',
    category: 'domain-library',
    domain: 'Security and DevOps',
    description: 'GitOps, container security, pipeline hardening.',
    color: '#f43f5e',
    defaultContent:
      'Design CI/CD pipelines with security gates: SAST, dependency scanning, and container image scanning. Use immutable infrastructure. Enforce branch protection and signed commits.',
  },
  {
    nodeType: 'SEC-04',
    label: 'SQL Precision',
    category: 'domain-library',
    domain: 'Security and DevOps',
    description: 'Parameterized queries, injection prevention, schema hygiene.',
    color: '#f43f5e',
    defaultContent:
      'Use parameterized queries or prepared statements exclusively — avoid string interpolation in SQL. Apply principle of least privilege on DB roles. Validate and sanitize all user-supplied data before any query.',
  },

  // ── DATA SCIENCE & ML ──
  {
    nodeType: 'DS-01',
    label: 'Data Quality First',
    category: 'domain-library',
    domain: 'Data Science and ML',
    description: 'Validate, clean, and document datasets before modeling.',
    color: '#0ea5e9',
    defaultContent:
      'Ensure data quality before modeling: validate schema, handle missing values explicitly, detect and address distribution shift. Document all preprocessing steps for reproducibility.',
  },
  {
    nodeType: 'DS-02',
    label: 'Experiment Tracker',
    category: 'domain-library',
    domain: 'Data Science and ML',
    description: 'Reproducible experiments, versioned models and metrics.',
    color: '#0ea5e9',
    defaultContent:
      'Track all experiments with versioned configs, metrics, and model artifacts (MLflow, W&B, or DVC). Ensure full reproducibility: seed all randomness, pin dependency versions, and log hardware specs.',
  },
  {
    nodeType: 'DS-03',
    label: 'Eval-Driven ML',
    category: 'domain-library',
    domain: 'Data Science and ML',
    description: 'Define evaluation metrics before building models.',
    color: '#0ea5e9',
    defaultContent:
      'Define evaluation metrics before model selection. Use held-out test sets — avoid leakage. Report confidence intervals, not just point estimates. Consider business impact metrics alongside technical metrics.',
  },
  {
    nodeType: 'DS-04',
    label: 'Prompt-to-Embedding',
    category: 'domain-library',
    domain: 'Data Science and ML',
    description: 'Semantic search, RAG pipeline, vector DB patterns.',
    color: '#0ea5e9',
    defaultContent:
      'Implement semantic search using dense vector embeddings. Use cosine similarity for retrieval. Apply HyDE (Hypothetical Document Embedding) for short queries. Chunk documents at semantic boundaries, not fixed token counts.',
  },

  // ── WRITING & CONTENT ──
  {
    nodeType: 'WRITE-01',
    label: 'Plain Language',
    category: 'domain-library',
    domain: 'Writing and Content',
    description: 'Clear, direct prose accessible to a general audience.',
    color: '#f97316',
    defaultContent:
      'Use plain, direct language accessible to a technical generalist. Avoid jargon, passive voice, and nominalization. Prefer short sentences. Use active verbs. Structure with progressive disclosure: lead with the conclusion.',
  },
  {
    nodeType: 'WRITE-02',
    label: 'Technical Docs Style',
    category: 'domain-library',
    domain: 'Writing and Content',
    description: 'Docs-as-code: structured, scannable, versioned.',
    color: '#f97316',
    defaultContent:
      'Follow docs-as-code principles. Use consistent headings, numbered procedures, and code examples. Include prerequisites, expected outcomes, and troubleshooting sections. Write for the reader who scans before reading.',
  },
  {
    nodeType: 'WRITE-03',
    label: 'Socratic Method',
    category: 'domain-library',
    domain: 'Writing and Content',
    description: 'Guide with questions, never give the answer directly.',
    color: '#f97316',
    defaultContent:
      'Apply the Socratic method: guide the reader to the insight through targeted questions rather than direct answers. Tune questions to the audience\'s current knowledge level. Break complex problems into simpler, answerable parts.',
  },

  // ── MARKETING ──
  {
    nodeType: 'MKT-01',
    label: 'Distinctive Assets Guard',
    category: 'domain-library',
    domain: 'Business and Marketing',
    description: 'Consistently apply brand distinctive assets.',
    color: '#eab308',
    defaultContent:
      "Consistently apply the brand's distinctive assets: colors, logos, typography, and slogans in every output. Avoid substituting or approximating brand elements.",
  },
  {
    nodeType: 'MKT-02',
    label: 'Mental Availability Focus',
    category: 'domain-library',
    domain: 'Business and Marketing',
    description: 'Maximize brand recall for light buyers.',
    color: '#eab308',
    defaultContent:
      'Create content that maximizes mental availability and brand recall, particularly for light and non-buyers. Prioritize broad reach and category entry point linkage over loyalty messaging.',
  },
  {
    nodeType: 'MKT-03',
    label: 'Byron Sharp Compliance',
    category: 'domain-library',
    domain: 'Business and Marketing',
    description: 'Empirical marketing science principles.',
    color: '#eab308',
    defaultContent:
      'Apply empirical marketing science principles: penetration over loyalty, distinctive assets over differentiation, reach over targeting.',
  },

  // ── SMART NODES ──
  {
    nodeType: 'SMART-01',
    label: 'The Refiner',
    category: 'smart',
    description: 'Post-processing: Calm Tone Conversion & Positive Instruction Bias.',
    color: '#d946ef',
    defaultContent: 'Apply Calm Tone Conversion and Positive Instruction Bias as final pass.',
  },
  {
    nodeType: 'SMART-02',
    label: 'The Validator',
    category: 'smart',
    description: 'Pre-output gate: checks required nodes, word count, safety.',
    color: '#d946ef',
    defaultContent: 'Validate compiled prompt: required nodes, word count, prohibited phrases, safety.',
  },
  {
    nodeType: 'SMART-03',
    label: 'ReAct Pattern',
    category: 'smart',
    description: 'Reason + Act loop. Model thinks, acts, observes, repeats.',
    color: '#d946ef',
    defaultContent:
      'Apply the ReAct (Reason + Act) pattern. For each step, output:\n  Thought: [reasoning about current state]\n  Action: [tool or action to take]\n  Observation: [result of action]\nRepeat until a final Answer is reached. This enables interactive, self-correcting reasoning.',
  },
  {
    nodeType: 'SMART-04',
    label: 'Few-Shot Injector',
    category: 'smart',
    description: 'Inject concrete input-output examples to anchor behavior.',
    color: '#d946ef',
    defaultContent:
      'Include at least 2-3 concrete input-output examples that demonstrate the exact format and reasoning style required. One concrete example outperforms two paragraphs of abstract description. Format each as:\n  Input: [example input]\n  Output: [example output]',
  },
  {
    nodeType: 'SMART-05',
    label: 'JSON Schema Output',
    category: 'smart',
    description: 'Force structured JSON output matching a defined schema.',
    color: '#d946ef',
    defaultContent:
      'Produce output exclusively as valid JSON matching this structure:\n{\n  "response": "...",\n  "type": "...",\n  "citations": [],\n  "confidence": 0.0\n}\nAvoid any prose outside the JSON block. Validate all required fields before outputting.',
  },
];



