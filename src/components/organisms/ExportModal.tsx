import { useEffect, useMemo, useState } from 'react';
import { Copy, Check, X } from '@phosphor-icons/react';
import { useCodeStore } from '../../codeIndex/store';
import { buildBuilderPrompt, buildCheckerPrompt } from '../../codeIndex/export';

export default function ExportModal({ featureId, onClose }: { featureId: string; onClose: () => void }) {
  const entities = useCodeStore((s) => s.entities);
  const links = useCodeStore((s) => s.links);
  const snippets = useCodeStore((s) => s.snippets);
  const repo = useCodeStore((s) => s.repo);
  const [tab, setTab] = useState<'builder' | 'checker'>('builder');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const text = useMemo(
    () => (tab === 'builder'
      ? buildBuilderPrompt({ featureId, entities, links, snippets, repo })
      : buildCheckerPrompt({ featureId, entities, links, snippets, repo })),
    [tab, featureId, entities, links, snippets, repo],
  );

  const copy = async () => {
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70" />
      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-lg bg-zinc-950 border border-zinc-800 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-zinc-800">
          <h2 className="text-sm font-semibold text-white">Export</h2>
          <div className="ml-1 flex gap-1 p-0.5 rounded-md bg-zinc-900 border border-zinc-800">
            {(['builder', 'checker'] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-2.5 py-1 rounded text-[11px] ${tab === t ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-200'}`}>
                {t === 'builder' ? 'Builder' : 'Checker'}
              </button>
            ))}
          </div>
          <div className="ml-auto flex gap-2">
            <button onClick={() => void copy()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-700 text-zinc-300 text-xs hover:border-zinc-500 transition-colors">
              {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copied' : 'Copy'}
            </button>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-800 text-zinc-500">
              <X size={16} weight="bold" />
            </button>
          </div>
        </div>
        <p className="px-5 pt-3 text-[11px] text-zinc-500">
          {tab === 'builder'
            ? 'Paste into any coding agent to implement the feature.'
            : 'After the agent finishes, paste its diff into <diff_to_review> and run this to verify — no full re-index needed.'}
        </p>
        <div className="flex-1 overflow-auto p-5">
          <pre className="text-[11px] leading-relaxed text-zinc-300 font-mono whitespace-pre-wrap break-words">{text}</pre>
        </div>
      </div>
    </div>
  );
}
