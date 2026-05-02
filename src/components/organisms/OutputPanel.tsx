import { useMemo, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Copy, 
  Check, 
  X, 
  ShieldCheck, 
  WarningCircle, 
  TerminalWindow
} from '@phosphor-icons/react';
import { useAppStore } from '../../store';
import { compile } from '../../compiler';
import { adviseCompiledXml } from '../../advisor';
import { convertOutput } from '../../formatConverter';
import type { OutputFormat } from '../../types';
import FormatSelector from '../molecules/FormatSelector';
import AuditStamp from '../molecules/AuditStamp';
import WarningList from '../molecules/WarningList';

const SPRING_TRANSITION: any = { type: 'spring', stiffness: 300, damping: 30 };

export default function OutputPanel() {
  const nodes = useAppStore((s) => s.nodes);
  const edges = useAppStore((s) => s.edges);
  const outputPanelOpen = useAppStore((s) => s.outputPanelOpen);
  const setOutputPanelOpen = useAppStore((s) => s.setOutputPanelOpen);
  const [copied, setCopied] = useState(false);
  const [format, setFormat] = useState<OutputFormat>('xml');

  const result = useMemo(() => compile(nodes, edges), [nodes, edges]);
  const advice = useMemo(() => adviseCompiledXml(result.xml), [result.xml]);
  const displayText = useMemo(() => convertOutput(result.xml, format), [result.xml, format]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(displayText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [displayText]);

  const { audit, warnings } = result;

  return (
    <AnimatePresence>
      {outputPanelOpen && (
        <motion.div
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 20, opacity: 0 }}
          transition={SPRING_TRANSITION}
          className="m-4 w-[520px] relative z-30 pointer-events-auto overflow-hidden bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col h-[calc(100vh-2rem)]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800 bg-gradient-to-b from-zinc-900/50 to-transparent flex-shrink-0">
            <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
                  <TerminalWindow size={20} weight="duotone" />
               </div>
               <h2 className="text-lg font-bold text-white tracking-tight">Compiled Output</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 hover:bg-blue-600/20 transition-all active:scale-95"
              >
                <span className="text-[10px] font-bold uppercase tracking-widest">{copied ? 'Copied' : 'Copy'}</span>
                {copied ? <Check size={14} weight="bold" /> : <Copy size={14} weight="bold" />}
              </button>
              <button
                onClick={() => setOutputPanelOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-800 text-zinc-500 transition-colors"
              >
                <X size={18} weight="bold" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col">
            <FormatSelector value={format} onChange={setFormat} />
            <AuditStamp audit={audit} />
            <WarningList warnings={warnings} />

            {/* Advisor summary */}
            <div className="px-6 py-6 border-b border-zinc-800 bg-zinc-900/10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                   <ShieldCheck size={14} className="text-zinc-500" />
                   <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Diagnostic Advisor</span>
                </div>
                <div className="flex items-center gap-2 bg-zinc-900 px-2 py-1 rounded-lg border border-zinc-800">
                  <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-tighter">Score</span>
                  <span className="text-xs text-blue-400 font-mono font-bold">{advice.quality_score}</span>
                </div>
              </div>
              {advice.issues.length > 0 ? (
                <ul className="space-y-3">
                  {advice.issues.slice(0, 3).map((issue, i) => (
                    <li key={i} className="text-[11px] text-zinc-300 flex gap-3 items-start p-2 rounded-lg bg-zinc-900/50 border border-zinc-800/50">
                      <WarningCircle size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                           <span className="uppercase text-[8px] font-bold text-zinc-500 tracking-widest">[{issue.category}]</span>
                        </div>
                        <p className="leading-relaxed opacity-90">{issue.description}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                   <Check size={14} className="text-emerald-500" />
                   <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">No structural anomalies detected</p>
                </div>
              )}
            </div>

            {/* Output */}
            <div className="flex-1 overflow-auto p-6 custom-scrollbar bg-zinc-950">
              <div className="relative">
                 <div className="absolute -left-2 top-0 bottom-0 w-px bg-zinc-800/30" />
                 <pre className="text-xs leading-relaxed text-zinc-400 font-mono whitespace-pre-wrap break-words selection:bg-blue-500/20 pl-4">
                   {displayText}
                 </pre>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
