import type { Node, Edge } from '@xyflow/react';

// ── Node Categories ──
export type NodeCategory = 'core' | 'domain-library' | 'smart' | 'custom' | 'code' | 'feature';

export type CoreNodeType =
  | 'domain'
  | 'role'
  | 'context_ram'
  | 'mission_goal'
  | 'guardrail'
  | 'logic_reasoning'
  | 'format';

export type PromptNodeState = 'active' | 'bypassed' | 'muted' | 'error';

export type DomainLibraryNodeType =
  | 'WEB-01'
  | 'WEB-02'
  | 'WEB-03'
  | 'WEB-04'
  | 'AI-01'
  | 'AI-02'
  | 'AI-03'
  | 'AI-04'
  | 'MKT-01'
  | 'MKT-02'
  | 'MKT-03'
  // Security & DevOps
  | 'SEC-01'
  | 'SEC-02'
  | 'SEC-03'
  | 'SEC-04'
  // Data Science & ML
  | 'DS-01'
  | 'DS-02'
  | 'DS-03'
  | 'DS-04'
  // Writing & Content
  | 'WRITE-01'
  | 'WRITE-02'
  | 'WRITE-03';

export type SmartNodeType = 'SMART-01' | 'SMART-02' | 'SMART-03' | 'SMART-04' | 'SMART-05';

export type ResourceType = 'RULES' | 'SPECS' | 'ARCH' | 'TASKS' | 'CONTEXT' | 'FORMAT' | 'ANY' | 'CODE' | 'FEATURE';

export interface NodeField {
  id: string;
  label: string;
  value: string;
  type: 'text' | 'textarea' | 'list';
  placeholder?: string;
}

export type PromptNodeType = CoreNodeType | DomainLibraryNodeType | SmartNodeType | (string & {});

// ── Node Data ──
export interface PromptNodeData {
  [key: string]: unknown;
  nodeType: PromptNodeType;
  label: string;
  category: NodeCategory;
  description: string;
  content: string;
  enabled: boolean;
  state?: PromptNodeState;
  errorMessage?: string;
  color: string;
  // For logic_reasoning node
  toggled?: boolean;
  // For role node presets
  presetId?: string;
  // Spec-Kit & ComfyUI extensions
  fields?: NodeField[];
  commandTrigger?: string;
  portType?: {
    in?: ResourceType[];
    out?: ResourceType[];
  };
}

export type PromptNode = Node<PromptNodeData>;
export type PromptEdge = Edge;

// ── Preset Libraries ──
export interface RolePreset {
  id: string;
  label: string;
  content: string;
  category: string;
}

export interface DomainNodeDef {
  id: DomainLibraryNodeType;
  name: string;
  domain: string;
  content: string;
  color: string;
}

// ── Compiler Output ──
export interface CompilerAudit {
  wordCount: number;
  charCountRam: number;
  activeNodes: number;
  totalNodes: number;
  cotEnabled: boolean;
  safetyStatus: 'PASS' | string;
  safetyFlag: boolean;
  refinerApplied: boolean;
  qualityScore: number;
  completenessScore: number;
  specificityScore: number;
}

export type WarningCode =
  | 'MISSING_ROLE'
  | 'MISSING_DOMAIN'
  | 'MISSING_MISSION'
  | 'SAFETY_FLAG'
  | 'WORD_COUNT_HIGH'
  | 'CYCLE_DETECTED'
  | 'VAGUE_LANGUAGE'
  | 'MISSING_FORMAT'
  | 'WEAK_GUARDRAIL';

export type WarningSeverity = 'error' | 'warning' | 'info';

export interface CompilerWarning {
  code: WarningCode;
  message: string;
  nodeId: string | null;
  severity: WarningSeverity;
}

export interface CompilationResult {
  xml: string;
  audit: CompilerAudit;
  warnings: CompilerWarning[];
}

export interface CompileEnvelope {
  compiled_xml: string;
  audit: {
    word_count: number;
    active_nodes: number;
    ram_chars: number;
    cot_enabled: boolean;
    safety_flag: boolean;
    quality_score: number;
    completeness_score: number;
    specificity_score: number;
  };
  warnings: Array<{
    code: WarningCode;
    message: string;
    node_id: string | null;
    severity: WarningSeverity;
  }>;
  resolved_nodes: string[];
}

export type AdviseIssueCategory =
  | 'specificity'
  | 'structure'
  | 'tone'
  | 'safety'
  | 'format'
  | 'cot'
  | 'few_shot'
  | 'guardrail'
  | 'completeness';

export interface AdviseIssue {
  category: AdviseIssueCategory;
  severity: 'critical' | 'major' | 'minor';
  description: string;
  original_excerpt: string;
  rewrite: string;
}

export interface AdviseEnvelope {
  quality_score: number;
  issues: AdviseIssue[];
  missing_nodes: string[];
  strengths: string[];
}

// ── Output formats ──
export type OutputFormat = 'xml' | 'markdown' | 'json' | 'text' | 'toon';

// ── Version history ──
export interface PromptVersion {
  id: string;
  name: string;
  timestamp: number;
  nodes: PromptNode[];
  edges: PromptEdge[];
  xml: string;
  /** Content hash of nodes+edges — stable across reloads (Phase 5). */
  hash?: string;
  parentId?: string | null;
  commitSha?: string | null;
  graphHash?: string | null;
}

// ── Codebase-reference graph (code-as-nodes) ──
export type CodeNodeKind =
  | 'FOLDER'
  | 'FILE'
  | 'FUNC'
  | 'FEATURE'
  | 'FEATURE_PROPOSED'
  | 'FILE_PROPOSED'
  | 'FUNC_PROPOSED';

export type CodeLinkKind =
  | 'contains'
  | 'imports'
  | 'calls'
  | 'renders'
  | 'belongs-to'
  | 'proposed-touches';

export interface CodeEntity {
  id: string;
  kind: CodeNodeKind;
  /** Repo-relative path, e.g. src/store.ts. FOLDER nodes use dir path. */
  path: string;
  /** Symbol name for FUNC nodes (function/class/component). */
  symbol?: string;
  symbolKind?: 'function' | 'class' | 'component' | 'route' | 'hook' | 'type' | 'other';
  range?: { start: number; end: number };
  /** FNV hash of file/symbol content — drives summary cache + incremental diff. */
  hash: string;
  /** One-line LLM summary ("what it does precisely"). Empty until Phase 2. */
  summary?: string;
  language?: string;
  size?: number;
  proposed?: boolean;
  confidence?: number;
  /** For FEATURE nodes: user-written description. */
  description?: string;
  /** True for LLM-clustered features (replaced on re-cluster); manual ones persist. */
  auto?: boolean;
}

export interface CodeLink {
  id: string;
  source: string;
  target: string;
  kind: CodeLinkKind;
  proposed?: boolean;
}

export interface FeatureCluster {
  id: string;
  name: string;
  description: string;
  /** CodeEntity ids grouped under this feature. */
  members: string[];
  confidence: number;
  auto?: boolean;
}

export interface CodeRepoMeta {
  name: string;
  branch?: string;
  commitSha?: string | null;
  importedAt: number;
  source: 'upload' | 'github' | 'demo';
  fileCount: number;
  entityCount: number;
  graphHash: string;
}

// ── Node palette items ──
export interface PaletteItem {
  nodeType: PromptNodeType;
  label: string;
  category: NodeCategory;
  description: string;
  color: string;
  defaultContent: string;
  domain?: string;
}
