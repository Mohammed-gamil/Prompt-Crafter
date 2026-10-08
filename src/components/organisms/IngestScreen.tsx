import { useRef, useState } from 'react';
import { FolderOpen, GithubLogo, Flask, WarningCircle } from '@phosphor-icons/react';
import { useCodeStore } from '../../codeIndex/store';
import { filesFromDirectoryUpload, filesFromGithub, buildIndex, demoFiles } from '../../codeIndex/ingest';

export default function IngestScreen() {
  const loadIndexed = useCodeStore((s) => s.loadIndexed);
  const setScreen = useCodeStore((s) => s.setScreen);
  const setProgress = useCodeStore((s) => s.setProgress);
  const setError = useCodeStore((s) => s.setError);
  const setSnippets = useCodeStore((s) => s.setSnippets);
  const error = useCodeStore((s) => s.error);
  const [githubUrl, setGithubUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const dirRef = useRef<HTMLInputElement>(null);

  const doIndex = async (name: string, source: 'upload' | 'github' | 'demo', getRaw: () => Promise<{ path: string; content: string }[]>, branch?: string) => {
    setBusy(true);
    setError(null);
    setScreen('building');
    try {
      const raw = await getRaw();
      setProgress({ done: 0, total: raw.length, label: `Indexing ${raw.length} files…` });
      // yield to paint building screen
      await new Promise((r) => setTimeout(r, 30));
      const { entities, links, fileCount } = buildIndex(raw);
      setProgress({ done: raw.length, total: raw.length, label: 'Done' });
      const snippets: Record<string, string> = {};
      for (const f of raw) snippets[f.path] = f.content.slice(0, 2000);
      setSnippets(snippets);
      loadIndexed(
        { name, branch, importedAt: Date.now(), source, fileCount, entityCount: entities.length, commitSha: null },
        entities,
        links,
      );
    } catch (e) {
      setError((e as Error).message);
      setScreen('ingest');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="h-full w-full flex items-center justify-center bg-zinc-950 p-8 overflow-auto">
      <div className="w-full max-w-xl">
        <h1 className="text-xl font-semibold text-white mb-2">Add your codebase</h1>
        <p className="text-sm text-zinc-500 mb-8">Upload a folder or paste a public GitHub URL. Parsing runs locally — code only leaves your machine for summaries you trigger.</p>

        <div className="space-y-3">
          <button
            disabled={busy}
            onClick={() => dirRef.current?.click()}
            className="w-full flex items-center gap-4 p-4 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-600 transition-colors text-left disabled:opacity-50"
          >
            <FolderOpen size={18} weight="duotone" className="text-zinc-500 shrink-0" />
            <div>
              <p className="text-sm text-white">Upload folder</p>
              <p className="text-xs text-zinc-600 mt-0.5">TS, JS, Python, Go — up to 2000 files</p>
            </div>
          </button>
          <input
            ref={dirRef}
            type="file"
            // @ts-expect-error webkitdirectory is non-standard but widely supported
            webkitdirectory=""
            multiple
            className="hidden"
            onChange={(e) => {
              const files = e.target.files;
              if (!files || files.length === 0) return;
              void doIndex(files[0].webkitRelativePath?.split('/')[0] || 'local-project', 'upload', () => filesFromDirectoryUpload(files));
              e.target.value = '';
            }}
          />

          <div className="flex items-center gap-4 p-4 rounded-lg bg-zinc-900 border border-zinc-800">
            <GithubLogo size={18} weight="duotone" className="text-zinc-500 shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-white mb-2">GitHub URL</p>
              <div className="flex gap-2">
                <input
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="github.com/owner/repo"
                  className="flex-1 text-xs bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
                />
                <button
                  disabled={busy || !githubUrl.trim()}
                  onClick={() =>
                    doIndex(githubUrl, 'github', async () => {
                      const { raw, repoName, branch } = await filesFromGithub(githubUrl, 150, (done, total) =>
                        setProgress({ done, total, label: `Fetching ${done}/${total} files…` }),
                      );
                      (doIndex as { _branch?: string })._branch = branch;
                      void repoName;
                      return raw;
                    })
                  }
                  className="px-4 py-2 rounded-md bg-blue-600 text-white text-xs hover:bg-blue-500 disabled:opacity-40 transition-colors"
                >
                  Analyze
                </button>
              </div>
            </div>
          </div>

          <button
            disabled={busy}
            onClick={() => doIndex('demo-project', 'demo', async () => demoFiles())}
            className="w-full flex items-center gap-3 p-4 rounded-lg border border-dashed border-zinc-800 hover:border-zinc-600 transition-colors text-left disabled:opacity-50"
          >
            <Flask size={16} className="text-zinc-600" />
            <span className="text-xs text-zinc-500">Try the demo project instead</span>
          </button>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-md border border-red-900 bg-red-950/30">
              <WarningCircle size={14} className="text-red-400" />
              <p className="text-xs text-red-300">{error}</p>
            </div>
          )}
        </div>

        <button onClick={() => setScreen('prompt')} className="mt-6 text-xs text-zinc-600 hover:text-zinc-300 transition-colors">
          ← Back to canvas
        </button>
      </div>
    </div>
  );
}
