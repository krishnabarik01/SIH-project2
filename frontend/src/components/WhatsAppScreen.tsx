import React, { useState } from 'react';
import { Send, Smartphone, Sparkles, MessageCircle, Bot, User, CheckCheck } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  time: string;
}

export const WhatsAppScreen: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'bot',
      text: '🇮🇳 *मौसम-रक्षक (MONSOON-GUARD)*\nकृषि मौसम विज्ञान प्रभाग, पृथ्वी विज्ञान मंत्रालय (MoES)\n\nनमस्ते! अपनी फसल और जिले/ब्लॉक का नाम भेजें (जैसे: *धान रायपुर* या *सोयाबीन दुर्ग*)। हम आपको आगामी 14 दिनों का सटीक मौसम व बुवाई परामर्श देंगे।',
      time: '10:00 AM',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);

  const samplePrompts = [
    'धान रायपुर सलाह',
    'सोयाबीन दुर्ग मौसम',
    'मक्का बिलासपुर बुवाई',
    'बस्तर धान सलाह',
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputText;
    if (!query.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: query,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsSending(true);

    try {
      const res = await fetch('/api/whatsapp/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_number: '+919876543210',
          body: query,
          block_id: 'CG_RAI_01',
          crop: 'paddy',
        }),
      });
      const data = await res.json();

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: data.response_message,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Description Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
            Interactive WhatsApp / SMS Delivery Mock
          </span>
          <h2 className="text-xl font-bold text-white mt-1">
            Farmer Mobile Chat Simulation
          </h2>
          <p className="text-xs text-slate-400">
            Connected to <code>POST /whatsapp/webhook</code>. Test real-time natural language query parsing.
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400">
          <Smartphone className="w-6 h-6" />
        </div>
      </div>

      {/* Suggested Fast Prompts */}
      <div className="flex flex-wrap gap-2">
        {samplePrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(p)}
            className="text-xs px-3 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition flex items-center gap-1.5"
          >
            <span>💬</span> {p}
          </button>
        ))}
      </div>

      {/* WhatsApp Chat Phone Container */}
      <div className="bg-slate-950 border-2 border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col h-[520px]">
        {/* WhatsApp App Bar */}
        <div className="bg-emerald-900 px-4 py-3 flex items-center gap-3 border-b border-emerald-800">
          <div className="w-9 h-9 rounded-full bg-emerald-800 flex items-center justify-center text-white font-bold text-sm">
            🌾
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm flex items-center gap-1.5">
              <span>MONSOON-GUARD Agromet Bot</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            </h3>
            <p className="text-[11px] text-emerald-200">
              Official MoES / NCMRWF Agricultural Service
            </p>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#0a101d]">
          {messages.map((m) => {
            const isUser = m.sender === 'user';
            return (
              <div
                key={m.id}
                className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 text-xs shadow-sm whitespace-pre-wrap leading-relaxed ${
                    isUser
                      ? 'bg-emerald-700 text-white rounded-tr-none'
                      : 'bg-slate-850 text-slate-200 border border-slate-800 rounded-tl-none font-sans'
                  }`}
                >
                  <p>{m.text}</p>
                  <div className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                    isUser ? 'text-emerald-200' : 'text-slate-400'
                  }`}>
                    <span>{m.time}</span>
                    {isUser && <CheckCheck className="w-3.5 h-3.5 text-cyan-300" />}
                  </div>
                </div>
              </div>
            );
          })}
          {isSending && (
            <div className="flex justify-start">
              <div className="bg-slate-850 text-slate-400 border border-slate-800 rounded-2xl p-3 text-xs italic">
                Evaluating ML probabilities and drafting advisory...
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type message in Hindi or English (e.g. धान रायपुर सलाह)..."
            className="flex-1 bg-slate-800 text-slate-100 placeholder-slate-500 text-xs rounded-xl px-3.5 py-2.5 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim() || isSending}
            className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white transition"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
