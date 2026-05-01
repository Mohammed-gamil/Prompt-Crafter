import { useMemo, useCallback, useState } from 'react';
import { useAppStore } from '../../store';
import { compile } from '../../compiler';
import { adviseCompiledXml } from '../../advisor';
import { convertOutput } from '../../formatConverter';
import type { OutputFormat } from '../../types';
import FormatSelector from '../molecules/FormatSelector';
import AuditStamp from '../molecules/AuditStamp';
import WarningList from '../molecules/WarningList';

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
        transition: 'all 0.3s ease-out',
        opacity: outputPanelOpen ? 1 : 0,
        transform: outputPanelOpen ? 'translateX(0)' : 'translateX(20px)',
      }}
      className="m-4 relative z-30 pointer-events-auto overflow-hidden bg-gray-900 border border-gray-800 rounded-lg shadow-xl flex flex-col h-[calc(100vh-2rem)]"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800 bg-gray-900 flex-shrink-0">
        <div>
          <h2 className="text-lg font-semibold text-white">Compiled Output</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-blue-600/10 border border-blue-500/20 text-blue-400 hover:bg-blue-600/20 transition-colors"
          >
            <span className="text-xs font-semibold">{copied ? 'Copied' : 'Copy'}</span>
            <span className="text-xs">{copied ? '✓' : '⧉'}</span>
          </button>
          <button
            onClick={() => setOutputPanelOpen(false)}
            className="text-gray-500 hover:text-gray-300 transition-colors px-2 py-1"
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
        <div className="px-6 py-4 border-b border-gray-800 bg-gray-900/50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Diagnostic Advisor</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-blue-400 font-medium">Score:</span>
              <span className="text-xs text-white font-bold bg-blue-500/20 px-2 py-0.5 rounded">{advice.quality_score}</span>
            </div>
          </div>
          {advice.issues.length > 0 ? (
            <ul className="space-y-2">
              {advice.issues.slice(0, 3).map((issue, i) => (
                <li key={i} className="text-[11px] text-gray-300 flex gap-2 items-start">
                  <span className="text-amber-500 mt-0.5">●</span>
                  <span>
                    <span className="uppercase text-[9px] font-bold text-gray-500 tracking-wider mr-2">[{issue.category}]</span>
                    {issue.description}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[11px] text-green-500 font-medium">No structural anomalies detected.</p>
          )}
        </div>

        {/* Output */}
        <div className="flex-1 overflow-auto p-6 custom-scrollbar bg-gray-950">
          <pre className="text-xs leading-relaxed text-gray-300 font-mono whitespace-pre-wrap break-words selection:bg-blue-500/30">
            {displayText}
          </pre>
        </div>
      </div>
    </div>
  );
}
