import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PaperPlaneTilt, 
  Trash, 
  Gear, 
  X, 
  ChatCircleDots, 
  Robot, 
  WarningCircle,
  Selection
} from '@phosphor-icons/react';
import { useAppStore } from '../../store';
import { compile } from '../../compiler';
import { toast } from '../../toast';
import { validateBaseUrl } from '../../validation';
import ApiSettingsForm, { type ApiSettings } from '../molecules/ApiSettingsForm';
import ChatBubble from '../molecules/ChatBubble';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const SETTINGS_KEY = 'prompt-crafter:api-settings';

function loadSettings(): ApiSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw) as ApiSettings;
  } catch { /* ignore */ }
  return { apiKey: '', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o' };
}

function saveSettings(s: ApiSettings): void {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

interface Props {
  open: boolean;
  onClose: () => void;
}

const SPRING_TRANSITION: any = { type: "spring" as const, stiffness: 300, damping: 30 };

export default function TestPanel({ open, onClose }: Props) {
  const nodes = useAppStore((s) => s.nodes);
  const edges = useAppStore((s) => s.edges);

  const [settings, setSettings] = useState<ApiSettings>(loadSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const systemPrompt = useMemo(() => {
    if (nodes.length === 0) return '';
    return compile(nodes, edges).xml;
  }, [nodes, edges]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const clearChat = useCallback(() => setMessages([]), []);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    if (!settings.apiKey) {
      toast('Add an API key in settings first', 'warning');
      setShowSettings(true);
      return;
    }

    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      let endpoint: string;
      try {
        endpoint = `${validateBaseUrl(settings.baseUrl)}/chat/completions`;
      } catch (urlErr) {
        throw new Error(`Invalid base URL: ${(urlErr as Error).message}`);
      }

      const body = JSON.stringify({
        model: settings.model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...newMessages.map((m) => ({ role: m.role, content: m.content })),
        ],
      });

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${settings.apiKey}`,
        },
        body,
      });

      if (!res.ok) {
        const rawErr = await res.text().catch(() => res.statusText);
        const errText = rawErr.slice(0, 200) + (rawErr.length > 200 ? '...' : '');
        throw new Error(`API error ${res.status}: ${errText}`);
      }

      const data = await res.json() as {
        choices: { message: { content: string } }[];
      };
      const reply = data.choices?.[0]?.message?.content ?? '(empty response)';
      setMessages([...newMessages, { role: 'assistant', content: reply }]);
    } catch (err) {
      const msg = (err as Error).message;
      toast(msg, 'error');
      setMessages([...newMessages, { role: 'assistant', content: `Error: ${msg}` }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, settings, systemPrompt]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          transition={SPRING_TRANSITION}
          className="m-4 h-[480px] relative z-30 pointer-events-auto bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-gradient-to-b from-zinc-900/50 to-transparent flex-shrink-0">
            <div className="flex items-center gap-4">
               <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                  <Robot size={20} weight="duotone" />
               </div>
               <div className="flex flex-col">
                 <span className="text-sm font-bold text-white tracking-tight">Protocol Tester</span>
                 <div className="flex items-center gap-2 mt-0.5">
                   <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Active Model:</span>
                   <span className="text-[10px] text-blue-400 font-mono font-bold">{settings.model}</span>
                 </div>
               </div>
            </div>
            <div className="flex items-center gap-2">
              {messages.length > 0 && (
                <button
                  onClick={clearChat}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-red-400 transition-colors"     
                  title="Clear Buffer"
                >
                  <Trash size={18} weight="bold" />
                </button>
              )}
              <button
                onClick={() => setShowSettings(true)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-800 text-zinc-500 transition-colors"       
                title="API Settings"
              >
                <Gear size={18} weight="bold" />
              </button>
              <div className="w-px h-6 bg-zinc-800 mx-1" />
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-800 text-zinc-500 transition-colors"
              >
                <X size={18} weight="bold" />
              </button>
            </div>
          </div>

          {showSettings ? (
            <div className="overflow-auto flex-1 custom-scrollbar p-6 bg-zinc-950">
              <ApiSettingsForm
                settings={settings}
                onChange={(s) => { setSettings(s); saveSettings(s); }}
                onDone={() => setShowSettings(false)}
              />
            </div>
          ) : (
            <>
              {/* Message list */}
              <div className="flex-1 overflow-auto px-6 py-6 space-y-6 custom-scrollbar bg-zinc-950/40">
                {messages.length === 0 && !loading && (
                  <div className="flex flex-col items-center justify-center h-full text-center opacity-30">
                    <div className="w-16 h-16 rounded-full border-2 border-dashed border-zinc-800 flex items-center justify-center mb-6">
                       <ChatCircleDots size={32} />
                    </div>
                    <p className="text-xs font-bold text-white uppercase tracking-widest">Awaiting Neural Link</p>
                    {nodes.length === 0 && (
                      <div className="mt-4 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/5 border border-amber-500/10">
                        <WarningCircle size={14} className="text-amber-500" />
                        <span className="text-[10px] text-amber-500 font-bold uppercase tracking-tighter">System Prompt Null</span>
                      </div>
                    )}
                  </div>
                )}
                {messages.map((msg, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <ChatBubble role={msg.role} content={msg.content} />
                  </motion.div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs shadow-inner">
                      <div className="flex items-center gap-3">
                         <motion.div 
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                            className="w-3 h-3 rounded-full border-2 border-blue-500/30 border-t-blue-500"
                         />
                         <span className="font-mono tracking-widest uppercase text-[10px]">Processing_Link...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="px-6 py-6 border-t border-zinc-800 bg-zinc-900/20 flex-shrink-0">
                <div className="flex gap-4 items-end">
                  <div className="relative flex-1">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          void sendMessage();
                        }
                      }}
                      rows={1}
                      placeholder="Inject test instruction..."
                      className="w-full text-sm bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/10 resize-none transition-all shadow-inner min-h-[48px] max-h-[120px]"
                    />
                    {!input && (
                       <div className="absolute right-3 bottom-3 opacity-20 pointer-events-none">
                          <Selection size={14} />
                       </div>
                    )}
                  </div>
                  <button
                    onClick={() => void sendMessage()}
                    disabled={!input.trim() || loading}
                    className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:grayscale transition-all shadow-lg active:scale-95 flex-shrink-0"
                  >
                    <PaperPlaneTilt size={20} weight="fill" />
                  </button>
                </div>
              </div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}