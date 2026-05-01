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
    <div className="m-6 w-85 double-bezel relative z-20 flex flex-col overflow-hidden h-[calc(100vh-3rem)] pointer-events-auto">
      <div className="double-bezel-inner flex flex-col">
        {/* Header */}
        <div className="px-8 py-10 flex-shrink-0">
          <Badge label="Protocol v1.0" color="#6366f1" className="mb-4" />
          <h1 className="text-3xl font-black text-white flex items-center gap-3 tracking-tighter leading-none">
            <span className="text-indigo-500 drop-shadow-[0_0_15px_rgba(99,102,241,0.6)]">⬡</span>
            Crafter
          </h1>
          <p className="text-[10px] text-gray-500 mt-4 font-mono uppercase tracking-[0.3em] opacity-40 leading-relaxed">Spatial Node Compiler</p>
        </div>

        {/* Search */}
        <div className="px-6 pb-6 flex-shrink-0">
          <div className="relative group">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Query components…"
            />
          </div>
        </div>

        {/* Node Palette */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 custom-scrollbar scroll-smooth">
          {searchResults ? (
            <div className="space-y-2">
              {searchResults.length === 0 ? (
                <div className="flex flex-col items-center py-20 opacity-20">
                  <div className="text-4xl mb-4 text-white">∅</div>
                  <p className="text-[10px] font-mono tracking-widest uppercase text-white">Null Set</p>
                </div>
              ) : (
                searchResults.map((item, i) => (
                  <div key={item.nodeType} style={{ animationDelay: `${i * 30}ms` }} className="animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both">
                    <PaletteNodeItem
                      label={item.label}
                      nodeId={item.nodeType}
                      color={item.color}
                      description={item.description}
                      badge={CATEGORY_BADGE[item.category] ?? item.category}
                      domain={item.domain}
                      onAdd={() => handleAdd(item.nodeType as PromptNodeType)}
                      onDelete={item._deletable ? () => removeCustomPaletteItem(item.nodeType as string) : undefined}
                    />
                  </div>
                ))
              )}
            </div>
          ) : (
            CATEGORY_META.map((cat, catIdx) => {
              const count = countFor(cat.key);
              const isExpanded = expandedCategory === cat.key;
              return (
                <div key={cat.key} className="animate-in fade-in slide-in-from-bottom-8 duration-1000 fill-mode-both" style={{ animationDelay: `${catIdx * 80}ms` }}>
                  <button
                    onClick={() => setExpandedCategory(isExpanded ? '' : cat.key)}
                    className={`w-full flex items-center justify-between px-4 py-3 text-[11px] font-black transition-all duration-500 ease-vanguard rounded-xl group ${
                      isExpanded ? 'bg-white/5 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]' : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.02]'
                    }`}
                  >
                    <span className="flex items-center gap-3 uppercase tracking-[0.2em]">
                      <span className={`text-xs transition-all duration-700 ${isExpanded ? 'scale-125 rotate-12 text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.4)]' : 'opacity-30 group-hover:opacity-100'}`}>{cat.icon}</span> 
                      {cat.label}
                    </span>
                    <span className="text-[9px] bg-white/5 text-gray-500 px-2.5 py-1 rounded-full font-mono border border-white/5 opacity-50 font-bold">
                      {count.toString().padStart(2, '0')}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="mt-4 ml-2 space-y-2 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-700">
                      {cat.key === 'custom' && (
                        <>
                          {customPaletteItems.length === 0 && !showCustomForm ? (
                            <p className="text-[10px] text-gray-600 px-3 py-4 font-medium italic opacity-50 leading-relaxed">No bespoke components detected. Import a pack or initialize a new node.</p>
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
                            <div className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-2xl mt-4 animate-in zoom-in-95 duration-500">
                              <CustomNodeForm
                                onSave={(item) => { addCustomPaletteItem(item); setShowCustomForm(false); }}
                                onCancel={() => setShowCustomForm(false)}
                              />
                            </div>
                          ) : (
                            <button
                              onClick={() => setShowCustomForm(true)}
                              className="w-full mt-4 flex items-center justify-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 hover:text-indigo-300 bg-indigo-500/5 border border-dashed border-indigo-500/20 hover:border-indigo-500/40 rounded-xl transition-all duration-500 ease-vanguard"
                            >
                              <span className="text-lg leading-none">+</span> New Component
                            </button>
                          )}
                        </>
                      )}

                      {cat.key === 'domain-library' && allDomains.map((domain) => {
                        const domainItems = allItems.filter(p => p.category === 'domain-library' && p.domain === domain);
                        const isDomExpanded = expandedDomain === domain;
                        return (
                          <div key={domain} className="mb-2">
                            <button
                              onClick={() => setExpandedDomain(isDomExpanded ? null : domain)}
                              className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-bold text-gray-500 hover:text-gray-300 uppercase tracking-widest transition-all"
                            >
                              <span>{domain}</span>
                              <span className={`text-[10px] transition-transform duration-500 ${isDomExpanded ? 'rotate-90 text-indigo-400' : 'opacity-30'}`}>▸</span>
                            </button>
                            {isDomExpanded && (
                              <div className="mt-2 space-y-1.5 animate-in slide-in-from-left-4 duration-500">
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

        {/* Compile Button: Vanguard Island CTA */}
        <div className="px-6 py-8 border-t border-white/[0.03] flex-shrink-0">
          <button
            onClick={() => {
              if (!outputPanelOpen && nodes.length > 0) {
                const { xml } = compile(nodes, edges);
                saveVersion(undefined, xml);
              }
              setOutputPanelOpen(!outputPanelOpen);
            }}
            className={`group w-full relative flex items-center justify-between pl-6 pr-2 py-2 rounded-full font-black text-[11px] uppercase tracking-[0.2em] transition-all duration-700 ease-vanguard overflow-hidden shadow-2xl ${
              outputPanelOpen 
                ? 'bg-white/10 text-white' 
                : warningCount > 0 
                  ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-amber-500/10' 
                  : 'bg-indigo-600 text-white shadow-indigo-500/20'
            }`}
          >
            <span className="relative z-10">{outputPanelOpen ? 'Deactivate Output' : 'Initialize Compile'}</span>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center relative z-10 transition-transform duration-700 ease-vanguard group-hover:scale-110 ${
              outputPanelOpen ? 'bg-white/10 text-white' : 'bg-black/20 text-white'
            }`}>
              {outputPanelOpen ? '✕' : '▶'}
            </div>
            {!outputPanelOpen && warningCount > 0 && (
              <div className="absolute top-0 right-10 flex items-center h-full">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
