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
      className="p-px rounded-lg bg-gray-800 border border-gray-700 shadow-md backdrop-blur-sm"
      style={{
        opacity: stateOpacity,
        minWidth: 240,
      }}
    >
      <div
        className="rounded-[calc(0.5rem-1px)] overflow-hidden bg-gray-900 flex flex-col"
        style={{
          border: state === 'error' ? '1px solid #ef4444' : state === 'active' ? `1px solid ${color}44` : '1px solid transparent',
          borderStyle: state === 'bypassed' ? 'dashed' : 'solid',
        }}
      >
        <NodeResizer
          isVisible={selected}
          minWidth={240}
          minHeight={140}
          lineClassName="!border-blue-500/40"
          handleClassName="!w-2 !h-2 !bg-blue-500 !border-0 !rounded-full"
        />

        {/* Title bar */}
        <div
          className="flex items-center justify-between px-3 py-2 border-b border-gray-800"
          style={{ backgroundColor: `${color}10` }}
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-xs font-semibold text-gray-200">{label}</span>
            <Badge label={badgeLabel} color={color} />
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onToggleBypass}
              className={`text-xs font-bold w-5 h-5 flex items-center justify-center rounded hover:bg-gray-700 transition-colors ${state === 'bypassed' ? 'bg-gray-700 text-white' : 'text-gray-400'}`}
              title="Toggle bypass"
            >
              B
            </button>
            <button
              onClick={onToggleMute}
              className={`text-xs font-bold w-5 h-5 flex items-center justify-center rounded hover:bg-gray-700 transition-colors ${state === 'muted' ? 'bg-gray-700 text-white' : 'text-gray-400'}`}
              title="Toggle mute"
            >
              M
            </button>
            <button
              onClick={onRemove}
              className="text-xs w-5 h-5 flex items-center justify-center rounded hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
              title="Remove node"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Description */}
        <div className="px-3 py-2 bg-gray-800/50">
          <p className="text-[11px] text-gray-400 leading-tight">{description}</p>
          {errorMessage && (
            <p className="text-[10px] text-red-400 mt-1.5 font-mono bg-red-500/10 px-1.5 py-1 rounded border border-red-500/20">{errorMessage}</p>
          )}
        </div>

        {/* Content area */}
        <div className="px-3 pb-3 pt-2 flex-1 flex flex-col gap-3">
          {isLogicNode ? (
            <CoTToggle toggled={toggled ?? false} color={color} onToggle={onToggleCoT} />
          ) : fields && fields.length > 0 ? (
            <div className="flex flex-col gap-3">
              {fields.map((field) => (
                <div key={field.id} className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                    {field.label}
                  </label>
                  {field.type === 'textarea' ? (
                    <textarea
                      value={field.value}
                      onChange={(e) => onFieldChange(field.id, e.target.value)}
                      rows={3}
                      placeholder={field.placeholder ?? `Enter ${field.label.toLowerCase()}...`}
                      className="w-full bg-gray-950 border border-gray-700 rounded-md px-2 py-1.5 text-[11px] text-gray-200 resize-y focus:border-blue-500 focus:outline-none placeholder-gray-600 transition-colors font-sans"
                      style={{ borderLeft: field.value ? `2px solid ${color}aa` : undefined }}
                    />
                  ) : (
                    <input
                      type="text"
                      value={field.value}
                      onChange={(e) => onFieldChange(field.id, e.target.value)}
                      placeholder={field.placeholder ?? `Enter ${field.label.toLowerCase()}...`}
                      className="w-full bg-gray-950 border border-gray-700 rounded-md px-2 py-1.5 text-[11px] text-gray-200 focus:border-blue-500 focus:outline-none placeholder-gray-600 transition-colors font-sans"
                      style={{ borderLeft: field.value ? `2px solid ${color}aa` : undefined }}
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
                className="w-full flex-1 bg-gray-950 border border-gray-700 rounded-md px-2 py-1.5 text-[11px] text-gray-200 resize-y focus:border-blue-500 focus:outline-none placeholder-gray-600 transition-colors font-sans"
                style={{ borderLeft: content ? `2px solid ${color}aa` : undefined }}
              />
              {nodeType === 'role' && (
                <RolePresets onSelect={(c) => updateContent(id, c)} />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !rounded-full !border-[1.5px] !border-gray-900 transition-transform hover:scale-125"
        style={{ backgroundColor: targetColor }}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !rounded-full !border-[1.5px] !border-gray-900 transition-transform hover:scale-125"
        style={{ backgroundColor: sourceColor }}
      />
    </div>
  );}

export default memo(PromptNodeComponent);
