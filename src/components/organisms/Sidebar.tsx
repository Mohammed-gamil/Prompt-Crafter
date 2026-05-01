import { useCallback, useEffect, useMemo, useState } from 'react';
import { PALETTE_ITEMS } from '../../presets';
import { compile } from '../../compiler';
import { useAppStore } from '../../store';
import type { PaletteItem, PromptNodeType } from '../../types';
import CustomNodeForm from './CustomNodeForm';
import SearchBar from '../molecules/SearchBar';
import PaletteNodeItem from '../molecules/PaletteNodeItem';
import Badge from '../atoms/Badge';

const CATEGORY_META = [
  { key: 'core',           label: 'Core Nodes',     icon: '◆' },
  { key: 'spec-kit',       label: 'Spec-Kit',       icon: '🛠️' },
  { key: 'domain-library', label: 'Domain Library',  icon: '◈' },
  { key: 'smart',          label: 'Smart Nodes',     icon: '⚡' },
  { key: 'custom',         label: 'My Nodes',        icon: '✦' },
] as const;

type CategoryKey = typeof CATEGORY_META[number]['key'];

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

  useEffect(() => {
    if (customPaletteItems.length > 0) setExpandedCategory('custom');
  }, [customPaletteItems.length]);

  const allItems = useMemo(
    () => [...PALETTE_ITEMS, ...customPaletteItems],
    [customPaletteItems],
  );

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
    <div className="m-4 w-80 bg-gray-900 border border-gray-800 rounded-lg shadow-xl relative z-20 flex flex-col h-[calc(100vh-2rem)] pointer-events-auto">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-6 py-6 flex-shrink-0 border-b border-gray-800">
          <Badge label="Protocol v1.0" color="#3b82f6" className="mb-3" />
          <h1 className="text-2xl font-semibold text-white flex items-center gap-2 tracking-tight">
            <span className="text-blue-500">⬡</span>
            Crafter
          </h1>
          <p className="text-xs text-gray-500 mt-2 font-mono">Node Compiler</p>
        </div>

        {/* Search */}
        <div className="px-4 py-4 flex-shrink-0 border-b border-gray-800 bg-gray-900/50">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search nodes…"
          />
        </div>

        {/* Node Palette */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 custom-scrollbar bg-gray-900">
          {searchResults ? (
            <div className="space-y-1.5">
              {searchResults.length === 0 ? (
                <div className="flex flex-col items-center py-10 opacity-50">
                  <p className="text-sm text-gray-400">No nodes found</p>
                </div>
              ) : (
                searchResults.map((item) => (
                  <PaletteNodeItem
                    key={item.nodeType}
                    label={item.label}
                    nodeId={item.nodeType}
                    color={item.color}
                    description={item.description}
                    badge={CATEGORY_BADGE[item.category] ?? item.category}
                    domain={item.domain}
                    onAdd={() => handleAdd(item.nodeType as PromptNodeType)}
                    onDelete={item._deletable ? () => removeCustomPaletteItem(item.nodeType as string) : undefined}
                  />
                ))
              )}
            </div>
          ) : (
            CATEGORY_META.map((cat) => {
              const count = countFor(cat.key);
              const isExpanded = expandedCategory === cat.key;
              return (
                <div key={cat.key}>
                  <button
                    onClick={() => setExpandedCategory(isExpanded ? '' : cat.key)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-md transition-colors ${
                      isExpanded ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-sm">{cat.icon}</span>
                      {cat.label}
                    </span>
                    <span className="text-[10px] bg-gray-800 text-gray-500 px-2 py-0.5 rounded font-mono">
                      {count}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="mt-2 ml-2 space-y-1.5 border-l border-gray-800 pl-2">
                      {cat.key === 'custom' && (
                        <>
                          {customPaletteItems.length === 0 && !showCustomForm ? (
                            <p className="text-xs text-gray-500 px-2 py-2">No custom nodes.</p> 
                          ) : (
                            customPaletteItems.map((item) => (
                              <PaletteNodeItem
                                key={item.nodeType}
                                label={item.label}
                                nodeId={item.nodeType}
                                color={item.color}
                                description={item.description}
                                onAdd={() => handleAdd(item.nodeType as PromptNodeType)}
                                onDelete={() => removeCustomPaletteItem(item.nodeType as string)}
                              />
                            ))
                          )}
                          {showCustomForm ? (
                            <div className="p-3 bg-gray-800 rounded-md mt-2">
                              <CustomNodeForm
                                onSave={(item) => { addCustomPaletteItem(item); setShowCustomForm(false); }}
                                onCancel={() => setShowCustomForm(false)}
                              />
                            </div>
                          ) : (
                            <button
                              onClick={() => setShowCustomForm(true)}
                              className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 border border-dashed border-blue-500/30 rounded-md transition-colors"
                            >
                              + New Custom Node
                            </button>
                          )}
                        </>
                      )}

                      {cat.key === 'domain-library' && allDomains.map((domain) => {
                        const domainItems = allItems.filter(p => p.category === 'domain-library' && p.domain === domain);
                        const isDomExpanded = expandedDomain === domain;
                        return (
                          <div key={domain} className="mb-1">
                            <button
                              onClick={() => setExpandedDomain(isDomExpanded ? null : domain)}
                              className="w-full flex items-center justify-between px-2 py-1.5 text-[11px] font-medium text-gray-400 hover:text-gray-200 transition-colors"
                            >
                              <span>{domain}</span>
                              <span className={`text-[10px] transition-transform ${isDomExpanded ? 'rotate-90 text-blue-400' : 'opacity-50'}`}>▸</span>
                            </button>
                            {isDomExpanded && (
                              <div className="mt-1 space-y-1">
                                {domainItems.map((item) => (
                                  <PaletteNodeItem
                                    key={item.nodeType}
                                    label={item.label}
                                    nodeId={item.nodeType}
                                    color={item.color}
                                    description={item.description}
                                    onAdd={() => handleAdd(item.nodeType as PromptNodeType)}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {(cat.key === 'core' || cat.key === 'smart' || cat.key === 'spec-kit') && allItems
                        .filter(p => {
                          const isSpecKit = p.nodeType.toString().startsWith('speckit_');
                          return cat.key === 'spec-kit' ? isSpecKit : (p.category === cat.key && !isSpecKit);
                        })
                        .map((item) => (
                          <PaletteNodeItem
                            key={item.nodeType}
                            label={item.label}
                            nodeId={item.nodeType}
                            color={item.color}
                            description={item.description}
                            onAdd={() => handleAdd(item.nodeType as PromptNodeType)}
                          />
                        ))
                      }
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Compile Button */}
        <div className="p-4 border-t border-gray-800 bg-gray-900 flex-shrink-0">
          <button
            onClick={() => {
              if (!outputPanelOpen && nodes.length > 0) {
                const { xml } = compile(nodes, edges);
                saveVersion(undefined, xml);
              }
              setOutputPanelOpen(!outputPanelOpen);
            }}
            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-md font-semibold text-sm transition-colors ${
              outputPanelOpen
                ? 'bg-gray-700 text-white hover:bg-gray-600'
                : warningCount > 0
                  ? 'bg-amber-600 text-white hover:bg-amber-500'
                  : 'bg-blue-600 text-white hover:bg-blue-500'
            }`}
          >
            <span>{outputPanelOpen ? 'Close Output' : 'Compile'}</span>
            <div className="flex items-center gap-2">
              {!outputPanelOpen && warningCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-yellow-300 animate-pulse" />
              )}
              <span>{outputPanelOpen ? '✕' : '▶'}</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );}
