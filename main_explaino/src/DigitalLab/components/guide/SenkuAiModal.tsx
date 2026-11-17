import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import {
  askSenkuQuestion,
  checkScienceAiHealth,
  ScienceAiHealthResponse,
} from '../../services/SenkuAiService';
import { soundManager } from '../../audio/SoundManager';

interface SenkuAiModalProps {
  isOpen: boolean;
  onClose: () => void;
  contextLab: string;
  onQuestionAsked?: (question: string) => void;
}

interface ChatMessage {
  id: string;
  sender: 'student' | 'senku' | 'system';
  text: string;
  unavailable?: boolean;
}

export const SenkuAiModal: React.FC<SenkuAiModalProps> = ({
  isOpen,
  onClose,
  contextLab,
  onQuestionAsked,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'senku',
      text: "BEEP-BOOP! Mecha Senku online! Ask me anything about Physics, Chemistry, Biology, or the experiment in front of you!",
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState<ScienceAiHealthResponse | null>(null);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const refreshHealth = async () => {
    setCheckingHealth(true);
    const status = await checkScienceAiHealth();
    setAiStatus(status);
    setCheckingHealth(false);
  };

  useEffect(() => {
    if (isOpen) {
      void refreshHealth();
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    soundManager.playClick();
    onQuestionAsked?.(trimmed);

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'student',
      text: trimmed,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const result = await askSenkuQuestion(trimmed, contextLab);

    if (result.ok && result.answer) {
      soundManager.playChimeSuccess();
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'senku',
          text: result.answer!,
        },
      ]);
    } else {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'system',
          unavailable: !result.configured,
          text:
            result.error ||
            'Senku AI is currently unavailable. Please configure server-side credentials.',
        },
      ]);
      if (!result.configured) {
        setAiStatus((prev) => ({
          healthy: prev?.healthy ?? true,
          aiConfigured: false,
          model: null,
        }));
      }
    }

    setIsLoading(false);
  };

  const quickPrompts = [
    'Why does Pb(NO₃)₂ + KI turn bright yellow?',
    'Explain how a convex lens forms a real image.',
    'Why do plant cells need a rigid cell wall?',
  ];

  return (
    <div
      data-testid="senku-ai-modal"
      className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm science-fade-in"
    >
      <div className="stone-panel w-full max-w-2xl rounded-2xl border-2 border-cyan-500/50 shadow-2xl overflow-hidden flex flex-col max-h-[85%]">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-900/95 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full p-0.5 bg-gradient-to-tr from-cyan-500 to-emerald-400 shadow-md overflow-hidden">
              <img
                src="/science-assets/mecha_senku.png"
                alt="Mecha Senku AI"
                className="w-full h-full object-cover rounded-full bg-slate-950"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-cyan-300 font-mono tracking-wider uppercase">
                  Mecha Senku AI Tutor
                </h3>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-black bg-cyan-950/80 text-cyan-300 border border-cyan-600/50">
                  SERVER PROXY
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Active wing: <span className="text-slate-200 uppercase">{contextLab}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void refreshHealth()}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
              title="Refresh AI Backend Status"
            >
              <RefreshCw className={`w-4 h-4 ${checkingHealth ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              data-testid="senku-ai-close"
              onClick={() => {
                soundManager.playClick();
                onClose();
              }}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Close Senku AI"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Honest Server Credential Status Banner */}
        {aiStatus && !aiStatus.aiConfigured && (
          <div
            data-testid="senku-ai-unavailable-banner"
            className="px-5 py-2.5 bg-amber-950/70 border-b border-amber-500/40 flex items-start gap-2.5 text-xs text-amber-200"
          >
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="text-amber-300 font-mono uppercase">
                AI Unavailable (Server Credentials Not Configured):
              </strong>{' '}
              {aiStatus.healthy
                ? 'The Science AI backend (/api/science/ai) is online, but SCIENCE_AI_API_KEY is not set on the server. All interactive labs and local chemical reaction simulations remain 100% functional.'
                : 'The Science AI backend (/api/science/ai) is offline. Start npm run dev:science:ai and configure SCIENCE_AI_API_KEY on the server to enable live AI replies.'}
            </div>
          </div>
        )}

        {aiStatus && aiStatus.aiConfigured && (
          <div
            data-testid="senku-ai-configured-banner"
            className="px-5 py-2 bg-emerald-950/50 border-b border-emerald-500/30 flex items-center gap-2 text-[11px] text-emerald-300 font-mono"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>
              Server-side Science AI connected ({aiStatus.model || 'configured model'}).
            </span>
          </div>
        )}

        {/* Chat Messages */}
        <div className="flex-1 p-5 overflow-y-auto space-y-3.5 bg-slate-950/70 min-h-[260px]">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender === 'student' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                data-testid={`senku-msg-${msg.sender}`}
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed shadow-md ${
                  msg.sender === 'student'
                    ? 'bg-cyan-600 text-slate-950 font-semibold rounded-br-sm'
                    : msg.sender === 'system'
                    ? 'bg-amber-950/70 border border-amber-500/50 text-amber-100 rounded-bl-sm'
                    : 'bg-slate-900 border border-slate-700/80 text-slate-100 rounded-bl-sm'
                }`}
              >
                {msg.sender === 'senku' && (
                  <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block mb-1 font-mono flex items-center gap-1">
                    <Bot className="w-3 h-3" /> Mecha Senku
                  </span>
                )}
                {msg.sender === 'system' && (
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-1 font-mono flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />{' '}
                    {msg.unavailable ? 'Senku AI Unavailable' : 'Service Notice'}
                  </span>
                )}
                <div className="whitespace-pre-wrap">{msg.text}</div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-900 border border-slate-700/80 text-cyan-300 rounded-2xl rounded-bl-sm px-4 py-3 text-xs font-mono flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '0.15s' }} />
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '0.3s' }} />
                <span>Calculating scientific response...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggested Prompts */}
        <div className="px-4 py-2 bg-slate-900/80 border-t border-slate-800 flex flex-wrap gap-1.5">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => setInput(prompt)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-mono border border-slate-700 transition-colors cursor-pointer"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Form */}
        <form
          onSubmit={handleSend}
          className="p-3.5 bg-slate-900 border-t border-slate-800 flex items-center gap-2"
        >
          <input
            type="text"
            data-testid="senku-ai-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Mecha Senku a science question..."
            disabled={isLoading}
            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
          />
          <button
            type="submit"
            data-testid="senku-ai-submit"
            disabled={!input.trim() || isLoading}
            className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>Ask</span>
          </button>
        </form>
      </div>
    </div>
  );
};

