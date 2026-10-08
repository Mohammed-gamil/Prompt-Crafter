import { FolderOpen } from '@phosphor-icons/react';
import { useCodeStore } from '../../codeIndex/store';

export default function CodebaseEntryButton() {
  const setScreen = useCodeStore((s) => s.setScreen);
  const repo = useCodeStore((s) => s.repo);
  return (
    <button
      onClick={() => setScreen(repo ? 'explore' : 'ingest')}
      className="pointer-events-auto flex items-center gap-2 px-3 py-2 rounded-md bg-zinc-900 border border-zinc-800 hover:border-zinc-600 transition-colors"
      title={repo ? `Open codebase graph (${repo.name})` : 'Add codebase reference graph'}
    >
      <FolderOpen size={14} weight="duotone" className="text-zinc-500" />
      <span className="text-xs text-zinc-300">
        {repo ? repo.name : 'Codebase'}
      </span>
    </button>
  );
}
