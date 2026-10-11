import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Bot,
  User,
  RefreshCw,
  HelpCircle,
  MapPin,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
} from 'lucide-react';
import { api } from '../services/api';
import type { Activity, User as UserType } from '../types';

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
}

interface AIAssistantViewProps {
  currentUser: UserType | null;
  activities: Activity[];
  initialQuestion?: string;
  onExploreActivity?: (activityId: number) => void;
}

export const AIAssistantView: React.FC<AIAssistantViewProps> = ({
  currentUser,
  activities,
  initialQuestion,
  onExploreActivity,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: `สวัสดีครับ${currentUser ? `คุณ ${currentUser.name}` : ''} ยินดีต้อนรับสู่ CampusLink AI Assistant (${currentUser?.role === 'organizer' ? 'สำหรับผู้จัดกิจกรรม' : 'สำหรับผู้เข้าร่วมกิจกรรม'})\n\nสามารถสอบถามข้อมูลกิจกรรมต่างๆ ในมหาวิทยาลัยได้ทันที เช่น:\n- สถานที่จัดกิจกรรมและการเดินทาง\n- กำหนดการ เวลาเริ่มและเวลาสิ้นสุด\n- สิ่งของและเอกสารที่ต้องจัดเตรียมมาในวันงาน\n- การสแกน QR Code หน้างาน และการรักษาคะแนน Show-up Rate\n- แนะนำกิจกรรมตามความสนใจและคณะ\n\nสามารถพิมพ์คำถามหรือเลือกหัวข้อด้านล่างได้เลยครับ`,
      timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputValue, setInputValue] = useState(initialQuestion || '');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    if (initialQuestion) {
      handleSendMessage(initialQuestion);
    }
  }, [initialQuestion]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputValue).trim();
    if (!query || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setLoading(true);

    try {
      const res = await api.askAI(query, currentUser?.id);
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: res.answer,
        timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: 'ขออภัย ขณะนี้ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้งในภายหลัง',
        timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    'กิจกรรม Hackathon AI จัดที่ไหน และต้องเตรียมอะไรบ้าง',
    'กิจกรรมฟุตบอล 5 คน มินิลีก เริ่มกี่โมง',
    'ช่วยแนะนำกิจกรรมที่ยังมีที่นั่งว่างในสัปดาห์นี้',
    'Show-up Rate คำนวณอย่างไร และมีผลกับสิทธิ์ลงทะเบียนอย่างไร',
    'ขั้นตอนการใช้ QR Code สำหรับเช็คอินหน้างานเป็นอย่างไร',
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-4 animate-fade-in pb-12">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xs border border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-indigo-400">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black">AI Activity Assistant</h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Connected to University AI
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              ผู้ช่วยตอบคำถาม แนะนำกิจกรรม และตรวจสอบข้อมูลการเข้าร่วม
            </p>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col h-[650px] overflow-hidden">
        {/* Messages List */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
          {messages.map((msg) => {
            const isAI = msg.sender === 'ai';

            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-[85%] sm:max-w-[75%] ${
                  isAI ? 'self-start mr-auto' : 'self-end ml-auto flex-row-reverse'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${
                    isAI
                      ? 'bg-slate-800 text-white'
                      : 'bg-indigo-600 text-white'
                  }`}
                >
                  {isAI ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
                </div>

                <div>
                  <div
                    className={`p-4 rounded-3xl text-xs sm:text-sm leading-relaxed whitespace-pre-line ${
                      isAI
                        ? 'bg-slate-50 text-slate-800 border border-slate-200/80 rounded-tl-sm'
                        : 'bg-indigo-600 text-white rounded-tr-sm'
                    }`}
                  >
                    {msg.text}
                  </div>
                  <div
                    className={`text-[10px] text-slate-400 mt-1 px-2 ${
                      isAI ? 'text-left' : 'text-right'
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex gap-3 max-w-[85%] self-start mr-auto">
              <div className="w-9 h-9 rounded-2xl bg-slate-800 text-white flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5" />
              </div>
              <div className="p-4 rounded-3xl bg-slate-50 border border-slate-200/80 text-xs sm:text-sm text-slate-500 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                <span>AI กำลังประมวลผลคำตอบ...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips (Without emojis) */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center gap-2 overflow-x-auto text-xs no-scrollbar">
          <span className="text-[11px] font-bold text-slate-400 shrink-0 flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
            คำถามแนะนำ:
          </span>
          {quickPrompts.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(q)}
              className="px-3 py-1.5 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium whitespace-nowrap transition-colors"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-white border-t border-slate-100">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="พิมพ์คำถามเกี่ยวกับกิจกรรม หรือขอคำแนะนำ..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={loading}
              className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
            />
            <button
              type="submit"
              disabled={loading || !inputValue.trim()}
              className="p-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl shadow-xs transition-all"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
