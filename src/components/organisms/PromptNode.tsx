import { memo, useCallback } from 'react';
import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react';
import type { PromptNode, PromptNodeData, PromptNodeState, ResourceType } from '../../types';
import { useAppStore } from '../../store';
import Badge from '../atoms/Badge';
import CoTToggle from '../molecules/CoTToggle';
import RolePresets from '../molecules/RolePresets';

function PromptNodeComponent({ id, data, selected }: NodeProps<PromptNode>) {
  const nodeType = data.nodeType as PromptNodeData['nodeType'];
  const label = data.label as string;
  const category = data.category as PromptNodeData['category'];
  const description = data.description as string;
  const content = data.content as string;
  const enabled = data.enabled as boolean;
  const state = (data.state as PromptNodeState | undefined) ?? (enabled ? 'active' : 'muted');
  const errorMessage = data.errorMessage as string | undefined;
  const color = data.color as string;
  const toggled = data.toggled as boolean | undefined;
  const fields = data.fields;
  const portType = data.portType;

  const updateContent = useAppStore((s) => s.updateNodeContent);
  const updateField = useAppStore((s) => s.updateNodeField);
  const setNodeState = useAppStore((s) => s.setNodeState);
  const updateToggled = useAppStore((s) => s.updateNodeToggled);
  const removeNode = useAppStore((s) => s.removeNode);

  const onContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => updateContent(id, e.target.value),
    [id, updateContent],
  );

  const onFieldChange = useCallback(
    (fieldId: string, value: string) => updateField(id, fieldId, value),
    [id, updateField],
  );

  const onToggleBypass = useCallback(() => {
    setNodeState(id, state === 'bypassed' ? 'active' : 'bypassed');
  }, [id, setNodeState, state]);

  const onToggleMute = useCallback(() => {
    setNodeState(id, state === 'muted' ? 'active' : 'muted');
  }, [id, setNodeState, state]);

  const onToggleCoT = useCallback(
    () => updateToggled(id, !toggled),
    [id, toggled, updateToggled],
  );

  const onRemove = useCallback(() => removeNode(id), [id, removeNode]);

  const isLogicNode = nodeType === 'logic_reasoning';

  const badgeLabel =
    category === 'core'
      ? 'CORE'
      : category === 'domain-library'
        ? 'LIB'
        : category === 'custom'
          ? 'MINE'
          : 'SMART';

  const stateOpacity = state === 'muted' ? 0.4 : state === 'bypassed' ? 0.6 : 1;

  const getPortColor = (types?: ResourceType[]) => {
    const type = types?.[0] ?? 'ANY';
    const mapping: Record<ResourceType, string> = {
      RULES: '#eab308',
      SPECS: '#3b82f6',
      ARCH: '#10b981',
      TASKS: '#8b5cf6',
      CONTEXT: '#64748b',
      FORMAT: '#f43f5e',
      ANY: '#94a3b8',
    };
    return mapping[type] || mapping.ANY;
  };

  const targetColor = getPortColor(portType?.in);
  const sourceColor = getPortColor(portType?.out);

  return (
    <div
      className="p-1 rounded-[1.5rem] bg-white/[0.03] border border-white/[0.08] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] backdrop-blur-sm transition-all duration-700 ease-vanguard"
      style={{
        opacity: stateOpacity,
        minWidth: 240,
      }}
    >
      <div 
        className="rounded-[calc(1.5rem-0.25rem)] overflow-hidden bg-ink-900 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] flex flex-col"
        style={{
          border: state === 'error' ? '1px solid #ef4444' : state === 'active' ? `1px solid ${color}44` : '1px solid rgba(255,255,255,0.05)',
          borderStyle: state === 'bypassed' ? 'dashed' : 'solid',
        }}
      >
        <NodeResizer
          isVisible={selected}
          minWidth={240}
          minHeight={140}
          lineClassName="!border-indigo-500/40"
          handleClassName="!w-2 !h-2 !bg-indigo-500 !border-0 !rounded-full"
        />

        {/* Title bar */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b border-white/[0.03]"
          style={{ backgroundColor: `${color}08` }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-1.5 h-1.5 rounded-full shadow-[0_0_12px_rgba(255,255,255,0.4)] animate-pulse" style={{ backgroundColor: color }} />
            <span className="text-[10px] font-black tracking-[0.1em] text-white/80 uppercase">{label}</span>
            <Badge label={badgeLabel} color={color} />
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={onToggleBypass}
              className={`text-[9px] font-bold w-6 h-6 flex items-center justify-center rounded-full border border-white/5 hover:bg-white/10 transition-all duration-500 ease-vanguard ${state === 'bypassed' ? 'bg-white/10 text-white' : 'text-gray-600'}`}
              title="Toggle bypass"
            >
              B
            </button>
            <button
              onClick={onToggleMute}
              className={`text-[9px] font-bold w-6 h-6 flex items-center justify-center rounded-full border border-white/5 hover:bg-white/10 transition-all duration-500 ease-vanguard ${state === 'muted' ? 'bg-white/10 text-white' : 'text-gray-600'}`}
              title="Toggle mute"
            >
              M
            </button>
            <button
              onClick={onRemove}
              className="text-[10px] w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-500/10 text-red-500/40 hover:text-red-400 transition-all duration-500 ease-vanguard"
              title="Remove node"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Description */}
        <div className="px-4 py-2.5 bg-white/[0.01]">
          <p className="text-[10px] text-gray-500 leading-relaxed font-medium tracking-tight">{description}</p>
          {errorMessage && (
            <p className="text-[9px] text-red-400 mt-2 font-mono bg-red-500/5 px-2 py-1 rounded border border-red-500/10">{errorMessage}</p>
          )}
        </div>

        {/* Content area */}
        <div className="px-4 pb-4 pt-2 flex-1 flex flex-col gap-4">
          {isLogicNode ? (
            <CoTToggle toggled={toggled ?? false} color={color} onToggle={onToggleCoT} />
          ) : fields && fields.length > 0 ? (
            <div className="flex flex-col gap-4">
              {fields.map((field) => (
                <div key={field.id} className="flex flex-col gap-2">
                  <label className="text-[9px] font-bold text-gray-600 uppercase tracking-[0.2em] ml-1">
                    {field.label}
                  </label>
                  {field.type === 'textarea' ? (
                    <textarea
                      value={field.value}
                      onChange={(e) => onFieldChange(field.id, e.target.value)}
                      rows={3}
                      placeholder={field.placeholder ?? `Enter ${field.label.toLowerCase()}...`}
                      className="w-full bg-ink-950/50 border border-white/[0.05] rounded-xl px-3 py-2.5 text-[11px] text-gray-300 resize-y focus:border-indigo-500/30 focus:outline-none placeholder-gray-800 transition-all duration-700 ease-vanguard font-sans shadow-inner"
                      style={{ borderLeft: field.value ? `2px solid ${color}88` : undefined }}
                    />
                  ) : (
                    <input
                      type="text"
                      value={field.value}
                      onChange={(e) => onFieldChange(field.id, e.target.value)}
                      placeholder={field.placeholder ?? `Enter ${field.label.toLowerCase()}...`}
                      className="w-full bg-ink-950/50 border border-white/[0.05] rounded-xl px-3 py-2 text-[11px] text-gray-300 focus:border-indigo-500/30 focus:outline-none placeholder-gray-800 transition-all duration-700 ease-vanguard font-sans shadow-inner"
                      style={{ borderLeft: field.value ? `2px solid ${color}88` : undefined }}
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2 flex-1">
              <textarea
                value={content}
                onChange={onContentChange}
                rows={3}
                placeholder={`Enter ${label.toLowerCase()} content...`}
                className="w-full flex-1 bg-ink-950/50 border border-white/[0.05] rounded-xl px-3 py-2.5 text-[11px] text-gray-300 resize-y focus:border-indigo-500/30 focus:outline-none placeholder-gray-800 transition-all duration-700 ease-vanguard font-sans shadow-inner"
                style={{ borderLeft: content ? `2px solid ${color}88` : undefined }}
              />
              {nodeType === 'role' && (
                <RolePresets onSelect={(c) => updateContent(id, c)} />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Micro-precise Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !rounded-full !border !border-white/20 !shadow-lg transition-transform duration-500 hover:scale-150"
        style={{ borderColor: targetColor, backgroundColor: 'var(--color-ink-950)' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !rounded-full !border !border-white/20 !shadow-lg transition-transform duration-500 hover:scale-150"
        style={{ borderColor: sourceColor, backgroundColor: 'var(--color-ink-950)' }}
      />
    </div>
  );
}

export default memo(PromptNodeComponent);
