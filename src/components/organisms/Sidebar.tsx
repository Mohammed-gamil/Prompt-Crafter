import { useCallback, useEffect, useMemo, useState } from 'react';
import { PALETTE_ITEMS } from '../../presets';
import { compile } from '../../compiler';
import { useAppStore } from '../../store';
import type { PaletteItem, PromptNodeType } from '../../types';
import CustomNodeForm from './CustomNodeForm';
import SearchBar from '../molecules/SearchBar';
import PaletteNodeItem from '../molecules/PaletteNodeItem';

const CATEGORY_META = [
  { key: 'core',           label: 'Core Nodes',     icon: '◆' },
  { key: 'spec-kit',       label: 'Spec-Kit',       icon: '🛠️' },
  { key: 'domain-library', label: 'Domain Library',  icon: '◈' },
  { key: 'smart',          label: 'Smart Nodes',     icon: '⚡' },
  { key: 'custom',         label: 'My Nodes',        icon: '✦' },
] as const;

type CategoryKey = typeof CATEGORY_META[number]['key'];

// Map a category to a short badge label for search results
const CATEGORY_BADGE: Record<string, string> = {
  core:           'CORE',
  'spec-kit':     'SPEC',
  'domain-library': 'LIB',
  smart:          'SMART',
  custom:         'MINE',
};

