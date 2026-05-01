import type { PromptNode, PromptEdge } from './types';

interface SharePayload {
  v: 1;
  nodes: PromptNode[];
  edges: PromptEdge[];
}

/**
 * Encode nodes + edges into a URL-safe base64 string and set it as
 * the window location hash.
 * Returns the full URL that can be shared.
 */
export function encodeWorkflowToHash(nodes: PromptNode[], edges: PromptEdge[]): string {
  const payload: SharePayload = { v: 1, nodes, edges };
  const json = JSON.stringify(payload);
  // btoa requires ASCII — use encodeURIComponent to handle any Unicode content
  const encoded = btoa(encodeURIComponent(json));
  const url = `${window.location.origin}${window.location.pathname}#share=${encoded}`;
  return url;
}

/**
 * Read a workflow from the current URL hash.
 * Returns null if the hash is absent or malformed.
 */
// Prototype-pollution-safe reviver
const PROTO_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
function safeReviver(_key: string, value: unknown): unknown {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const clean: Record<string, unknown> = Object.create(null);
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (!PROTO_KEYS.has(k)) clean[k] = v;
    }
    return clean;
  }
  return value;
}

/** Maximum share-hash length (chars) to prevent tab-freeze on crafted URLs. */
const MAX_HASH_LENGTH = 500_000;

export function decodeWorkflowFromHash(): { nodes: PromptNode[]; edges: PromptEdge[] } | null {
  const hash = window.location.hash;
  if (!hash.startsWith('#share=')) return null;

  try {
    const encoded = hash.slice('#share='.length);
    // Guard against excessively large payloads
    if (encoded.length > MAX_HASH_LENGTH) return null;
    const json = decodeURIComponent(atob(encoded));
    const payload = JSON.parse(json, safeReviver) as SharePayload;
    if (payload.v !== 1 || !Array.isArray(payload.nodes) || !Array.isArray(payload.edges)) {
      return null;
    }
    return { nodes: payload.nodes, edges: payload.edges };
  } catch {
    return null;
  }
}

/**
 * Clear the share hash from the URL without triggering a page reload.
 */
export function clearShareHash(): void {
  history.replaceState(null, '', window.location.pathname + window.location.search);
}
