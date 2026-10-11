import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Users,
  CheckCircle2,
  Clock,
  QrCode,
  Search,
  Filter,
  Download,
  Copy,
  Check,
  TrendingUp,
  AlertCircle,
  ChevronDown,
  UserCheck,
  Calendar,
  Trash2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import type { Activity, ActivityDashboard, Registration, User } from '../types';

interface DashboardViewProps {
  activities: Activity[];
  currentUser: User;
  onOpenScanner: () => void;
  onRefreshData?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  activities,
  currentUser,
  onOpenScanner,
  onRefreshData,
}) => {
  const myActivities = activities.filter((a) => a.organizer_id === currentUser.id);
  const [selectedActivityId, setSelectedActivityId] = useState<number>(
    myActivities.length > 0 ? myActivities[0].id : 0
  );
  const [dashboard, setDashboard] = useState<ActivityDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'checked_in' | 'confirmed' | 'waiting'>('all');
  const [copiedReport, setCopiedReport] = useState(false);

  const loadDashboard = async (activityId: number) => {
    try {
      setLoading(true);
      const data = await api.getActivityDashboard(activityId);
      setDashboard(data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedActivityId) {
      loadDashboard(selectedActivityId);
    }
  }, [selectedActivityId]);

  const handleManualCheckIn = async (regId: number) => {
    try {
      const res = await api.checkIn({ registration_id: regId });
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });
      loadDashboard(selectedActivityId);
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Check-in failed');
    }
  };

  const handleCopyReport = () => {
    if (!dashboard) return;
    const text = `รายงานสรุปกิจกรรม: ${dashboard.activity.title}
สถานที่: ${dashboard.activity.location}
จำนวนผู้ลงทะเบียนทั้งหมด: ${dashboard.total_registered} คน
ยืนยันที่นั่ง (Confirmed): ${dashboard.confirmed_count} / ${dashboard.activity.max_participants}
เช็คอินหน้างานแล้ว: ${dashboard.checked_in_count} คน
อยู่ใน Waiting List: ${dashboard.waiting_count} คน
Show-up Rate: ${dashboard.show_up_rate}% (สูตรคำนวณ: Checked-in / Confirmed * 100)`;

    navigator.clipboard.writeText(text);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
  };

  const [editingEndDate, setEditingEndDate] = useState(false);
  const [customEndDate, setCustomEndDate] = useState('');

  const handleUpdateEndDate = async (targetDateIso: string) => {
    if (!dashboard?.activity) return;
    try {
      await api.updateActivity(dashboard.activity.id, {
        end_date: targetDateIso,
      });
      alert('อัปเดตเวลาสิ้นสุดกิจกรรมเรียบร้อยแล้ว');
      setEditingEndDate(false);
      if (onRefreshData) onRefreshData();
      loadDashboard(dashboard.activity.id);
    } catch (err: any) {
      alert(err.message || 'ไม่สามารถอัปเดตเวลาได้');
    }
  };

  const handleDeleteActivity = async () => {
    if (!dashboard?.activity) return;
    const confirmDelete = window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบกิจกรรม "${dashboard.activity.title}" ทันที? (ข้อมูลผู้ลงทะเบียนจะถูกลบด้วย)`);
    if (!confirmDelete) return;

    try {
      await api.deleteActivity(dashboard.activity.id);
      alert('ลบกิจกรรมเรียบร้อยแล้ว');
      if (onRefreshData) onRefreshData();
      const remaining = myActivities.filter((a) => a.id !== dashboard.activity.id);
      if (remaining.length > 0) {
        setSelectedActivityId(remaining[0].id);
      } else {
        setSelectedActivityId(0);
        setDashboard(null);
      }
    } catch (err: any) {
      alert(err.message || 'ไม่สามารถลบกิจกรรมได้');
    }
  };

  const filteredParticipants = (dashboard?.participants || []).filter((p) => {
    const userName = p.user?.name.toLowerCase() || '';
    const studentId = p.user?.student_id?.toLowerCase() || '';
    const q = searchQuery.toLowerCase();
    const matchesSearch = userName.includes(q) || studentId.includes(q) || p.qr_token.includes(q);

    if (!matchesSearch) return false;
    if (statusFilter === 'checked_in') return !!p.checked_in_at;
    if (statusFilter === 'confirmed') return p.status === 'CONFIRMED' && !p.checked_in_at;
    if (statusFilter === 'waiting') return p.status === 'WAITING';
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Banner & Selector */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                แดชบอร์ดสถิติและจัดการผู้เข้าร่วม
              </h1>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold">
                ผู้จัดกิจกรรม
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              ติดตาม Show-up Rate แบบเรียลไทม์ และตรวจสอบรายชื่อนักศึกษาที่ลงทะเบียน
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Activity Dropdown Selector */}
          <div className="relative w-full sm:w-auto max-w-full sm:max-w-xs">
            <select
              value={selectedActivityId}
              onChange={(e) => setSelectedActivityId(parseInt(e.target.value))}
              className="appearance-none w-full pl-4 pr-9 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 truncate"
            >
              {myActivities.length > 0 ? (
                myActivities.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title.length > 32 ? a.title.substring(0, 30) + '...' : a.title} ({a.current_confirmed}/{a.max_participants})
                  </option>
                ))
              ) : (
                <option value="" disabled>ยังไม่มีกิจกรรมที่คุณสร้าง</option>
              )}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* QR Scanner trigger */}
          <button
            onClick={onOpenScanner}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-xs flex items-center gap-1.5 transition-all"
          >
            <QrCode className="w-4 h-4" />
            <span>เปิดเครื่องสแกน QR</span>
          </button>
        </div>
      </div>

      {/* Activity Schedule & Real-Time Auto-Delete Controls */}
      {dashboard && (
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">กำหนดเวลาของกิจกรรม</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                  ระบบลบอัตโนมัติเปิดใช้งาน
                </span>
              </div>
              <div className="text-sm font-bold text-slate-900 mt-0.5">
                เริ่ม: {new Date(dashboard.activity.start_date).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })} น.
                {' '}&bull;{' '}
                สิ้นสุด: {dashboard.activity.end_date ? new Date(dashboard.activity.end_date).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' }) + ' น.' : 'ไม่ระบุ'}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                เมื่อถึงเวลาสิ้นสุดกิจกรรมที่กำหนด ระบบจะลบกิจกรรมนี้ออกจากระบบโดยอัตโนมัติทันที
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto shrink-0">
            {editingEndDate ? (
              <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-indigo-200">
                <input
                  type="datetime-local"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!customEndDate) {
                      alert('กรุณาเลือกวันและเวลาสิ้นสุด');
                      return;
                    }
                    handleUpdateEndDate(new Date(customEndDate).toISOString());
                  }}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  บันทึก
                </button>
                <button
                  type="button"
                  onClick={() => setEditingEndDate(false)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  const currentEnd = dashboard.activity.end_date
                    ? new Date(dashboard.activity.end_date)
                    : new Date();
                  const offset = currentEnd.getTimezoneOffset() * 60000;
                  const localIso = new Date(currentEnd.getTime() - offset).toISOString().slice(0, 16);
                  setCustomEndDate(localIso);
                  setEditingEndDate(true);
                }}
                className="px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>แก้ไขเวลาสิ้นสุด (เลือกเวลาอิสระ)</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleDeleteActivity}
              className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
              title="ลบกิจกรรมนี้ทันที"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>ลบทันที</span>
            </button>
          </div>
        </div>
      )}

      {/* Analytics KPI Metric Cards */}
      {dashboard && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Show-up Rate */}
          <div className="bg-slate-900 text-white p-5 rounded-3xl shadow-xs border border-slate-800 flex flex-col justify-between col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Show-up Rate</span>
              <span className="p-1.5 rounded-xl bg-white/10 text-emerald-400">
                <TrendingUp className="w-4 h-4" />
              </span>
            </div>
            <div className="my-3">
              <div className="text-3xl sm:text-4xl font-black text-white flex items-baseline gap-1">
                <span>{dashboard.show_up_rate}%</span>
                <span className="text-xs text-slate-400 font-normal">
                  ({dashboard.checked_in_count}/{dashboard.confirmed_count})
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1 font-mono">
                สูตร: ผู้เช็คอิน / ผู้ยืนยันที่นั่ง * 100
              </div>
            </div>
            <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${dashboard.show_up_rate}%` }}
              />
            </div>
          </div>

          {/* Card 2: Confirmed Capacity */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">ที่นั่งที่ยืนยัน (Confirmed)</span>
              <span className="p-1.5 rounded-xl bg-slate-100 text-slate-700">
                <Users className="w-4 h-4" />
              </span>
            </div>
            <div className="my-3">
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                {dashboard.confirmed_count} / {dashboard.activity.max_participants}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {dashboard.confirmed_count >= dashboard.activity.max_participants
                  ? 'เต็มจำนวนที่เปิดรับแล้ว'
                  : `เหลืออีก ${dashboard.activity.max_participants - dashboard.confirmed_count} ที่นั่ง`}
              </div>
            </div>
            <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg w-fit">
              ความจุ {Math.round((dashboard.confirmed_count / dashboard.activity.max_participants) * 100)}%
            </span>
          </div>

          {/* Card 3: Checked In Count */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">เช็คอินหน้างานแล้ว</span>
              <span className="p-1.5 rounded-xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
              </span>
            </div>
            <div className="my-3">
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600">
                {dashboard.checked_in_count} <span className="text-xs text-slate-400 font-normal">คน</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                ยังไม่เช็คอิน: {dashboard.confirmed_count - dashboard.checked_in_count} คน
              </div>
            </div>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg w-fit">
              ตรวจสอบผ่าน QR Token แล้ว
            </span>
          </div>

          {/* Card 4: Waiting List */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">ในคิวรอ (Waiting List)</span>
              <span className="p-1.5 rounded-xl bg-amber-50 text-amber-600">
                <Clock className="w-4 h-4" />
              </span>
            </div>
            <div className="my-3">
              <div className="text-2xl sm:text-3xl font-extrabold text-amber-600">
                {dashboard.waiting_count} <span className="text-xs text-slate-400 font-normal">คน</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">เลื่อนสิทธิ์อัตโนมัติเมื่อมีคนยกเลิก</div>
            </div>
            <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg w-fit">
              Auto-Promotion Queue
            </span>
          </div>
        </div>
      )}

      {/* Participant List Section */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-base text-slate-900">
              รายชื่อผู้ลงทะเบียน ({filteredParticipants.length} รายการ)
            </h3>
            <p className="text-xs text-slate-500">
              ค้นหาตามชื่อ รหัสนิสิต หรือกดปุ่มเช็คอินแบบทันที
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาชื่อ, รหัสนิสิต..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 w-44 sm:w-56"
              />
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  statusFilter === 'all' ? 'bg-white shadow-2xs text-slate-900' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ทั้งหมด
              </button>
              <button
                onClick={() => setStatusFilter('checked_in')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  statusFilter === 'checked_in'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                เช็คอินแล้ว
              </button>
              <button
                onClick={() => setStatusFilter('waiting')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  statusFilter === 'waiting'
                    ? 'bg-amber-600 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Waiting
              </button>
            </div>

            {/* Export Summary Button */}
            <button
              onClick={handleCopyReport}
              className="p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1 text-xs font-semibold"
              title="คัดลอกสรุปสถิติ"
            >
              {copiedReport ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copiedReport ? 'คัดลอกแล้ว' : 'คัดลอกสรุป'}</span>
            </button>
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="p-12 text-center text-slate-400">กำลังโหลดข้อมูลผู้เข้าร่วม...</div>
        ) : filteredParticipants.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Users className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-sm">ไม่พบผู้เข้าร่วมที่ตรงกับเงื่อนไขการค้นหา</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3.5 px-4 sm:px-6">ผู้ลงทะเบียน</th>
                  <th className="py-3.5 px-4">คณะ</th>
                  <th className="py-3.5 px-4">Show-up Rate</th>
                  <th className="py-3.5 px-4">สถานะที่นั่ง</th>
                  <th className="py-3.5 px-4">เวลา Check-in</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">ดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredParticipants.map((p) => {
                  const isCheckedIn = !!p.checked_in_at;
                  const isWaiting = p.status === 'WAITING';

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Name & ID */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="font-bold text-slate-900">{p.user?.name}</div>
                        <div className="text-xs text-slate-400 font-mono">
                          {p.user?.student_id || 'ID N/A'} • {p.user?.email}
                        </div>
                      </td>

                      {/* Faculty */}
                      <td className="py-3.5 px-4 text-slate-600 text-xs">
                        {p.user?.faculty || 'มหาวิทยาลัย'}
                      </td>

                      {/* User's overall show-up rate badge */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                            (p.user?.show_up_rate || 100) >= 80
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {p.user?.show_up_rate || 90}%
                        </span>
                      </td>

                      {/* Status badge */}
                      <td className="py-3.5 px-4">
                        {isWaiting ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3" />
                            Waiting List
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            <CheckCircle2 className="w-3 h-3" />
                            CONFIRMED
                          </span>
                        )}
                      </td>

                      {/* Checked in timestamp */}
                      <td className="py-3.5 px-4 text-xs font-mono">
                        {isCheckedIn ? (
                          <span className="text-emerald-600 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {new Date(p.checked_in_at!).toLocaleTimeString('th-TH', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}{' '}
                            น.
                          </span>
                        ) : (
                          <span className="text-slate-400">ยังไม่เช็คอิน</span>
                        )}
                      </td>

                      {/* Quick Check-in action button */}
                      <td className="py-3.5 px-4 sm:px-6 text-right">
                        {isCheckedIn ? (
                          <span className="text-xs text-slate-400 font-medium">เสร็จสิ้นแล้ว</span>
                        ) : isWaiting ? (
                          <span className="text-xs text-amber-500 font-medium">รอคิว</span>
                        ) : (
                          <button
                            onClick={() => handleManualCheckIn(p.id)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition-colors flex items-center gap-1 ml-auto"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Check-in</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
