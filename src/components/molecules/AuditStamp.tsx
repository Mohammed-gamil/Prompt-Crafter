import type { CompilerAudit } from '../../types';

interface AuditStampProps {
  audit: CompilerAudit;
}

export default function AuditStamp({ audit }: AuditStampProps) {
  return (
    <div className="px-4 py-3 border-b border-gray-800 font-mono text-[11px] space-y-1 bg-[#0d0d15]">
      <div className="grid grid-cols-3 gap-2">
        <div><span className="text-gray-500">COMPILED</span></div>
        <div>
          <span className="text-gray-500">Words: </span>
          <span className={audit.wordCount > 300 ? 'text-yellow-400' : 'text-green-400'}>
            {audit.wordCount}
          </span>
          <span className="text-gray-600"> (excl. RAM)</span>
        </div>
        <div>
          <span className="text-gray-500">Nodes: </span>
          <span className="text-indigo-400">{audit.activeNodes}/{audit.totalNodes}</span>
          <span className="text-gray-600"> active</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div><span className="text-gray-500">RAM Block</span></div>
        <div>
          <span className="text-gray-500">Chars: </span>
          <span className="text-cyan-400">{audit.charCountRam}</span>
        </div>
        <div>
          <span className="text-gray-500">CoT: </span>
          <span className={audit.cotEnabled ? 'text-green-400' : 'text-gray-600'}>
            {audit.cotEnabled ? 'ON' : 'OFF'}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div><span className="text-gray-500">Safety</span></div>
        <div>
          <span className={audit.safetyFlag ? 'text-red-400' : 'text-green-400'}>
            {audit.safetyFlag ? 'FLAG' : 'PASS'}
          </span>
        </div>
        <div>
          <span className="text-gray-500">Refiner: </span>
          <span className={audit.refinerApplied ? 'text-yellow-400' : 'text-gray-600'}>
            {audit.refinerApplied ? 'APPLIED' : 'SKIPPED'}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <span className="text-gray-500">Quality: </span>
          <span className="text-indigo-300">{audit.qualityScore}</span>
        </div>
        <div>
          <span className="text-gray-500">Complete: </span>
          <span className="text-violet-300">{audit.completenessScore}</span>
        </div>
        <div>
          <span className="text-gray-500">Specific: </span>
          <span className="text-cyan-300">{audit.specificityScore}</span>
        </div>
      </div>
    </div>
  );
}
