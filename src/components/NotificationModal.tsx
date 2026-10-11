import React from 'react';
import {
  X,
  Bell,
  CheckCircle2,
  Clock,
  Calendar,
  Layers,
  CheckCheck,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import type { AppNotification } from '../types';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onSelectActivity?: (activityId: number) => void;
  onViewTickets?: () => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onSelectActivity,
  onViewTickets,
}) => {
  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'registration_confirmed':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />;
      case 'waitlist_promoted':
        return <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0" />;
      case 'checked_in':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />;
      case 'event_reminder':
        return <Calendar className="w-5 h-5 text-amber-600 shrink-0" />;
      default:
        return <Bell className="w-5 h-5 text-slate-500 shrink-0" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 bg-white border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-900">การแจ้งเตือน</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500 text-white">
                    {unreadCount} ข้อความใหม่
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">แจ้งเตือนสถานะการลงทะเบียนและกิจกรรมของคุณ</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllAsRead}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors flex items-center gap-1"
                title="ทำเครื่องหมายว่าอ่านแล้วทั้งหมด"
              >
                <CheckCheck className="w-4 h-4" />
                <span className="hidden sm:inline">อ่านแล้วทั้งหมด</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* List of notifications */}
        <div className="p-4 sm:p-6 overflow-y-auto divide-y divide-slate-100 space-y-2">
          {notifications.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <Bell className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-sm font-medium">ยังไม่มีการแจ้งเตือนในขณะนี้</p>
            </div>
          ) : (
            notifications.map((notif) => {
              const timeString = new Date(notif.created_at).toLocaleString('th-TH', {
                dateStyle: 'short',
                timeStyle: 'short',
              });

              return (
                <div
                  key={notif.id}
                  onClick={() => {
                    if (!notif.read) onMarkAsRead(notif.id);
                    if (notif.activity_id && onSelectActivity) {
                      onSelectActivity(notif.activity_id);
                      onClose();
                    } else if (onViewTickets) {
                      onViewTickets();
                      onClose();
                    }
                  }}
                  className={`pt-3 pb-3 px-3 rounded-2xl cursor-pointer transition-colors flex items-start gap-3.5 ${
                    notif.read ? 'bg-white hover:bg-slate-50' : 'bg-indigo-50/40 hover:bg-indigo-50/70'
                  }`}
                >
                  <div className="mt-0.5">{getIcon(notif.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4
                        className={`text-xs sm:text-sm font-bold truncate ${
                          notif.read ? 'text-slate-800' : 'text-indigo-950 font-extrabold'
                        }`}
                      >
                        {notif.title}
                      </h4>
                      <span className="text-[11px] text-slate-400 font-mono shrink-0">
                        {timeString}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {notif.message}
                    </p>
                  </div>
                  {!notif.read && (
                    <span className="w-2 h-2 rounded-full bg-rose-500 mt-2 shrink-0" />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>ระบบแจ้งเตือนแบบเรียลไทม์</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl hover:bg-slate-200 text-slate-700 font-medium transition-colors"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};
