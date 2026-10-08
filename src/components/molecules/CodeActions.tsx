import { useState } from 'react';
import { Brain, TreeStructure } from '@phosphor-icons/react';
import { useCodeStore } from '../../codeIndex/store';
import { summarizeEntities } from '../../codeIndex/summarize';
import { clusterFeatures } from '../../codeIndex/cluster';
import { toast } from '../../toast';

export default function CodeActions() {
  const entities = useCodeStore((s) => s.entities);
  const links = useCodeStore((s) => s.links);
  const snippets = useCodeStore((s) => s.snippets);
  const setSummaries = useCodeStore((s) => s.setSummaries);
  const setFeatures = useCodeStore((s) => s.setFeatures);
  const setView = useCodeStore((s) => s.setView);
  const [busy, setBusy] = useState<'idle' | 'summarize' | 'cluster'>('idle');
  const [pct, setPct] = useState('');

  const unsummarized = entities.filter((e) => !e.summary).length;

  const runSummarize = async () => {
    setBusy('summarize');
    try {
      const importCounts = new Map<string, number>();
      for (const l of links) {
        if (l.kind === 'imports') importCounts.set(l.source, (importCounts.get(l.source) ?? 0) + 1);
      }
      const map = await summarizeEntities(entities, {
        importCounts,
        getContent: (e) => {
          const full = snippets[e.path];
          if (!full) return '';
          if (e.kind === 'FUNC' && e.range) {
            const lines = full.split('\n');
            return lines.slice(e.range.start, e.range.end).join('\n');
          }
          return full.slice(0, 900);
        },
        onProgress: (d, t) => setPct(`${d}/${t}`),
      });
      setSummaries(map);
      toast('Summaries ready — each node now says what it does', 'success');
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy('idle'); setPct('');
    }
  };

  const runCluster = async () => {
    setBusy('cluster');
    try {
      const feats = await clusterFeatures(entities);
      setFeatures(feats);
      setView('feature');
      toast(`${feats.length} features detected`, 'success');
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy('idle');
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button onClick={() => void runSummarize()} disabled={busy !== 'idle' || entities.length === 0}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-800 text-xs text-zinc-300 hover:border-zinc-600 disabled:opacity-40 transition-colors">
        <Brain size={13} className="text-zinc-500" />
        {busy === 'summarize' ? `Summarizing ${pct}…` : unsummarized > 0 ? `Summarize (${unsummarized})` : 'Summarized'}
      </button>
      <button onClick={() => void runCluster()} disabled={busy !== 'idle' || entities.length === 0}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-800 text-xs text-zinc-300 hover:border-zinc-600 disabled:opacity-40 transition-colors">
        <TreeStructure size={13} className="text-zinc-500" />
        {busy === 'cluster' ? 'Detecting…' : 'Detect features'}
      </button>
    </div>
  );
}
