import React from 'react';
import { Calendar, MapPin, Users, Clock, CheckCircle2, ArrowRight, MessageSquare } from 'lucide-react';
import type { Activity, Registration, User } from '../types';

interface ActivityCardProps {
  activity: Activity;
  currentUser?: User;
  userRegistration?: Registration;
  onSelect: (activity: Activity) => void;
  onRSVP: (activity: Activity) => void;
  onAskAI: (activity: Activity) => void;
}

export const ActivityCard: React.FC<ActivityCardProps> = ({
  activity,
  currentUser,
  userRegistration,
  onSelect,
  onRSVP,
  onAskAI,
}) => {
  const {
    title,
    description,
    location,
    start_date,
    max_participants,
    current_confirmed,
    current_waiting,
    category,
    banner_image,
    tags,
  } = activity;

  const isFull = current_confirmed >= max_participants;
  const spotsLeft = Math.max(0, max_participants - current_confirmed);
  const percentage = Math.min(100, Math.round((current_confirmed / max_participants) * 100));

  const isUserRegistered =
    currentUser?.role !== 'organizer' && !!userRegistration && userRegistration.status !== 'CANCELLED';
  const isUserConfirmed = currentUser?.role !== 'organizer' && userRegistration?.status === 'CONFIRMED';

  const startDateObj = new Date(start_date);
  const dateFormatted = startDateObj.toLocaleDateString('th-TH', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const timeFormatted = startDateObj.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="group bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col overflow-hidden hover:-translate-y-1">
      {/* Banner Image & Category */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100">
        <img
          src={banner_image || 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80'}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-black/20" />

        {/* Top Badges */}
        <div className="absolute top-3 inset-x-3 flex items-center justify-between">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/95 backdrop-blur-md text-slate-800 shadow-xs">
            {category}
          </span>

          {currentUser?.role !== 'organizer' && isUserRegistered && (
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold shadow-xs flex items-center gap-1 text-white ${
                isUserConfirmed ? 'bg-emerald-600' : 'bg-amber-600'
              }`}
            >
              {isUserConfirmed ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  ลงทะเบียนแล้ว
                </>
              ) : (
                <>
                  <Clock className="w-3.5 h-3.5" />
                  อยู่ในคิวรอ
                </>
              )}
            </span>
          )}
        </div>

        {/* Bottom Image Overlay Info */}
        <div className="absolute bottom-3 inset-x-3 text-white">
          <div className="flex items-center gap-2 text-xs font-medium">
            <span className="flex items-center gap-1 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-lg">
              <Calendar className="w-3.5 h-3.5 text-indigo-300" />
              {dateFormatted} • {timeFormatted} น.
            </span>
          </div>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {tags && tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {tags.slice(0, 3).map((tag, idx) => (
                <span
                  key={idx}
                  className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <h3
            onClick={() => onSelect(activity)}
            className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors cursor-pointer line-clamp-1"
          >
            {title}
          </h3>

          <p className="mt-1 text-xs sm:text-sm text-slate-500 line-clamp-2 leading-relaxed">
            {description}
          </p>

          <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-600">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="line-clamp-1">{location}</span>
          </div>
        </div>

        {/* Capacity & Actions */}
        <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
          {/* Progress bar */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-slate-700 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                {current_confirmed}/{max_participants} ที่นั่ง
              </span>
              <span
                className={`font-semibold ${
                  isFull ? 'text-rose-600' : spotsLeft <= 3 ? 'text-amber-600' : 'text-emerald-600'
                }`}
              >
                {isFull ? (
                  current_waiting > 0 ? `เต็มแล้ว (รอคิว ${current_waiting} คน)` : 'ที่นั่งเต็มแล้ว'
                ) : (
                  `เหลืออีก ${spotsLeft} ที่`
                )}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isFull ? 'bg-rose-500' : spotsLeft <= 3 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>

          {/* Action Buttons without emojis */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSelect(activity)}
              className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-1"
            >
              <span>รายละเอียด</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {currentUser?.role === 'organizer' ? null : isUserRegistered ? (
              <button
                type="button"
                onClick={() => onSelect(activity)}
                className="py-2.5 px-4 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs sm:text-sm font-bold transition-colors cursor-pointer"
              >
                ดูตั๋ว QR
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onRSVP(activity)}
                className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                  isFull
                    ? 'bg-amber-600 hover:bg-amber-700 active:scale-95'
                    : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'
                }`}
              >
                <span>{isFull ? 'เข้าคิวรอ (Waiting)' : 'ลงทะเบียน (RSVP)'}</span>
              </button>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                onAskAI(activity);
              }}
              title="ถาม AI เกี่ยวกับกิจกรรมนี้"
              className="p-2.5 rounded-xl border border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100 transition-colors shrink-0"
            >
              <MessageSquare className="w-4 h-4 text-indigo-600" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
