/** Stable unique IDs — replaces the old incrementing node_N counter
 * which collided after reload / restore. Uses crypto.randomUUID when
 * available, falls back to timestamp+random. */

export function newNodeId(prefix = 'node'): string {
  try {
    const uuid =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : null;
    if (uuid) return `${prefix}_${uuid.slice(0, 8)}`;
  } catch {
    /* fall through */
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export function newEdgeId(prefix = 'e'): string {
  return newNodeId(prefix);
}

/** Content hash (FNV-1a 32-bit, hex) — cheap, sync, no async crypto needed.
 * Used for summary caching, version parentage, and incremental diff. */
export function hashContent(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}
