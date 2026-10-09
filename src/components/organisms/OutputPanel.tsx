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

const SPRING_TRANSITION = { type: 'spring', stiffness: 300, damping: 30 } as const;

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
          className="m-4 w-[520px] max-w-[calc(100vw-2rem)] relative z-30 pointer-events-auto overflow-hidden bg-zinc-950 border border-zinc-800 rounded-lg flex flex-col h-[calc(100vh-2rem)]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 flex-shrink-0">
            <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
                  <TerminalWindow size={16} weight="duotone" />
                </div>
                <h2 className="text-sm font-semibold text-white">Output</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-zinc-700 text-zinc-300 hover:border-zinc-500 transition-colors"
              >
                <span className="text-xs">{copied ? 'Copied' : 'Copy'}</span>
                {copied ? <Check size={13} weight="bold" /> : <Copy size={13} weight="bold" />}
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
            <div className="px-5 py-4 border-b border-zinc-800">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                   <ShieldCheck size={13} className="text-zinc-500" />
                   <span className="text-xs text-zinc-400">Suggestions</span>
                </div>
                <div className="flex items-center gap-2 px-2 py-0.5 rounded-md border border-zinc-800">
                  <span className="text-[11px] text-zinc-500">Score</span>
                  <span className="text-xs text-zinc-200 font-mono">{advice.quality_score}</span>
                </div>
              </div>
              {advice.issues.length > 0 ? (
                <ul className="space-y-2">
                  {advice.issues.slice(0, 3).map((issue, i) => (
                    <li key={i} className="text-[11px] text-zinc-400 flex gap-2.5 items-start p-2.5 rounded-md bg-zinc-900 border border-zinc-800">
                      <WarningCircle size={13} className="text-amber-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-[10px] text-zinc-500 font-mono mb-0.5">{issue.category}</p>
                        <p className="leading-relaxed">{issue.description}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex items-center gap-2 p-2.5 rounded-md border border-zinc-800">
                   <Check size={13} className="text-emerald-500" />
                   <p className="text-xs text-zinc-400">No issues found</p>
                </div>
              )}
            </div>

            {/* Output */}
            <div className="flex-1 overflow-auto p-5 custom-scrollbar bg-zinc-950">
              <pre className="text-xs leading-relaxed text-zinc-400 font-mono whitespace-pre-wrap break-words">
                {displayText}
              </pre>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
