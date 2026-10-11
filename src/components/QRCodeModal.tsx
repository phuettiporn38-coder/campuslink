import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X, CheckCircle2, Clock, MapPin, Calendar, User, ShieldCheck, Copy, Check } from 'lucide-react';
import type { Registration } from '../types';

interface QRCodeModalProps {
  registration: Registration | null;
  onClose: () => void;
  onQuickCheckIn?: (token: string) => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ registration, onClose, onQuickCheckIn }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (registration?.qr_token) {
      QRCode.toDataURL(registration.qr_token, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error(err));
    }
  }, [registration]);

  if (!registration) return null;

  const { activity, user, status, checked_in_at, qr_token } = registration;
  const isConfirmed = status === 'CONFIRMED';
  const isCheckedIn = !!checked_in_at;

  const handleCopy = () => {
    navigator.clipboard.writeText(qr_token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-sm sm:max-w-md bg-white rounded-3xl shadow-2xl overflow-y-auto max-h-[90vh] border border-slate-100">
        {/* Ticket Header */}
        <div className={`p-5 text-white ${isConfirmed ? 'bg-slate-900' : 'bg-amber-700'}`}>
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-md">
              {isConfirmed ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  E-PASS ยืนยันที่นั่งแล้ว
                </>
              ) : (
                <>
                  <Clock className="w-3.5 h-3.5" />
                  WAITING LIST
                </>
              )}
            </span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <h3 className="mt-3 text-lg font-bold line-clamp-1">{activity?.title || 'บัตรเข้าร่วมกิจกรรม'}</h3>
          <p className="text-xs text-white/80 mt-1 flex items-center gap-1">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="line-clamp-1">{activity?.location}</span>
          </p>
        </div>

        {/* Ticket Body / QR Section */}
        <div className="p-6 flex flex-col items-center text-center">
          {/* QR Code Container */}
          <div className="relative p-3 bg-white rounded-2xl border-2 border-dashed border-slate-200 shadow-inner group">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR Code Ticket" className="w-56 h-56 sm:w-64 sm:h-64 rounded-lg object-contain" />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center text-slate-400">กำลังสร้าง QR Code...</div>
            )}

            {/* Checked-in Stamp Overlay */}
            {isCheckedIn && (
              <div className="absolute inset-0 bg-emerald-600/90 rounded-2xl flex flex-col items-center justify-center text-white backdrop-blur-xs animate-scale-up">
                <CheckCircle2 className="w-16 h-16 mb-2" />
                <span className="text-xl font-bold tracking-wider uppercase">CHECKED-IN</span>
                <span className="text-xs text-emerald-100 mt-1">
                  {new Date(checked_in_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                </span>
              </div>
            )}
          </div>

          {/* Student Info */}
          <div className="mt-4 w-full bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-left">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>ผู้ถือบัตร</span>
              <span className="font-mono text-slate-700">{user?.student_id || 'Student Pass'}</span>
            </div>
            <div className="font-semibold text-slate-900 text-sm flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-600" />
              <span>{user?.name}</span>
            </div>
            <div className="text-xs text-slate-500 mt-1 line-clamp-1">{user?.faculty}</div>
          </div>

          {/* QR Token display & copy */}
          <div className="mt-3 w-full flex items-center justify-between bg-slate-100 px-3 py-2 rounded-xl text-xs font-mono text-slate-600">
            <span className="truncate max-w-[220px]">Token: {qr_token}</span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-sans font-medium"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
            </button>
          </div>

          <p className="mt-3 text-xs text-slate-500">
            {isCheckedIn
              ? 'คุณได้ทำการเช็คอินหน้างานเรียบร้อยแล้ว'
              : 'แสดง QR Code นี้ต่อเจ้าหน้าที่ผู้จัด ณ จุดลงทะเบียนหน้างาน'}
          </p>

          {/* Helper notice */}
          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <span className="text-[11px] text-slate-400">
              * เจ้าหน้าที่จะทำการสแกน QR Code นี้ผ่านระบบเพื่อยืนยันการเข้าร่วม
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
