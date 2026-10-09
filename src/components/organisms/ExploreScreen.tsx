import { useRef, useState } from 'react';
import { ArrowsClockwise, Export, Gear } from '@phosphor-icons/react';
import { useCodeStore } from '../../codeIndex/store';
import { filesFromDirectoryUpload } from '../../codeIndex/ingest';
import { toast } from '../../toast';
import FileTree from './FileTree';
import CodeGraphCanvas from './CodeGraphCanvas';
import AddFeatureBar from './AddFeatureBar';
import CodeActions from '../molecules/CodeActions';
import ExportModal from './ExportModal';
import SettingsModal from './SettingsModal';

export default function ExploreScreen() {
  const view = useCodeStore((s) => s.view);
  const setView = useCodeStore((s) => s.setView);
  const repo = useCodeStore((s) => s.repo);
  const entities = useCodeStore((s) => s.entities);
  const links = useCodeStore((s) => s.links);
  const setScreen = useCodeStore((s) => s.setScreen);
  const clear = useCodeStore((s) => s.clear);
  const setLevel = useCodeStore((s) => s.setLevel);
  const focusedFolder = useCodeStore((s) => s.focusedFolder);
  const focusFolder = useCodeStore((s) => s.focusFolder);
  const selectedId = useCodeStore((s) => s.selectedId);
  const [exportOpen, setExportOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const mergeRaw = useCodeStore((s) => s.mergeRaw);
  const syncRef = useRef<HTMLInputElement>(null);

  const exportFeatureId =
    entities.find((e) => e.id === selectedId && (e.kind === 'FEATURE' || e.kind === 'FEATURE_PROPOSED'))?.id
    ?? entities.find((e) => e.kind === 'FEATURE' || e.kind === 'FEATURE_PROPOSED')?.id
    ?? null;

  return (
    <div className="h-full w-full flex flex-col bg-zinc-950">
      {/* top bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-zinc-800 shrink-0 flex-wrap">
        <span className="text-xs font-medium text-zinc-200 font-mono truncate max-w-48" title={repo?.name}>
          {repo?.name}{repo?.branch ? <span className="text-zinc-600">:{repo.branch}</span> : null}
        </span>
        <div className="flex items-center gap-0.5 p-0.5 rounded-md bg-zinc-900 border border-zinc-800">
          {(['structure', 'feature'] as const).map((v) => (
            <button key={v} onClick={() => setView(v)}
              className={`px-2.5 py-1 rounded text-xs ${view === v ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-200'}`}>
              {v === 'structure' ? 'Folders' : 'Features'}
            </button>
          ))}
        </div>
        {focusedFolder && view === 'structure' && (
          <button onClick={() => { focusFolder(null); setLevel('folder'); }}
            className="px-2.5 py-1 rounded-md text-xs text-zinc-400 border border-zinc-800 hover:border-zinc-600 font-mono">
            ↑ {focusedFolder}
          </button>
        )}
        <div className="ml-auto flex items-center gap-2">
          <CodeActions />
          <button onClick={() => setExportOpen(true)} disabled={!exportFeatureId}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 text-white text-xs hover:bg-blue-500 disabled:opacity-40 transition-colors"
            title={exportFeatureId ? 'Export builder + checker prompts' : 'Add or select a feature first'}>
            <Export size={13} weight="bold" /> Export
          </button>
          <button onClick={() => syncRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-800 text-xs text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors"
            title="Re-upload the folder — only changed files are re-indexed">
            <ArrowsClockwise size={13} /> Sync
          </button>
          <input ref={syncRef} type="file" multiple className="hidden"
            // @ts-expect-error webkitdirectory is non-standard but widely supported
            webkitdirectory=""
            onChange={async (e) => {
              const files = e.target.files;
              if (!files || files.length === 0) return;
              const raw = await filesFromDirectoryUpload(files);
              const d = mergeRaw(raw);
              toast(`Sync: +${d.added} ~${d.changed} −${d.removed} (unchanged kept)`, 'success');
              e.target.value = '';
            }}
          />
          <span className="text-[11px] font-mono text-zinc-600">{entities.length} nodes · {links.length} edges</span>
          <button onClick={() => setSettingsOpen(true)} title="Settings — LLM API key and model"
            className="w-7 h-7 flex items-center justify-center rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 transition-colors">
            <Gear size={15} weight="bold" />
          </button>
          <button onClick={() => setScreen('prompt')} className="text-xs text-zinc-500 hover:text-zinc-200 transition-colors">Canvas</button>
          <button onClick={() => { clear(); }} className="text-xs text-zinc-600 hover:text-red-400 transition-colors">New import</button>
        </div>
      </div>
      <AddFeatureBar />
      <div className="flex-1 flex min-h-0">
        <FileTree />
        <CodeGraphCanvas />
      </div>
      {exportOpen && exportFeatureId && <ExportModal featureId={exportFeatureId} onClose={() => setExportOpen(false)} />}
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
