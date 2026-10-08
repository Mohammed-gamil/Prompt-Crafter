import { useState } from 'react';
import { useAppStore } from '../../store';
import { compile } from '../../compiler';
import { toast } from '../../toast';
import SnapshotItem from '../molecules/SnapshotItem';

export default function VersionHistoryPanel() {
  const versions = useAppStore((s) => s.versions);
  const historyOpen = useAppStore((s) => s.historyOpen);
  const setHistoryOpen = useAppStore((s) => s.setHistoryOpen);
  const saveVersion = useAppStore((s) => s.saveVersion);
  const restoreVersion = useAppStore((s) => s.restoreVersion);
  const deleteVersion = useAppStore((s) => s.deleteVersion);
  const nodes = useAppStore((s) => s.nodes);
  const edges = useAppStore((s) => s.edges);

  const [nameDraft, setNameDraft] = useState('');

  const handleSave = () => {
    if (nodes.length === 0) {
      toast('Nothing on the canvas to save', 'warning');
      return;
    }
    const { xml } = compile(nodes, edges);
    const name = nameDraft.trim() || undefined;
    saveVersion(name, xml);
    setNameDraft('');
    toast('Snapshot saved', 'success');
  };

  const handleRestore = (id: string, name: string) => {
    restoreVersion(id);
    toast(`Restored "${name}"`, 'success');
    setHistoryOpen(false);
  };

  const handleDelete = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteVersion(id);
    toast(`Deleted "${name}"`, 'info');
  };

  return (
    <div
      style={{
        width: historyOpen ? '300px' : '0px',
        flexShrink: 0,
        transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
      className="bg-zinc-950 border-r border-zinc-800 flex flex-col h-full overflow-hidden"
    >
      <div className="w-[300px] h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <h2 className="text-sm font-semibold text-white">History</h2>
          <button
            onClick={() => setHistoryOpen(false)}
            className="text-xs px-2 py-1 rounded-md border border-zinc-800 text-zinc-400 hover:border-zinc-600 transition-colors"
          >
            Close
          </button>
        </div>

        {/* Save snapshot */}
        <div className="px-4 py-3 border-b border-zinc-800">
          <div className="flex gap-2">
            <input
              type="text"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
              placeholder="Name (optional)"
              className="flex-1 text-xs bg-zinc-900 border border-zinc-800 rounded-md px-2.5 py-1.5 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
            />
            <button
              onClick={handleSave}
              className="text-xs px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white transition-colors"
            >
              Save
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-auto">
          {versions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <p className="text-xs text-zinc-500">No snapshots yet.</p>
              <p className="text-[11px] text-zinc-600 mt-1">
                Save one above, or compile to auto-save.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-zinc-800/60">
              {versions.map((v) => (
                <SnapshotItem
                  key={v.id}
                  version={v}
                  onRestore={handleRestore}
                  onDelete={handleDelete}
                />
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {versions.length > 0 && (
          <div className="px-4 py-2 border-t border-zinc-800">
            <p className="text-[10px] text-zinc-600">{versions.length}/30 stored locally</p>
          </div>
        )}
      </div>
    </div>
  );
}
