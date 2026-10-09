import { useState } from 'react';
import { Plus, Check, X } from '@phosphor-icons/react';
import { useCodeStore } from '../../codeIndex/store';
import { proposeFeature } from '../../codeIndex/propose';
import { toast } from '../../toast';

export default function AddFeatureBar() {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [risks, setRisks] = useState<string[]>([]);
  const applyProposal = useCodeStore((s) => s.applyProposal);
  const acceptProposal = useCodeStore((s) => s.acceptProposal);
  const dismissProposed = useCodeStore((s) => s.dismissProposed);
  const addManualFeature = useCodeStore((s) => s.addManualFeature);
  const setView = useCodeStore((s) => s.setView);
  const select = useCodeStore((s) => s.select);
  const selectedId = useCodeStore((s) => s.selectedId);
  const entities = useCodeStore((s) => s.entities);
  const links = useCodeStore((s) => s.links);
  const snippets = useCodeStore((s) => s.snippets);
  const proposedCount = entities.filter((e) => e.proposed).length;

  const addManual = () => {
    if (!name.trim()) return;
    const id = addManualFeature(
      name.trim(),
      desc.trim() || 'User-defined feature.',
      selectedId && entities.some((e) => e.id === selectedId) ? [selectedId] : [],
    );
    setName(''); setDesc(''); setOpen(false); setView('feature'); select(id);
  };

  const autoMap = async () => {
    if (!name.trim()) { toast('Name the feature first', 'warning'); return; }
    setBusy(true);
    try {
      const { entities: pe, links: pl, risks: r } = await proposeFeature(name.trim(), desc.trim() || name.trim(), entities, links, snippets);
      applyProposal(pe, pl);
      setRisks(r);
      setOpen(false);
      toast(`${pe.length - 1} proposed items (70% opacity) — accept or dismiss`, 'success');
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="shrink-0 bg-zinc-950">
      {proposedCount > 0 && (
        <div className="px-4 py-2 border-b border-zinc-800 flex items-center gap-3">
          <span className="text-xs text-zinc-300">{proposedCount} proposed — accept or dismiss</span>
          {risks.length > 0 && <span className="text-[11px] text-zinc-600 truncate">{risks[0]}</span>}
          <div className="ml-auto flex gap-2">
            <button onClick={acceptProposal} className="flex items-center gap-1 px-3 py-1 rounded-md bg-zinc-100 text-zinc-900 text-xs hover:bg-white transition-colors">
              <Check size={11} weight="bold" /> Accept
            </button>
            <button onClick={() => { dismissProposed(); setRisks([]); }} className="flex items-center gap-1 px-3 py-1 rounded-md border border-zinc-800 text-xs text-zinc-500 hover:text-zinc-200 transition-colors">
              <X size={11} weight="bold" /> Dismiss
            </button>
          </div>
        </div>
      )}
      {!open ? (
        <div className="px-4 py-2 border-b border-zinc-800 flex items-center gap-2">
          <button onClick={() => setOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-800 text-xs text-zinc-300 hover:border-zinc-600 transition-colors">
            <Plus size={12} weight="bold" /> Add feature
          </button>
          <span className="text-[11px] text-zinc-600">Describe it — the model maps files and drafts the rest.</span>
        </div>
      ) : (
        <div className="px-4 py-2.5 border-b border-zinc-800 flex items-center gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Feature name"
            className="w-52 text-xs bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-600" />
          <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What should it do?"
            onKeyDown={(e) => { if (e.key === 'Enter') void autoMap(); }}
            className="flex-1 text-xs bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-600" />
          <button onClick={() => void autoMap()} disabled={busy}
            className="px-3.5 py-1.5 rounded-md bg-blue-600 text-white text-xs hover:bg-blue-500 disabled:opacity-40 transition-colors">
            {busy ? 'Mapping…' : 'Generate'}
          </button>
          <button onClick={addManual} className="px-3 py-1.5 rounded-md border border-zinc-800 text-xs text-zinc-500 hover:text-zinc-200 transition-colors">Manual</button>
          <button onClick={() => setOpen(false)} className="text-xs text-zinc-600 hover:text-zinc-300 px-1.5">✕</button>
        </div>
      )}
    </div>
  );
}