export default function Sidebar() {
  const addNode               = useAppStore((s) => s.addNode);
  const nodes                 = useAppStore((s) => s.nodes);
  const edges                 = useAppStore((s) => s.edges);
  const setOutputPanelOpen    = useAppStore((s) => s.setOutputPanelOpen);
  const outputPanelOpen       = useAppStore((s) => s.outputPanelOpen);
  const customPaletteItems    = useAppStore((s) => s.customPaletteItems);
  const addCustomPaletteItem  = useAppStore((s) => s.addCustomPaletteItem);
  const removeCustomPaletteItem = useAppStore((s) => s.removeCustomPaletteItem);
  const saveVersion           = useAppStore((s) => s.saveVersion);

  const warningCount = useMemo(
    () => (nodes.length > 0 ? compile(nodes, edges).warnings.length : 0),
    [nodes, edges],
  );

  const [expandedCategory, setExpandedCategory] = useState<string>(() => {
    try {
      const raw = localStorage.getItem('prompt-crafter:custom-nodes');
      return raw && JSON.parse(raw).length > 0 ? 'custom' : 'core';
    } catch { return 'core'; }
  });
  const [expandedDomain, setExpandedDomain]     = useState<string | null>(null);
  const [search, setSearch]                     = useState('');
  const [showCustomForm, setShowCustomForm]     = useState(false);

  // Auto-expand My Nodes whenever items are imported
  useEffect(() => {
    if (customPaletteItems.length > 0) setExpandedCategory('custom');
  }, [customPaletteItems.length]);

  // All items merged — custom items land in their declared category
  const allItems = useMemo(
    () => [...PALETTE_ITEMS, ...customPaletteItems],
    [customPaletteItems],
  );

  // Dynamic domain list derived from all domain-library items (handles imported packs)
  const allDomains = useMemo(() => {
    const seen = new Set<string>();
    return allItems
      .filter((p) => p.category === 'domain-library' && p.domain)
      .map((p) => p.domain as string)
      .filter((d) => (seen.has(d) ? false : (seen.add(d), true)));
  }, [allItems]);

  const handleAdd = useCallback(
    (nodeType: PromptNodeType) => addNode(nodeType),
    [addNode],
  );

  // Count helpers for header badges
  const countFor = useCallback(
    (key: CategoryKey) => {
      if (key === 'custom') return customPaletteItems.length;
      if (key === 'spec-kit') return allItems.filter((p) => p.nodeType.toString().startsWith('speckit_')).length;
      return allItems.filter((p) => p.category === key && !p.nodeType.toString().startsWith('speckit_')).length;
    },
    [allItems, customPaletteItems],
  );

  const q = search.toLowerCase().trim();
  const searchResults: (PaletteItem & { _deletable?: boolean })[] | null = q
    ? allItems
        .filter(
          (p) =>
            p.label.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            (p.domain?.toLowerCase().includes(q) ?? false) ||
            p.category.toLowerCase().includes(q),
        )
        .map((p) => ({
          ...p,
          _deletable: customPaletteItems.some((c) => c.nodeType === p.nodeType),
        }))
    : null;

  return (
    <div className="w-72 bg-[#13131d] border-r border-gray-800 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-800">
        <h1 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="text-indigo-400">⬡</span>
          Prompt Crafter
        </h1>
        <p className="text-[11px] text-gray-500 mt-1">Node-based prompt compiler</p>
      </div>

      {/* Search */}
      <div className="px-3 pt-3 pb-1">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search nodes…"
        />
      </div>

      {/* Node Palette */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {searchResults ? (
          /* ── Search results ── */
          searchResults.length === 0 ? (
            <p className="text-[11px] text-gray-600 px-2 py-4 text-center">
              No nodes match &ldquo;{search}&rdquo;
            </p>
          ) : (
            <div className="space-y-1">
              {searchResults.map((item) => (
                <PaletteNodeItem
                  key={item.nodeType}
                  label={item.label}
                  nodeId={item.nodeType}
                  color={item.color}
                  description={item.description}
                  badge={CATEGORY_BADGE[item.category] ?? item.category}
                  domain={item.domain}
                  onAdd={() => handleAdd(item.nodeType as PromptNodeType)}
                  onDelete={
                    item._deletable
                      ? () => removeCustomPaletteItem(item.nodeType as string)
                      : undefined
                  }
                />
              ))}
            </div>
          )
        ) : (
          /* ── Categorised palette ── */
          CATEGORY_META.map((cat) => {
            const count = countFor(cat.key);
            return (
              <div key={cat.key}>
                <button
                  onClick={() =>
                    setExpandedCategory(expandedCategory === cat.key ? '' : cat.key)
                  }
                  className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-semibold text-gray-400 hover:text-white transition-colors rounded"
                >
                  <span className="flex items-center gap-1.5">
                    {cat.icon} {cat.label}
                    <span className="text-[9px] bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded-full font-mono">
                      {count}
                    </span>
                  </span>
                  <span className="text-[10px]">{expandedCategory === cat.key ? '▾' : '▸'}</span>
                </button>

                {expandedCategory === cat.key && (
                  <div className="space-y-1 mt-1">

                    {/* ── My Nodes: ALL customPaletteItems grouped by their category ── */}
                    {cat.key === 'custom' && (() => {
                      if (customPaletteItems.length === 0 && !showCustomForm) {
                        return (
                          <p className="text-[10px] text-gray-600 px-3 py-2">
                            No custom nodes yet. Create one below or import a pack.
                          </p>
                        );
                      }

                      // Group by category
                      const groups = new Map<string, PaletteItem[]>();
                      for (const item of customPaletteItems) {
                        const grp = item.category === 'custom' ? 'Created' :
                          item.category === 'domain-library' ? `Library · ${item.domain ?? 'Imported'}` :
                          item.category === 'smart' ? 'Smart' :
                          item.category === 'core' ? 'Core' : item.category;
                        if (!groups.has(grp)) groups.set(grp, []);
                        groups.get(grp)!.push(item);
                      }

                      return (
                        <>
                          {Array.from(groups.entries()).map(([grpLabel, items]) => (
                            <div key={grpLabel}>
                              {groups.size > 1 && (
                                <p className="text-[9px] text-gray-600 uppercase tracking-widest px-3 pt-2 pb-1">
                                  {grpLabel}
                                </p>
                              )}
                              {items.map((item) => (
                                <PaletteNodeItem
                                  key={item.nodeType}
                                  label={item.label}
                                  nodeId={item.nodeType}
                                  color={item.color}
                                  description={item.description}
                                  onAdd={() => handleAdd(item.nodeType as PromptNodeType)}
                                  onDelete={() => removeCustomPaletteItem(item.nodeType as string)}
                                />
                              ))}
                            </div>
                          ))}
                          {showCustomForm ? (
                            <CustomNodeForm
                              onSave={(item) => {
                                addCustomPaletteItem(item);
                                setShowCustomForm(false);
                              }}
                              onCancel={() => setShowCustomForm(false)}
                            />
                          ) : (
                            <button
                              onClick={() => setShowCustomForm(true)}
                              className="w-full mt-1 flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-indigo-400 hover:text-indigo-300 border border-dashed border-indigo-800 hover:border-indigo-600 rounded-md transition-colors"
                            >
                              <span className="text-base leading-none">+</span> New Custom Node
                            </button>
                          )}
                        </>
                      );
                    })()}

                    {/* ── Domain Library: grouped by domain (built-in + imported) ── */}
                    {cat.key === 'domain-library' &&
                      allDomains.map((domain) => {
                        const domainItems = allItems.filter(
                          (p) => p.category === 'domain-library' && p.domain === domain,
                        );
                        return (
                          <div key={domain}>
                            <button
                              onClick={() =>
                                setExpandedDomain(expandedDomain === domain ? null : domain)
                              }
                              className="w-full flex items-center justify-between px-3 py-1 text-[11px] text-gray-500 hover:text-gray-300 transition-colors"
                            >
                              <span>{domain}</span>
                              <span className="flex items-center gap-1 text-[9px] text-gray-600">
                                {domainItems.length}
                                <span className="ml-1">{expandedDomain === domain ? '▾' : '▸'}</span>
                              </span>
                            </button>
                            {expandedDomain === domain &&
                              domainItems.map((item) => {
                                const isDeletable = customPaletteItems.some(
                                  (c) => c.nodeType === item.nodeType,
                                );
                                return (
                                  <PaletteNodeItem
                                    key={item.nodeType}
                                    label={item.label}
                                    nodeId={item.nodeType}
                                    color={item.color}
                                    description={item.description}
                                    onAdd={() => handleAdd(item.nodeType as PromptNodeType)}
                                    onDelete={
                                      isDeletable
                                        ? () => removeCustomPaletteItem(item.nodeType as string)
                                        : undefined
                                    }
                                  />
                                );
                              })}
                          </div>
                        );
                      })}

                    {/* ── Core / Smart / Spec-Kit: built-in + imported items ── */}
                    {(cat.key === 'core' || cat.key === 'smart' || cat.key === 'spec-kit') &&
                      allItems
                        .filter((p) => {
                          const isSpecKit = p.nodeType.toString().startsWith('speckit_');
                          if (cat.key === 'spec-kit') return isSpecKit;
                          return p.category === cat.key && !isSpecKit;
                        })
                        .map((item) => {
                          const isDeletable = customPaletteItems.some(
                            (c) => c.nodeType === item.nodeType,
                          );
                          return (
                            <PaletteNodeItem
                              key={item.nodeType}
                              label={item.label}
                              nodeId={item.nodeType}
                              color={item.color}
                              description={item.description}
                              onAdd={() => handleAdd(item.nodeType as PromptNodeType)}
                              onDelete={
                                isDeletable
                                  ? () => removeCustomPaletteItem(item.nodeType as string)
                                  : undefined
                              }
                            />
                          );
                        })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Compile Button */}
      <div className="px-4 py-3 border-t border-gray-800">
        <button
          onClick={() => {
            // Auto-snapshot when opening the output panel
            if (!outputPanelOpen && nodes.length > 0) {
              const { xml } = compile(nodes, edges);
              saveVersion(undefined, xml);
            }
            setOutputPanelOpen(!outputPanelOpen);
          }}
          title="Ctrl+Enter"
          className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-all text-white ${
            !outputPanelOpen && warningCount > 0
              ? 'bg-amber-600 hover:bg-amber-500 ring-1 ring-amber-500/40'
              : 'bg-indigo-600 hover:bg-indigo-500'
          }`}
        >
          <span className="flex items-center justify-center gap-2">
            <span>{outputPanelOpen ? '✕  Close Output' : '▶  Compile Prompt'}</span>
            {!outputPanelOpen && warningCount > 0 && (
              <span className="bg-white/20 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                {warningCount}
              </span>
            )}
          </span>
          <span className="block text-[9px] font-normal opacity-40 mt-0.5 font-mono">Ctrl+Enter</span>
        </button>
      </div>
    </div>
  );
}

