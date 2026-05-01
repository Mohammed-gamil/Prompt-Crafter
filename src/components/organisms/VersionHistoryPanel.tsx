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
      className="bg-[#13131d] border-r border-gray-800 flex flex-col h-full overflow-hidden"
    >
      <div className="w-[300px] h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <h2 className="text-sm font-bold text-white">Version History</h2>
          <button
            onClick={() => setHistoryOpen(false)}
            className="text-xs px-2 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Save snapshot */}
        <div className="px-4 py-3 border-b border-gray-800 bg-[#0d0d15]">
          <p className="text-[11px] text-gray-500 mb-2">Save current canvas as a named snapshot</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
              placeholder="Snapshot name (optional)"
              className="flex-1 text-xs bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={handleSave}
              className="text-xs px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
            >
              Save
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-auto">
          {versions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="text-3xl mb-3 opacity-20">🕐</div>
              <p className="text-xs text-gray-500">No snapshots yet.</p>
              <p className="text-[11px] text-gray-600 mt-1">
                Save a snapshot above, or compile a prompt to auto-save.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-800/60">
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
          <div className="px-4 py-2 border-t border-gray-800">
            <p className="text-[10px] text-gray-600">{versions.length}/{30} snapshots stored locally</p>
          </div>
        )}
      </div>
    </div>
  );
}
