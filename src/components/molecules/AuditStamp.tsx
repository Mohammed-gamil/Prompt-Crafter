import type { CompilerAudit } from '../../types';

interface AuditStampProps {
  audit: CompilerAudit;
}

export default function AuditStamp({ audit }: AuditStampProps) {
  return (
    <div className="px-4 py-3 border-b border-zinc-800 font-mono text-[11px] space-y-1">
      <div className="grid grid-cols-3 gap-2">
        <div><span className="text-zinc-600">Words</span></div>
        <div>
          <span className={audit.wordCount > 300 ? 'text-amber-400' : 'text-zinc-300'}>
            {audit.wordCount}
          </span>
          <span className="text-zinc-600"> excl. RAM</span>
        </div>
        <div>
          <span className="text-zinc-600">Nodes </span>
          <span className="text-zinc-300">{audit.activeNodes}/{audit.totalNodes}</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div><span className="text-zinc-600">RAM</span></div>
        <div>
          <span className="text-zinc-300">{audit.charCountRam}</span>
          <span className="text-zinc-600"> chars</span>
        </div>
        <div>
          <span className="text-zinc-600">CoT </span>
          <span className={audit.cotEnabled ? 'text-zinc-200' : 'text-zinc-600'}>
            {audit.cotEnabled ? 'on' : 'off'}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div><span className="text-zinc-600">Safety</span></div>
        <div>
          <span className={audit.safetyFlag ? 'text-red-400' : 'text-emerald-400'}>
            {audit.safetyFlag ? 'flag' : 'pass'}
          </span>
        </div>
        <div>
          <span className="text-zinc-600">Refiner </span>
          <span className="text-zinc-400">
            {audit.refinerApplied ? 'on' : 'off'}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <span className="text-zinc-600">Quality </span>
          <span className="text-zinc-200">{audit.qualityScore}</span>
        </div>
        <div>
          <span className="text-zinc-600">Complete </span>
          <span className="text-zinc-200">{audit.completenessScore}</span>
        </div>
        <div>
          <span className="text-zinc-600">Specific </span>
          <span className="text-zinc-200">{audit.specificityScore}</span>
        </div>
      </div>
    </div>
  );
}
