import React, { useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Users,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Share2,
  Check,
  Building2,
  Info,
  PackageCheck,
  MessageSquare,
  XCircle,
} from 'lucide-react';
import type { Activity, Registration, User } from '../types';

interface ActivityDetailModalProps {
  activity: Activity | null;
  currentUser: User;
  userRegistration?: Registration;
  onClose: () => void;
  onRSVP: (activity: Activity) => void;
  onCancelRSVP: (activity: Activity) => void;
  onViewQR: (registration: Registration) => void;
  onAskAI: (activity: Activity) => void;
  onDeleteActivity?: (activity: Activity) => void;
}

export const ActivityDetailModal: React.FC<ActivityDetailModalProps> = ({
  activity,
  currentUser,
  userRegistration,
  onClose,
  onRSVP,
  onCancelRSVP,
  onViewQR,
  onAskAI,
  onDeleteActivity,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  if (!activity) return null;

  const {
    title,
    description,
    location,
    start_date,
    end_date,
    max_participants,
    current_confirmed,
    current_waiting,
    category,
    banner_image,
    tags,
    organizer_name,
    organizer_faculty,
    required_items,
  } = activity;

  const isFull = current_confirmed >= max_participants;
  const spotsLeft = Math.max(0, max_participants - current_confirmed);
  const isRegistered =
    currentUser.role !== 'organizer' && !!userRegistration && userRegistration.status !== 'CANCELLED';
  const isConfirmed = currentUser.role !== 'organizer' && userRegistration?.status === 'CONFIRMED';

  const startDateObj = new Date(start_date);
  const endDateObj = new Date(end_date);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[92vh]">
        {/* Banner with close button */}
        <div className="relative aspect-[16/8] sm:aspect-[21/9] w-full bg-slate-950 overflow-hidden shrink-0">
          <img
            src={banner_image || 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80'}
            alt={title}
            className="w-full h-full object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-black/30" />

          {/* Close & Share */}
          <div className="absolute top-4 inset-x-4 flex items-center justify-between z-10">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/20 backdrop-blur-md text-white border border-white/20">
              {category}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                className="p-2 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-colors"
                title="คัดลอกลิงก์กิจกรรม"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Header Title inside banner */}
          <div className="absolute bottom-4 inset-x-4 text-white">
            <div className="flex flex-wrap gap-1 mb-1.5">
              {tags?.map((t, idx) => (
                <span key={idx} className="text-[10px] px-2 py-0.5 rounded bg-white/20 backdrop-blur-sm">
                  #{t}
                </span>
              ))}
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight line-clamp-2 leading-snug">
              {title}
            </h2>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {/* Quick Registration Status Alert */}
          {isRegistered && (
            <div
              className={`p-4 rounded-2xl border flex items-center justify-between gap-3 animate-fade-in ${
                isConfirmed
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              <div className="flex items-center gap-3">
                {isConfirmed ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                ) : (
                  <Clock className="w-6 h-6 text-amber-600 shrink-0" />
                )}
                <div>
                  <div className="font-bold text-sm">
                    {isConfirmed ? 'ยืนยันที่นั่งเรียบร้อยแล้ว (CONFIRMED)' : 'คุณอยู่ใน Waiting List (รอคิว)'}
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    {isConfirmed
                      ? 'ระบบได้สร้าง QR Token สำหรับใช้สแกน Check-in หน้างานเรียบร้อย'
                      : 'หากมีผู้ยกเลิก ระบบจะเลื่อนคุณขึ้นเป็นผู้มีสิทธิ์ยืนยันที่นั่งอัตโนมัติ'}
                  </div>
                </div>
              </div>

              {userRegistration && (
                <button
                  onClick={() => onViewQR(userRegistration)}
                  className="px-3.5 py-2 rounded-xl bg-white shadow-xs border border-slate-200 hover:border-indigo-400 text-indigo-700 text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors"
                >
                  <QrCode className="w-4 h-4" />
                  <span>ดู QR Pass</span>
                </button>
              )}
            </div>
          )}

          {/* Time & Location Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-400">วันและเวลาเริ่มกิจกรรม</div>
                <div className="text-sm font-bold text-slate-800 mt-0.5">
                  {startDateObj.toLocaleDateString('th-TH', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  เวลา{' '}
                  {startDateObj.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} -{' '}
                  {endDateObj.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-400">สถานที่จัดกิจกรรม</div>
                <div className="text-sm font-bold text-slate-800 mt-0.5 leading-snug">{location}</div>
                <div className="text-xs text-slate-500 mt-0.5">ภายในมหาวิทยาลัย</div>
              </div>
            </div>
          </div>

          {/* Capacity Progress Box */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-indigo-600" />
                สถานะที่นั่ง ({current_confirmed}/{max_participants})
              </span>
              <span
                className={`text-xs font-bold ${
                  isFull ? 'text-rose-600' : 'text-emerald-600'
                }`}
              >
                {isFull ? `เต็มแล้ว (${current_waiting} ใน Waiting List)` : `ว่างอีก ${spotsLeft} ที่`}
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isFull ? 'bg-rose-500' : 'bg-indigo-600'
                }`}
                style={{ width: `${Math.min(100, (current_confirmed / max_participants) * 100)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              ระบบ Waiting List อัตโนมัติ: หากมีผู้สละสิทธิ์ คิวถัดไปจะได้รับการยืนยันทันที
            </p>
          </div>

          {/* Description */}
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Info className="w-4 h-4 text-indigo-600" />
              รายละเอียดกิจกรรม
            </h4>
            <div className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
              {description}
            </div>
          </div>

          {/* Required Items */}
          {required_items && (
            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                <PackageCheck className="w-4 h-4 text-emerald-600" />
                สิ่งที่ต้องเตรียมมาในวันงาน
              </h4>
              <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100 text-xs sm:text-sm text-emerald-900 font-medium">
                {required_items}
              </div>
            </div>
          )}

          {/* Organizer Info */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-sm">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-400">ผู้จัดกิจกรรม</div>
                <div className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <span>{organizer_name}</span>
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="text-xs text-slate-500">{organizer_faculty || 'มหาวิทยาลัย'}</div>
              </div>
            </div>

            <button
              onClick={() => onAskAI(activity)}
              className="px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>ถาม AI เกี่ยวกับกิจกรรมนี้</span>
            </button>
          </div>
        </div>

        {/* Modal Sticky Action Footer */}
        <div className="p-4 sm:p-5 bg-white border-t border-slate-100 flex items-center justify-between gap-3 shadow-lg">
          <div>
            <div className="text-xs text-slate-400">ผู้ลงทะเบียน</div>
            <div className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1">
              <span>{currentUser.name}</span>
              <span className="text-[11px] font-normal text-emerald-600">
                (Show-up Rate {currentUser.show_up_rate || 90}%)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentUser.role === 'organizer' ? (
              <div className="flex items-center gap-2">
                {onDeleteActivity && (activity.organizer_id === currentUser.id || currentUser.id === 3) && (
                  <button
                    type="button"
                    onClick={() => onDeleteActivity(activity)}
                    className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    title="ลบกิจกรรมนี้ทันที"
                  >
                    <XCircle className="w-4 h-4 text-rose-500" />
                    <span>ลบกิจกรรมนี้</span>
                  </button>
                )}
                <div className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-2.5 rounded-xl">
                  มุมมองผู้จัดกิจกรรม
                </div>
              </div>
            ) : isRegistered ? (
              <>
                <button
                  type="button"
                  disabled={isCancelling}
                  onClick={async () => {
                    try {
                      setIsCancelling(true);
                      await onCancelRSVP(activity);
                    } finally {
                      setIsCancelling(false);
                    }
                  }}
                  className={`px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 active:scale-95 shadow-2xs ${
                    isCancelling
                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                      : 'bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 border-rose-200 cursor-pointer'
                  }`}
                  title="สละสิทธิ์และยกเลิกการลงทะเบียนกิจกรรมนี้"
                >
                  <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{isCancelling ? 'กำลังสละสิทธิ์...' : 'สละสิทธิ์ / ยกเลิก'}</span>
                </button>
                {userRegistration && (
                  <button
                    type="button"
                    onClick={() => onViewQR(userRegistration)}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>แสดงตั๋ว QR</span>
                  </button>
                )}
              </>
            ) : (
              <button
                type="button"
                onClick={() => onRSVP(activity)}
                className={`px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white shadow-xs transition-all flex items-center gap-2 cursor-pointer ${
                  isFull
                    ? 'bg-amber-600 hover:bg-amber-700 active:scale-95'
                    : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isFull ? 'เข้าคิวรอ (Waiting List)' : 'ลงทะเบียนยืนยันสิทธิ์ (RSVP)'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
