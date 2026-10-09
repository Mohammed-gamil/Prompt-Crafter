import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cube,
  Wrench,
  Books,
  Lightning,
  Sparkle,
  MagnifyingGlass,
  Plus,
  CaretRight,
  CaretLeft,
  Play,
  X
} from '@phosphor-icons/react';
import { PALETTE_ITEMS } from '../../presets';
import { compile } from '../../compiler';
import { useAppStore } from '../../store';
import type { PaletteItem, PromptNodeType } from '../../types';
import CustomNodeForm from './CustomNodeForm';
import SearchBar from '../molecules/SearchBar';
import PaletteNodeItem from '../molecules/PaletteNodeItem';

const CATEGORY_META = [
  { key: 'core',           label: 'Core Nodes',     icon: Cube },
  { key: 'spec-kit',       label: 'Spec-Kit',       icon: Wrench },
  { key: 'domain-library', label: 'Domain Library',  icon: Books },
  { key: 'smart',          label: 'Smart Nodes',     icon: Lightning },
  { key: 'custom',         label: 'My Nodes',        icon: Sparkle },
] as const;

type CategoryKey = typeof CATEGORY_META[number]['key'];

const CATEGORY_BADGE: Record<string, string> = {
  core:           'CORE',
  'spec-kit':     'SPEC',
  'domain-library': 'LIB',
  smart:          'SMART',
  custom:         'MINE',
};

const SPRING_TRANSITION = { type: 'spring', stiffness: 300, damping: 30 } as const;

export default function Sidebar({ onCollapse }: { onCollapse?: () => void }) {
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
    <div
      className="m-4 w-80 bg-zinc-950 border border-zinc-800 rounded-lg relative z-20 flex flex-col h-[calc(100vh-2rem)] pointer-events-auto overflow-hidden"
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-5 py-5 flex-shrink-0 border-b border-zinc-800">
          <div className="flex items-center justify-between">
            <h1 className="text-base font-semibold text-white flex items-center gap-2.5">
              <span className="text-blue-500 flex items-center justify-center bg-blue-500/10 w-7 h-7 rounded-md border border-blue-500/20">
                <Cube size={15} weight="duotone" />
              </span>
              Prompt Crafter
            </h1>
            {onCollapse && (
              <button onClick={onCollapse} title="Hide sidebar"
                className="w-7 h-7 flex items-center justify-center rounded-md text-zinc-600 hover:text-zinc-300 hover:bg-zinc-900 transition-colors">
                <CaretLeft size={14} weight="bold" />
              </button>
            )}
          </div>
          <p className="text-[11px] text-zinc-500 mt-2">Node palette</p>
        </div>

        {/* Search */}
        <div className="px-4 py-3 flex-shrink-0 border-b border-zinc-800">
          <div className="relative flex items-center group">
            <div className="absolute left-3 text-zinc-500 group-focus-within:text-blue-400 transition-colors pointer-events-none">
              <MagnifyingGlass size={14} weight="bold" />
            </div>
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Search nodes..."
            />
          </div>
        </div>

        {/* Node Palette */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 custom-scrollbar">
          {searchResults ? (
            <div
              className="space-y-2"
            >
              {searchResults.length === 0 ? (
                <div className="flex flex-col items-center py-16 text-zinc-600">
                  <MagnifyingGlass size={20} />
                  <p className="text-xs mt-3">No results</p>
                </div>
              ) : (
                searchResults.map((item) => (
                  <div
                    key={item.nodeType}
                  >
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
            CATEGORY_META.map((cat) => {
              const count = countFor(cat.key);
              const isExpanded = expandedCategory === cat.key;
              const Icon = cat.icon;
              return (
                <div key={cat.key} className="space-y-3">
                  <button
                    onClick={() => setExpandedCategory(isExpanded ? '' : cat.key)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-md transition-colors group ${
                      isExpanded ? 'bg-zinc-900 text-white border border-zinc-800' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 border border-transparent'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <span className={`${isExpanded ? 'text-blue-400' : 'opacity-50 group-hover:opacity-100'}`}>
                        <Icon size={15} weight={isExpanded ? "duotone" : "regular"} />
                      </span>
                      {cat.label}
                    </span>
                    <span className="text-[10px] bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded font-mono">
                      {count.toString().padStart(2, '0')}
                    </span>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={SPRING_TRANSITION}
                        className="overflow-hidden"
                      >
                        <div className="ml-2 space-y-2 border-l border-zinc-800 pl-3 py-1">
                          {cat.key === 'custom' && (
                            <>
                              {customPaletteItems.length === 0 && !showCustomForm ? (
                                <p className="text-[11px] text-zinc-600 px-2 py-4 leading-relaxed">No custom nodes yet.</p> 
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
                                <div
                                  className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg mt-2"
                                >
                                  <CustomNodeForm
                                    onSave={(item) => { addCustomPaletteItem(item); setShowCustomForm(false); }}
                                    onCancel={() => setShowCustomForm(false)}
                                  />
                                </div>
                              ) : (
                                <button
                                  onClick={() => setShowCustomForm(true)}
                                  className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200 border border-dashed border-zinc-700 hover:border-zinc-500 rounded-lg transition-colors"
                                >
                                  <Plus size={13} weight="bold" /> New node
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
                                  className="w-full flex items-center justify-between px-2 py-1.5 text-[11px] font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
                                >
                                  <span>{domain}</span>
                                  <span
                                    className={`${isDomExpanded ? 'text-blue-400' : 'opacity-40'}`}
                                  >
                                    <CaretRight size={10} weight="bold" />
                                  </span>
                                </button>
                                <AnimatePresence>
                                  {isDomExpanded && (
                                    <motion.div 
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      className="mt-1 space-y-1.5 overflow-hidden pl-2 border-l border-zinc-800/50 ml-1"
                                    >
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
                                    </motion.div>
                                  )}
                                </AnimatePresence>
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
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </div>

        {/* Compile Button */}
        <div className="p-4 border-t border-zinc-800 flex-shrink-0">
          <button
            onClick={() => {
              if (!outputPanelOpen && nodes.length > 0) {
                const { xml } = compile(nodes, edges);
                saveVersion(undefined, xml);
              }
              setOutputPanelOpen(!outputPanelOpen);
            }}
            className={`w-full flex items-center justify-between pl-4 pr-1.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              outputPanelOpen
                ? 'bg-zinc-800 text-white'
                : warningCount > 0
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/25'
                  : 'bg-blue-600 text-white hover:bg-blue-500'
            }`}
          >
            <span className="flex items-center gap-2">
              {outputPanelOpen ? 'Close output' : 'Compile'}
              {!outputPanelOpen && warningCount > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              )}
            </span>
            <div className={`w-7 h-7 rounded-md flex items-center justify-center ${
              outputPanelOpen ? 'bg-zinc-700 text-white' : 'bg-white/10 text-white'
            }`}>
              {outputPanelOpen ? <X size={14} weight="bold" /> : <Play size={14} weight="fill" />}
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}