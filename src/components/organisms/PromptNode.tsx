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
  const updateEnabled = useAppStore((s) => s.updateNodeEnabled);
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

  const onToggleEnabled = useCallback(() => updateEnabled(id, !enabled), [id, enabled, updateEnabled]);

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

  const stateBorderColor =
    state === 'error' ? '#ef4444' :
    state === 'muted' ? '#6b7280' :
    color;

  const stateOpacity = state === 'muted' ? 0.4 : state === 'bypassed' ? 0.6 : 1;

  const stateBadge =
    state === 'bypassed' ? 'BYPASS' :
    state === 'muted' ? 'MUTED' :
    state === 'error' ? 'ERROR' : null;

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
      className="rounded-lg shadow-xl border overflow-hidden"
      style={{
        borderColor: stateBorderColor,
        backgroundColor: '#1a1a2e',
        opacity: stateOpacity,
        borderStyle: state === 'bypassed' ? 'dashed' : 'solid',
        minWidth: 220,
      }}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={220}
        minHeight={140}
        lineClassName="!border-indigo-400/60"
        handleClassName="!w-2.5 !h-2.5 !bg-indigo-500 !border !border-indigo-200"
      />

      {/* Title bar */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ backgroundColor: `${color}22` }}
      >
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-sm font-semibold text-white">{label}</span>
          <Badge label={badgeLabel} color={color} />
          {stateBadge && <Badge label={stateBadge} color={state === 'error' ? '#ef4444' : '#94a3b8'} />}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleBypass}
            className="text-xs px-1.5 py-0.5 rounded transition-colors"
            style={{
              backgroundColor: state === 'bypassed' ? '#334155' : '#2b2b3e',
              color: state === 'bypassed' ? '#cbd5e1' : '#94a3b8',
            }}
            title="Toggle bypass"
          >
            B
          </button>
          <button
            onClick={onToggleMute}
            className="text-xs px-1.5 py-0.5 rounded transition-colors"
            style={{
              backgroundColor: state === 'muted' ? '#3f3f46' : '#2b2b3e',
              color: state === 'muted' ? '#d1d5db' : '#94a3b8',
            }}
            title="Toggle mute"
          >
            M
          </button>
          <button
            onClick={onToggleEnabled}
            className="text-xs px-1.5 py-0.5 rounded transition-colors"
            style={{
              backgroundColor: enabled ? `${color}33` : '#333',
              color: enabled ? color : '#666',
            }}
            title={enabled ? 'Disable node (legacy)' : 'Enable node (legacy)'}
          >
            {enabled ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={onRemove}
            className="text-xs px-1.5 py-0.5 rounded bg-red-900/30 text-red-400 hover:bg-red-900/60 transition-colors"
            title="Remove node"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Description */}
      <div className="px-3 py-1.5">
        <p className="text-[11px] text-gray-400 leading-tight">{description}</p>
        {errorMessage && (
          <p className="text-[10px] text-red-400 mt-1">{errorMessage}</p>
        )}
      </div>

      {/* Content area */}
      <div className="px-3 pb-3">
        {isLogicNode ? (
          <CoTToggle toggled={toggled ?? false} color={color} onToggle={onToggleCoT} />
        ) : fields && fields.length > 0 ? (
          <div className="flex flex-col gap-2">
            {fields.map((field) => (
              <div key={field.id} className="flex flex-col gap-1">
                <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                  {field.label}
                </label>
                {field.type === 'textarea' ? (
                  <textarea
                    value={field.value}
                    onChange={(e) => onFieldChange(field.id, e.target.value)}
                    rows={3}
                    placeholder={field.placeholder ?? `Enter ${field.label.toLowerCase()}...`}
                    className="w-full bg-[#12121a] border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-200 resize-y focus:border-indigo-500 focus:outline-none placeholder-gray-600"
                    style={{ borderColor: field.value ? `${color}55` : undefined }}
                  />
                ) : (
                  <input
                    type="text"
                    value={field.value}
                    onChange={(e) => onFieldChange(field.id, e.target.value)}
                    placeholder={field.placeholder ?? `Enter ${field.label.toLowerCase()}...`}
                    className="w-full bg-[#12121a] border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-200 focus:border-indigo-500 focus:outline-none placeholder-gray-600"
                    style={{ borderColor: field.value ? `${color}55` : undefined }}
                  />
                )}
              </div>
            ))}
          </div>
        ) : (
          <>
            <textarea
              value={content}
              onChange={onContentChange}
              rows={3}
              placeholder={`Enter ${label.toLowerCase()} content...`}
              className="w-full bg-[#12121a] border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-200 resize-y focus:border-indigo-500 focus:outline-none placeholder-gray-600"
              style={{ borderColor: content ? `${color}55` : undefined }}
            />
            {nodeType === 'role' && (
              <RolePresets onSelect={(c) => updateContent(id, c)} />
            )}
          </>
        )}
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !rounded-full !border-2"
        style={{ borderColor: targetColor, backgroundColor: '#1a1a2e' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !rounded-full !border-2"
        style={{ borderColor: sourceColor, backgroundColor: '#1a1a2e' }}
      />
    </div>
  );
}

export default memo(PromptNodeComponent);
