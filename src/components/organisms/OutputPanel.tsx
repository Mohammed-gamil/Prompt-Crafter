import { useMemo, useCallback, useState } from 'react';
import { useAppStore } from '../../store';
import { compile } from '../../compiler';
import { adviseCompiledXml } from '../../advisor';
import { convertOutput } from '../../formatConverter';
import type { OutputFormat } from '../../types';
import FormatSelector from '../molecules/FormatSelector';
import AuditStamp from '../molecules/AuditStamp';
import WarningList from '../molecules/WarningList';
import Badge from '../atoms/Badge';

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
    <div
      style={{
        width: outputPanelOpen ? '520px' : '0px',
        flexShrink: 0,
        transition: 'all 0.8s var(--ease-vanguard)',
        opacity: outputPanelOpen ? 1 : 0,
        transform: outputPanelOpen ? 'translateX(0) scale(1)' : 'translateX(20px) scale(0.98)',
        filter: outputPanelOpen ? 'blur(0)' : 'blur(8px)',
      }}
      className="m-6 relative z-30 pointer-events-auto overflow-hidden"
    >
      <div className="h-full double-bezel flex flex-col">
        <div className="double-bezel-inner flex flex-col overflow-hidden bg-ink-900/80 backdrop-blur-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-8 py-6 border-b border-white/[0.03] bg-white/[0.01]">
            <div>
              <Badge label="Protocol Stream" color="#6366f1" className="mb-2" />
              <h2 className="text-xl font-black text-white uppercase tracking-tighter">Compiled Output</h2>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleCopy}
                className="group relative flex items-center gap-3 pl-4 pr-1.5 py-1.5 rounded-full bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 transition-all duration-700 ease-vanguard hover:bg-indigo-600/20 active:scale-95"
              >
                <span className="text-[10px] font-black uppercase tracking-widest">{copied ? 'Copied' : 'Copy'}</span>
                <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[10px]">
                  {copied ? '✓' : '⧉'}
                </div>
              </button>
              <button
                onClick={() => setOutputPanelOpen(false)}
                className="text-xs w-8 h-8 flex items-center justify-center rounded-full border border-white/5 hover:bg-white/10 text-gray-500 transition-all duration-700 ease-vanguard"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col">
            <FormatSelector value={format} onChange={setFormat} />
            <AuditStamp audit={audit} />
            <WarningList warnings={warnings} />

            {/* Advisor summary */}
            <div className="px-8 py-5 border-b border-white/[0.03] bg-white/[0.01]">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Diagnostic Advisor</span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-indigo-400 font-bold">CORE_SCORE:</span>
                  <span className="text-[11px] font-mono text-white font-bold bg-indigo-500/20 px-2 py-0.5 rounded-full">{advice.quality_score}</span>
                </div>
              </div>
              {advice.issues.length > 0 ? (
                <ul className="space-y-2">
                  {advice.issues.slice(0, 3).map((issue, i) => (
                    <li key={i} className="text-[11px] text-gray-400 flex gap-3 animate-in fade-in slide-in-from-left-4 duration-700" style={{ animationDelay: `${i * 100}ms` }}>
                      <span className="text-amber-500 font-mono mt-1">⬢</span>
                      <span>
                        <span className="uppercase text-[9px] font-black text-gray-600 tracking-widest mr-2">[{issue.category}]</span>
                        {issue.description}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[11px] text-emerald-500/80 font-bold tracking-tight uppercase">No structural anomalies detected.</p>
              )}
            </div>

            {/* Output */}
            <div className="flex-1 overflow-auto p-8 custom-scrollbar">
              <pre className="text-[12px] leading-[1.8] text-gray-400 font-mono whitespace-pre-wrap break-words selection:bg-indigo-500/30 tracking-tight">
                {displayText}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
