import { useState, useRef, useEffect, useCallback } from 'react';
import { useAppStore } from '../../store';
import { compile } from '../../compiler';
import { toast } from '../../toast';
import { validateBaseUrl } from '../../validation';
import ApiSettingsForm, { type ApiSettings } from '../molecules/ApiSettingsForm';
import ChatBubble from '../molecules/ChatBubble';
import Badge from '../atoms/Badge';

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

  const systemPrompt = compile(nodes, edges).xml;

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

  if (!open) return null;

  return (
    <div 
      style={{ 
        height: '420px', 
        flexShrink: 0,
        transition: 'all 0.8s var(--ease-vanguard)',
        opacity: open ? 1 : 0,
        transform: open ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.98)',
        filter: open ? 'blur(0)' : 'blur(8px)',
      }} 
      className="m-6 relative z-30 pointer-events-auto"
    >
      <div className="h-full double-bezel flex flex-col">
        <div className="double-bezel-inner flex flex-col overflow-hidden bg-ink-900/80 backdrop-blur-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-8 py-5 border-b border-white/[0.03] bg-white/[0.01] flex-shrink-0">
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <Badge label="Neural Laboratory" color="#f59e0b" className="mb-1" />
                <span className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                  Test Protocol
                </span>
              </div>
              <div className="h-8 w-[1px] bg-white/5 mx-2" />
              <div className="flex flex-col gap-1">
                <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Target_Model</span>
                <span className="text-[10px] text-gray-400 font-mono bg-white/5 px-2 py-0.5 rounded border border-white/5">{settings.model}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {messages.length > 0 && (
                <button
                  onClick={clearChat}
                  className="text-[9px] font-black px-4 py-2 rounded-full border border-white/5 hover:bg-white/10 text-gray-500 uppercase tracking-widest transition-all duration-700 ease-vanguard"
                >
                  Purge Buffer
                </button>
              )}
              <button
                onClick={() => setShowSettings(true)}
                className="text-[9px] font-black px-4 py-2 rounded-full border border-white/5 hover:bg-white/10 text-gray-500 uppercase tracking-widest transition-all duration-700 ease-vanguard"
              >
                Config
              </button>
              <button
                onClick={onClose}
                className="text-xs w-8 h-8 flex items-center justify-center rounded-full border border-white/5 hover:bg-white/10 text-gray-500 transition-all duration-700 ease-vanguard"
              >
                ✕
              </button>
            </div>
          </div>

          {showSettings ? (
            <div className="overflow-auto flex-1 custom-scrollbar p-8">
              <ApiSettingsForm
                settings={settings}
                onChange={(s) => { setSettings(s); saveSettings(s); }}
                onDone={() => setShowSettings(false)}
              />
            </div>
          ) : (
            <>
              {/* Message list */}
              <div className="flex-1 overflow-auto px-8 py-6 space-y-6 custom-scrollbar bg-white/[0.01]">
                {messages.length === 0 && !loading && (
                  <div className="flex flex-col items-center justify-center h-full text-center opacity-30 scale-95 transition-all duration-1000">
                    <div className="text-4xl mb-4 grayscale">💬</div>
                    <p className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Awaiting Input Inbound</p>
                    {nodes.length === 0 && (
                      <p className="text-[9px] text-amber-500 mt-4 uppercase font-black tracking-widest border border-amber-500/20 px-3 py-1 rounded-full bg-amber-500/5">System Prompt Null</p>
                    )}
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div key={i} className="animate-in fade-in slide-in-from-bottom-2 duration-700" style={{ animationDelay: `${i * 50}ms` }}>
                    <ChatBubble role={msg.role} content={msg.content} />
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="px-4 py-2.5 rounded-2xl bg-white/5 text-gray-500 text-[10px] font-mono border border-white/5 shadow-inner">
                      <span className="animate-pulse tracking-widest uppercase font-black">Processing_Response_Stream...</span>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="px-8 py-6 border-t border-white/[0.03] bg-white/[0.01] flex-shrink-0">
                <div className="flex gap-4 items-end">
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
                    placeholder="Inject instruction into neural stream..."
                    className="flex-1 text-[11px] bg-ink-950/50 border border-white/[0.05] rounded-2xl px-5 py-3 text-gray-200 placeholder-gray-800 focus:outline-none focus:border-indigo-500/30 resize-none transition-all duration-700 ease-vanguard shadow-inner min-h-[48px] max-h-[120px]"
                  />
                  <button
                    onClick={() => void sendMessage()}
                    disabled={!input.trim() || loading}
                    className="group relative flex items-center gap-3 pl-6 pr-2 py-2 rounded-full bg-indigo-600 border border-indigo-500/20 text-white transition-all duration-700 ease-vanguard hover:bg-indigo-500 shadow-2xl disabled:opacity-10 disabled:grayscale active:scale-95 flex-shrink-0"
                  >
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] group-hover:translate-x-0.5 transition-transform duration-700">Execute</span>
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center transition-all duration-700 ease-vanguard group-hover:scale-110 group-hover:rotate-12">
                      <span className="text-xs">▶</span>
                    </div>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
