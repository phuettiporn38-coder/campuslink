import React, { useState, useEffect } from 'react';
import {
  Ticket,
  QrCode,
  Calendar,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Search,
} from 'lucide-react';
import type { Registration, User } from '../types';
import { api } from '../services/api';

interface MyTicketsViewProps {
  currentUser: User | null;
  registrations?: Registration[];
  onViewQR: (registration: Registration) => void;
  onExplore: () => void;
  onCancelRSVP: (activityId: number) => Promise<void> | void;
  onOpenLogin?: () => void;
}

export const MyTicketsView: React.FC<MyTicketsViewProps> = ({
  currentUser,
  registrations: externalRegistrations,
  onViewQR,
  onExplore,
  onCancelRSVP,
  onOpenLogin,
}) => {
  const [internalRegistrations, setInternalRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'confirmed' | 'waiting' | 'checked_in'>('all');

  const fetchTickets = async () => {
    if (!currentUser) {
      setInternalRegistrations([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await api.getUserRegistrations(currentUser.id);
      setInternalRegistrations(data);
    } catch (err) {
      console.error('Failed to load user registrations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (externalRegistrations !== undefined) {
      setInternalRegistrations(externalRegistrations);
      setLoading(false);
    } else {
      fetchTickets();
    }
  }, [currentUser?.id, externalRegistrations]);

  const handleCancelClick = async (activityId: number) => {
    try {
      setCancellingId(activityId);
      // Optimistically update tickets list
      setInternalRegistrations((prev) => prev.filter((r) => r.activity_id !== activityId));
      await onCancelRSVP(activityId);
      await fetchTickets();
    } catch (err) {
      console.error('Cancel failed:', err);
      await fetchTickets();
    } finally {
      setCancellingId(null);
    }
  };

  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4 bg-white rounded-3xl border border-slate-200 p-8 shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
          <Ticket className="w-7 h-7" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-800">กรุณาเข้าสู่ระบบเพื่อดูตั๋ว E-Pass</h3>
          <p className="text-xs text-slate-500 mt-1">
            เข้าสู่ระบบด้วยอีเมลหรือรหัสนิสิตเพื่อดูประวัติการลงทะเบียนกิจกรรมและแสดง QR Code สำหรับเช็คอิน
          </p>
        </div>
        {onOpenLogin && (
          <button
            onClick={onOpenLogin}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
          >
            เข้าสู่ระบบ
          </button>
        )}
      </div>
    );
  }

  const filtered = internalRegistrations.filter((reg) => {
    if (filter === 'confirmed') return reg.status === 'CONFIRMED' && !reg.checked_in_at;
    if (filter === 'waiting') return reg.status === 'WAITING';
    if (filter === 'checked_in') return !!reg.checked_in_at;
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <Ticket className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">ตั๋วและบัตร E-Pass ของฉัน</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              แสดงรหัส QR Code นี้ต่อผู้จัดเพื่อสแกน Check-in ยืนยันการเข้าร่วมหน้างาน
            </p>
          </div>
        </div>

        {/* Quick summary chips */}
        <div className="flex items-center gap-2 text-xs font-semibold">
          <div className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700">
            ทั้งหมด: {internalRegistrations.length}
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
            เช็คอินแล้ว: {internalRegistrations.filter((r) => r.checked_in_at).length}
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
            รอคิว: {internalRegistrations.filter((r) => r.status === 'WAITING').length}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold text-slate-600">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-xl transition-all shrink-0 ${
            filter === 'all'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white hover:bg-slate-100 border border-slate-200'
          }`}
        >
          ทั้งหมด ({internalRegistrations.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('confirmed')}
          className={`px-4 py-2 rounded-xl transition-all shrink-0 ${
            filter === 'confirmed'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white hover:bg-slate-100 border border-slate-200'
          }`}
        >
          ยืนยันที่นั่งแล้ว ({internalRegistrations.filter((r) => r.status === 'CONFIRMED' && !r.checked_in_at).length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('checked_in')}
          className={`px-4 py-2 rounded-xl transition-all shrink-0 ${
            filter === 'checked_in'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white hover:bg-slate-100 border border-slate-200'
          }`}
        >
          เช็คอินสำเร็จแล้ว ({internalRegistrations.filter((r) => r.checked_in_at).length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('waiting')}
          className={`px-4 py-2 rounded-xl transition-all shrink-0 ${
            filter === 'waiting'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Waiting List ({internalRegistrations.filter((r) => r.status === 'WAITING').length})
        </button>
      </div>

      {/* Tickets Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">กำลังโหลดตั๋วของคุณ...</div>
      ) : filtered.length === 0 ? (
        <div className="p-12 bg-white rounded-3xl border border-dashed border-slate-200 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Ticket className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">ยังไม่มีตั๋วกิจกรรมในหมวดหมู่นี้</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              คุณสามารถสำรวจกิจกรรมของมหาวิทยาลัยและกดลงทะเบียนเพื่อรับตั๋วได้ทันที
            </p>
          </div>
          <button
            onClick={onExplore}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all"
          >
            สำรวจกิจกรรมทั้งหมด
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((reg) => {
            const act = reg.activity;
            const isConfirmed = reg.status === 'CONFIRMED';
            const isCheckedIn = !!reg.checked_in_at;
            const startDate = act ? new Date(act.start_date) : new Date();

            return (
              <div
                key={reg.id}
                className="bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between group"
              >
                {/* Header Ticket banner */}
                <div
                  className={`p-4 text-white flex items-center justify-between ${
                    isCheckedIn
                      ? 'bg-emerald-700'
                      : isConfirmed
                      ? 'bg-slate-900'
                      : 'bg-amber-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-sm flex items-center gap-1">
                      {isCheckedIn ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          CHECKED IN
                        </>
                      ) : isConfirmed ? (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5" />
                          CONFIRMED PASS
                        </>
                      ) : (
                        <>
                          <Clock className="w-3.5 h-3.5" />
                          WAITING LIST
                        </>
                      )}
                    </span>
                  </div>

                  <span className="text-[11px] font-mono opacity-80">
                    ID: #{String(reg.id).padStart(4, '0')}
                  </span>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                      {act?.title || 'กิจกรรมมหาวิทยาลัย'}
                    </h3>

                    <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          {startDate.toLocaleDateString('th-TH', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}{' '}
                          •{' '}
                          {startDate.toLocaleTimeString('th-TH', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          น.
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="line-clamp-1">{act?.location}</span>
                      </div>
                    </div>

                    {/* Check-in stamp or token */}
                    <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-mono text-[11px] truncate max-w-[200px]">
                        Token: {reg.qr_token.slice(0, 16)}...
                      </span>
                      {isCheckedIn ? (
                        <span className="text-emerald-600 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          เช็คอินแล้ว
                        </span>
                      ) : (
                        <span className="text-slate-400">ยังไม่เช็คอิน</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      disabled={cancellingId === act?.id}
                      onClick={() => act && handleCancelClick(act.id)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-2xs ${
                        cancellingId === act?.id
                          ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                          : 'bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 border border-rose-200'
                      }`}
                      title="สละสิทธิ์และยกเลิกการลงทะเบียนกิจกรรมนี้"
                    >
                      <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span>{cancellingId === act?.id ? 'กำลังสละสิทธิ์...' : 'สละสิทธิ์ / ยกเลิก'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onViewQR(reg)}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <QrCode className="w-4 h-4" />
                      <span>แสดง QR Code</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
