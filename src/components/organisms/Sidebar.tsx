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
import Badge from '../atoms/Badge';

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

const SPRING_TRANSITION: any = { type: 'spring', stiffness: 300, damping: 30 };

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
    <motion.div 
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={SPRING_TRANSITION}
      className="m-4 w-80 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl relative z-20 flex flex-col h-[calc(100vh-2rem)] pointer-events-auto overflow-hidden"
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-6 py-8 flex-shrink-0 border-b border-zinc-800 bg-gradient-to-b from-zinc-900/50 to-transparent">
          <Badge label="Protocol v1.0" color="#3b82f6" className="mb-4" />
          <h1 className="text-3xl font-bold text-white flex items-center gap-3 tracking-tighter leading-none">
            <span className="text-blue-500 flex items-center justify-center bg-blue-500/10 w-8 h-8 rounded-lg border border-blue-500/20">
              <Cube size={20} weight="duotone" />
            </span>
            Crafter
          </h1>
          <p className="text-[10px] text-zinc-500 mt-4 font-mono uppercase tracking-[0.2em] font-medium">Spatial Node Compiler</p>
        </div>

        {/* Search */}
        <div className="px-4 py-4 flex-shrink-0 border-b border-zinc-800 bg-zinc-900/20">
          <div className="relative flex items-center group">
            <div className="absolute left-3 text-zinc-500 group-focus-within:text-blue-400 transition-colors pointer-events-none">
              <MagnifyingGlass size={14} weight="bold" />
            </div>
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Query protocol units..."
            />
          </div>
        </div>

        {/* Node Palette */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 custom-scrollbar bg-zinc-950/40">
          {searchResults ? (
            <motion.div 
              layout
              className="space-y-2"
            >
              {searchResults.length === 0 ? (
                <div className="flex flex-col items-center py-20 opacity-30">
                  <div className="w-12 h-12 rounded-full border-2 border-dashed border-zinc-700 flex items-center justify-center mb-4">
                    <MagnifyingGlass size={20} />
                  </div>
                  <p className="text-[10px] font-mono tracking-widest uppercase text-white">Null Set</p>
                </div>
              ) : (
                searchResults.map((item, i) => (
                  <motion.div 
                    key={item.nodeType} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
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
                  </motion.div>
                ))
              )}
            </motion.div>
          ) : (
            CATEGORY_META.map((cat) => {
              const count = countFor(cat.key);
              const isExpanded = expandedCategory === cat.key;
              const Icon = cat.icon;
              return (
                <div key={cat.key} className="space-y-3">
                  <button
                    onClick={() => setExpandedCategory(isExpanded ? '' : cat.key)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-[11px] font-bold rounded-lg transition-all duration-300 group ${
                      isExpanded ? 'bg-zinc-900 text-white border border-zinc-800 shadow-lg' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50 border border-transparent'
                    }`}
                  >
                    <span className="flex items-center gap-3 uppercase tracking-widest">
                      <span className={`transition-transform duration-500 ${isExpanded ? 'scale-110 text-blue-400' : 'opacity-40 group-hover:opacity-100'}`}>
                        <Icon size={16} weight={isExpanded ? "duotone" : "bold"} />
                      </span>
                      {cat.label}
                    </span>
                    <span className="text-[9px] bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full font-mono border border-zinc-700/50">
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
                                <p className="text-[10px] text-zinc-600 px-2 py-4 font-medium italic leading-relaxed">No bespoke components detected. Initialize a new node unit.</p> 
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
                                <motion.div 
                                  initial={{ scale: 0.95, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl mt-2"
                                >
                                  <CustomNodeForm
                                    onSave={(item) => { addCustomPaletteItem(item); setShowCustomForm(false); }}
                                    onCancel={() => setShowCustomForm(false)}
                                  />
                                </motion.div>
                              ) : (
                                <button
                                  onClick={() => setShowCustomForm(true)}
                                  className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2.5 text-[10px] font-bold uppercase tracking-widest text-blue-400 hover:text-blue-300 hover:bg-blue-500/5 border border-dashed border-blue-500/20 hover:border-blue-500/40 rounded-xl transition-all"
                                >
                                  <Plus size={14} weight="bold" /> New Component
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
                                  className="w-full flex items-center justify-between px-2 py-1.5 text-[10px] font-bold text-zinc-500 hover:text-zinc-300 uppercase tracking-widest transition-all"
                                >
                                  <span>{domain}</span>
                                  <motion.span 
                                    animate={{ rotate: isDomExpanded ? 90 : 0 }}
                                    className={`transition-colors ${isDomExpanded ? 'text-blue-400' : 'opacity-30'}`}
                                  >
                                    <CaretRight size={10} weight="bold" />
                                  </motion.span>
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
        <div className="p-6 border-t border-zinc-800 bg-zinc-900/50 flex-shrink-0">
          <button
            onClick={() => {
              if (!outputPanelOpen && nodes.length > 0) {
                const { xml } = compile(nodes, edges);
                saveVersion(undefined, xml);
              }
              setOutputPanelOpen(!outputPanelOpen);
            }}
            className={`w-full flex items-center justify-between pl-6 pr-2 py-2 rounded-xl font-bold text-xs uppercase tracking-widest transition-all duration-500 shadow-xl ${
              outputPanelOpen
                ? 'bg-zinc-800 text-white'
                : warningCount > 0
                  ? 'bg-amber-600/10 text-amber-500 border border-amber-500/20'
                  : 'bg-blue-600 text-white shadow-blue-500/20'
            }`}
          >
            <span className="font-mono">{outputPanelOpen ? 'CLOSE_OUTPUT' : 'INITIALIZE_COMPILE'}</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-500 ${
              outputPanelOpen ? 'bg-zinc-700 text-white' : 'bg-white/10 text-white'
            }`}>
              {outputPanelOpen ? <X size={16} weight="bold" /> : <Play size={16} weight="fill" />}
            </div>
            {!outputPanelOpen && warningCount > 0 && (
              <motion.div 
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute right-12 w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]" 
              />
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}