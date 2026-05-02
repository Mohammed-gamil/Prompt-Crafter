import { memo, useCallback } from 'react';
import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  EyeSlash, 
  SpeakerSlash, 
  Trash, 
  Selection, 
  DotsThreeVertical,
  CheckCircle,
  WarningCircle,
  Info
} from '@phosphor-icons/react';
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
      ANY: '#a1a1aa',
    };
    return mapping[type] || mapping.ANY;
  };

  const targetColor = getPortColor(portType?.in);
  const sourceColor = getPortColor(portType?.out);

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: stateOpacity }}
      className="p-px rounded-xl bg-zinc-800 border border-zinc-700 shadow-2xl backdrop-blur-md"
      style={{
        minWidth: 260,
      }}
    >
      <div
        className="rounded-[calc(0.75rem-1px)] overflow-hidden bg-zinc-950 flex flex-col"
        style={{
          border: state === 'error' ? '1px solid #ef4444' : state === 'active' ? `1px solid ${color}33` : '1px solid transparent',
          borderStyle: state === 'bypassed' ? 'dashed' : 'solid',
        }}
      >
        <NodeResizer
          isVisible={selected}
          minWidth={260}
          minHeight={160}
          lineClassName="!border-blue-500/40"
          handleClassName="!w-2.5 !h-2.5 !bg-blue-500 !border-2 !border-zinc-950 !rounded-md"
        />

        {/* Title bar */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b border-zinc-800"
          style={{ backgroundColor: `${color}08` }}
        >
          <div className="flex items-center gap-3">
            <div className="relative">
               <div className="w-2.5 h-2.5 rounded-full shadow-lg" style={{ backgroundColor: color }} />
               {state === 'active' && (
                 <motion.div 
                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute inset-0 rounded-full"
                    style={{ backgroundColor: color }}
                 />
               )}
            </div>
            <span className="text-xs font-bold text-zinc-100 tracking-tight">{label}</span>
            <Badge label={badgeLabel} color={color} className="font-mono text-[8px]" />
          </div>
          <div className="flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
            <button
              onClick={onToggleBypass}
              className={`w-6 h-6 flex items-center justify-center rounded-md hover:bg-zinc-800 transition-colors ${state === 'bypassed' ? 'text-blue-400 bg-blue-400/10' : 'text-zinc-500'}`}
              title="Toggle bypass"
            >
              <EyeSlash size={14} weight={state === 'bypassed' ? "fill" : "bold"} />
            </button>
            <button
              onClick={onToggleMute}
              className={`w-6 h-6 flex items-center justify-center rounded-md hover:bg-zinc-800 transition-colors ${state === 'muted' ? 'text-amber-400 bg-amber-400/10' : 'text-zinc-500'}`}
              title="Toggle mute"
            >
              <SpeakerSlash size={14} weight={state === 'muted' ? "fill" : "bold"} />
            </button>
            <button
              onClick={onRemove}
              className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition-colors"
              title="Remove node"
            >
              <Trash size={14} weight="bold" />
            </button>
          </div>
        </div>

        {/* Description */}
        <div className="px-4 py-2 bg-zinc-900/30 flex items-start gap-2">
          <Info size={12} className="text-zinc-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-[10px] text-zinc-500 leading-normal font-medium">{description}</p>
            <AnimatePresence>
              {errorMessage && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-2 flex items-center gap-1.5 p-2 rounded-lg bg-red-500/5 border border-red-500/10"
                >
                  <WarningCircle size={12} className="text-red-400" />
                  <p className="text-[9px] text-red-400 font-mono tracking-tight">{errorMessage}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Content area */}
        <div className="px-4 pb-4 pt-3 flex-1 flex flex-col gap-4">
          {isLogicNode ? (
            <CoTToggle toggled={toggled ?? false} color={color} onToggle={onToggleCoT} />
          ) : fields && fields.length > 0 ? (
            <div className="flex flex-col gap-4">
              {fields.map((field) => (
                <div key={field.id} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between ml-1">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                      {field.label}
                    </label>
                    {field.value && <CheckCircle size={10} className="text-blue-500/50" />}
                  </div>
                  {field.type === 'textarea' ? (
                    <textarea
                      value={field.value}
                      onChange={(e) => onFieldChange(field.id, e.target.value)}
                      rows={3}
                      placeholder={field.placeholder ?? `Enter ${field.label.toLowerCase()}...`}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-[11px] text-zinc-200 resize-y focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/10 focus:outline-none placeholder-zinc-700 transition-all font-sans shadow-inner"
                      style={{ borderLeft: field.value ? `2px solid ${color}66` : undefined }}
                    />
                  ) : (
                    <input
                      type="text"
                      value={field.value}
                      onChange={(e) => onFieldChange(field.id, e.target.value)}
                      placeholder={field.placeholder ?? `Enter ${field.label.toLowerCase()}...`}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-[11px] text-zinc-200 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/10 focus:outline-none placeholder-zinc-700 transition-all font-sans shadow-inner"
                      style={{ borderLeft: field.value ? `2px solid ${color}66` : undefined }}
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2 flex-1">
              <div className="relative flex-1 flex flex-col">
                <textarea
                  value={content}
                  onChange={onContentChange}
                  rows={3}
                  placeholder={`Enter ${label.toLowerCase()} parameters...`}
                  className="w-full flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-[11px] text-zinc-200 resize-y focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/10 focus:outline-none placeholder-zinc-700 transition-all font-sans shadow-inner min-h-[80px]"
                  style={{ borderLeft: content ? `2px solid ${color}66` : undefined }}
                />
                {!content && (
                   <div className="absolute right-3 bottom-3 opacity-20 pointer-events-none">
                      <Selection size={14} />
                   </div>
                )}
              </div>
              {nodeType === 'role' && (
                <div className="mt-2">
                   <div className="flex items-center gap-2 mb-2 ml-1">
                      <DotsThreeVertical size={10} className="text-zinc-600" />
                      <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-tighter">Quick Role Templates</span>
                   </div>
                   <RolePresets onSelect={(c) => updateContent(id, c)} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Handles - Precision Port Architecture */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-4 !h-4 !rounded-md !border-2 !border-zinc-950 !bg-zinc-800 shadow-lg transition-all hover:!scale-125 hover:!bg-zinc-700"
        style={{ borderColor: targetColor }}
      >
        <div className="absolute inset-0 flex items-center justify-center opacity-40">
           <div className="w-1 h-1 rounded-full bg-white" />
        </div>
      </Handle>
      <Handle
        type="source"
        position={Position.Right}
        className="!w-4 !h-4 !rounded-md !border-2 !border-zinc-950 !bg-zinc-800 shadow-lg transition-all hover:!scale-125 hover:!bg-zinc-700"
        style={{ borderColor: sourceColor }}
      >
        <div className="absolute inset-0 flex items-center justify-center opacity-40">
           <div className="w-1 h-1 rounded-full bg-white" />
        </div>
      </Handle>
    </motion.div>
  );}

export default memo(PromptNodeComponent);
