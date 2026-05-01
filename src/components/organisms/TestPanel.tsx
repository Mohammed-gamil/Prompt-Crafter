import { useState, useRef, useEffect, useCallback } from 'react';
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
        transition: 'all 0.3s ease-out',
        opacity: open ? 1 : 0,
        transform: open ? 'translateY(0)' : 'translateY(10px)',
      }}
      className="m-4 relative z-30 pointer-events-auto bg-gray-900 border border-gray-800 rounded-lg shadow-xl overflow-hidden flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-900 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-white flex items-center gap-2">
              Test Prompt
            </span>
          </div>
          <div className="h-6 w-[1px] bg-gray-700 mx-2" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">Model</span>
            <span className="text-xs text-gray-300 font-mono bg-gray-800 px-2 py-0.5 rounded border border-gray-700">{settings.model}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="text-xs font-medium px-3 py-1.5 rounded hover:bg-gray-800 text-gray-400 transition-colors"     
            >
              Clear Chat
            </button>
          )}
          <button
            onClick={() => setShowSettings(true)}
            className="text-xs font-medium px-3 py-1.5 rounded hover:bg-gray-800 text-gray-400 transition-colors"       
          >
            Settings
          </button>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 transition-colors px-2 py-1"
          >
            ✕
          </button>
        </div>
      </div>

      {showSettings ? (
        <div className="overflow-auto flex-1 custom-scrollbar p-6 bg-gray-900">
          <ApiSettingsForm
            settings={settings}
            onChange={(s) => { setSettings(s); saveSettings(s); }}
            onDone={() => setShowSettings(false)}
          />
        </div>
      ) : (
        <>
          {/* Message list */}
          <div className="flex-1 overflow-auto px-6 py-4 space-y-4 custom-scrollbar bg-gray-900">
            {messages.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center h-full text-center opacity-50">
                <div className="text-3xl mb-3 grayscale">💬</div>
                <p className="text-sm font-medium text-gray-400">Ready for testing</p>
                {nodes.length === 0 && (
                  <p className="text-xs text-amber-500 mt-2 font-medium bg-amber-500/10 px-2 py-1 rounded">No nodes on canvas</p>
                )}
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i}>
                <ChatBubble role={msg.role} content={msg.content} />
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="px-3 py-2 rounded-lg bg-gray-800 text-gray-400 text-xs">
                  <span className="animate-pulse">Waiting for response...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-6 py-4 border-t border-gray-800 bg-gray-900 flex-shrink-0">
            <div className="flex gap-3 items-end">
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
                placeholder="Type a message..."
                className="flex-1 text-sm bg-gray-800 border border-gray-700 rounded-md px-3 py-2.5 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none transition-colors min-h-[44px] max-h-[120px]"
              />
              <button
                onClick={() => void sendMessage()}
                disabled={!input.trim() || loading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-md bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0 font-medium text-sm"
              >
                <span>Send</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );}
