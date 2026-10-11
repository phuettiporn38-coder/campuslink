import React, { useState, useRef } from 'react';
import {
  User as UserIcon,
  ShieldCheck,
  Mail,
  GraduationCap,
  Award,
  TrendingUp,
  Camera,
  Upload,
  Check,
  X,
  Edit2,
  Trash2,
  Briefcase,
  QrCode,
  Plus,
  Ticket,
  RefreshCw,
  Sparkles,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import type { User, Registration } from '../types';
import { api } from '../services/api';
import { compressImageFile } from '../utils/image';

interface ProfileViewProps {
  currentUser: User;
  onUpdateUser: (updatedUser: User) => void;
  userRegistrations: Registration[];
  onViewQR: (reg: Registration) => void;
  onLogout: () => void;
  onOpenScanner?: () => void;
  onOpenCreate?: () => void;
  onViewTickets?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  currentUser,
  onUpdateUser,
  userRegistrations,
  onViewQR,
  onLogout,
  onOpenScanner,
  onOpenCreate,
  onViewTickets,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(currentUser.name);
  const [faculty, setFaculty] = useState(currentUser.faculty);
  const [studentId, setStudentId] = useState(currentUser.student_id || '');
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isOrganizer = currentUser.role === 'organizer';

  const attendedCount = userRegistrations.filter((r) => r.checked_in_at).length;
  const registeredCount = userRegistrations.filter((r) => r.status === 'CONFIRMED').length;
  const showUpRate =
    registeredCount > 0 ? Math.round((attendedCount / registeredCount) * 100) : currentUser.show_up_rate || 90;

  // Handle local file upload (mobile camera or computer files)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert('ขนาดไฟล์รูปภาพต้องไม่เกิน 15MB');
      return;
    }

    try {
      setLoading(true);
      const compressedDataUrl = await compressImageFile(file, 400, 400, 0.85);
      const updated = await api.updateUser(currentUser.id, { profile_image: compressedDataUrl });
      onUpdateUser(updated);
    } catch (err: any) {
      alert(err.message || 'บันทึกรูปภาพไม่สำเร็จ');
    } finally {
      setLoading(false);
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  const handleRemovePhoto = async () => {
    try {
      setLoading(true);
      const updated = await api.updateUser(currentUser.id, { profile_image: '' });
      onUpdateUser(updated);
    } catch (err: any) {
      alert(err.message || 'ลบรูปภาพไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const updated = await api.updateUser(currentUser.id, {
        name: name.trim(),
        faculty: faculty.trim(),
        student_id: studentId.trim(),
      });
      onUpdateUser(updated);
      setIsEditing(false);
    } catch (err: any) {
      alert(err.message || 'บันทึกข้อมูลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Role Distinction Banner */}
      <div
        className={`p-5 rounded-3xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs ${
          isOrganizer
            ? 'bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 border-indigo-700/50 text-white'
            : 'bg-gradient-to-r from-emerald-900 via-slate-900 to-slate-950 border-emerald-700/50 text-white'
        }`}
      >
        <div className="flex items-center gap-3.5">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-md ${
              isOrganizer ? 'bg-indigo-600' : 'bg-emerald-600'
            }`}
          >
            {isOrganizer ? <Briefcase className="w-6 h-6" /> : <GraduationCap className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md">
                {isOrganizer ? 'บทบาทปัจจุบัน: ผู้จัดกิจกรรม' : 'บทบาทปัจจุบัน: ผู้เข้าร่วมกิจกรรม'}
              </span>
              <span className="text-xs text-white/70 hidden sm:inline">• CampusLink</span>
            </div>
            <h3 className="text-base sm:text-lg font-black mt-0.5">
              {isOrganizer ? 'พอร์ทัลผู้จัดกิจกรรม (Organizer)' : 'พอร์ทัลผู้เข้าร่วมกิจกรรม (Participant)'}
            </h3>
            <p className="text-xs text-white/80 mt-0.5">
              {isOrganizer
                ? 'เข้าถึงแดชบอร์ดสรุปสถิติ, สร้างและจัดการกิจกรรม, สแกน QR Code ตรวจสอบผู้เข้าร่วมหน้างาน'
                : 'ค้นหากิจกรรม, ลงทะเบียนรับตั๋ว E-Pass QR, เช็คประวัติการเข้าร่วม, และสะสมคะแนน Show-up Rate'}
            </p>
          </div>
        </div>

        <div className="text-right hidden sm:block shrink-0">
          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-white/10 text-white/90 border border-white/20">
            {isOrganizer ? 'ORGANIZER' : 'PARTICIPANT'}
          </span>
        </div>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
          {/* Avatar Section: Standard Icon by default, with photo upload */}
          <div className="relative group shrink-0">
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl overflow-hidden border-2 border-slate-200 bg-slate-100 flex items-center justify-center shadow-xs">
              {currentUser.profile_image ? (
                <img
                  src={currentUser.profile_image}
                  alt={currentUser.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <UserIcon className="w-14 h-14 text-slate-400" />
              )}
            </div>

            {/* Upload Button overlay / trigger */}
            <div className="mt-3 flex items-center justify-center gap-1.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors"
                title="อัปโหลดรูปภาพ"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{currentUser.profile_image ? 'เปลี่ยนรูป' : 'ใส่รูปภาพ'}</span>
              </button>

              {currentUser.profile_image && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="p-1.5 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                  title="ลบรูปภาพ ใช้ไอคอนธรรมดา"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>

          {/* User Details */}
          <div className="flex-1 space-y-3">
            {isEditing ? (
              <form onSubmit={handleSaveProfile} className="space-y-3 max-w-md">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    ชื่อ-นามสกุล หรือชื่อฝ่ายงาน
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      {isOrganizer ? 'รหัสบุคลากร / หน่วยงาน' : 'รหัสนิสิต'}
                    </label>
                    <input
                      type="text"
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      คณะ / สังกัด
                    </label>
                    <input
                      type="text"
                      required
                      value={faculty}
                      onChange={(e) => setFaculty(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>บันทึกข้อมูล</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold"
                  >
                    ยกเลิก
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900">{currentUser.name}</h2>
                  {currentUser.university_verified && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      ยืนยันอีเมลมหาวิทยาลัยแล้ว
                    </span>
                  )}
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-1 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition-colors"
                    title="แก้ไขข้อมูลส่วนตัว"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 text-xs sm:text-sm text-slate-600">
                  <span className="flex items-center gap-1 font-mono">
                    <GraduationCap className="w-4 h-4 text-indigo-500" />
                    {isOrganizer ? 'รหัสหน่วยงาน:' : 'รหัสนิสิต:'} {currentUser.student_id || 'ไม่มีข้อมูล'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Mail className="w-4 h-4 text-slate-400" />
                    {currentUser.email}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-600 font-medium">{currentUser.faculty}</p>

                {/* Role Specific Actions */}
                <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  {isOrganizer ? (
                    <>
                      {onOpenScanner && (
                        <button
                          type="button"
                          onClick={onOpenScanner}
                          className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>เปิดสแกน QR Check-in</span>
                        </button>
                      )}
                      {onOpenCreate && (
                        <button
                          type="button"
                          onClick={onOpenCreate}
                          className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>สร้างกิจกรรมใหม่</span>
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      {onViewTickets && (
                        <button
                          type="button"
                          onClick={onViewTickets}
                          className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all"
                        >
                          <Ticket className="w-3.5 h-3.5" />
                          <span>ดูตั๋ว E-Pass ของฉัน ({userRegistrations.length})</span>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Participant Stats: Show-up Rate Breakdown */}
      {!isOrganizer ? (
        <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <Award className="w-4 h-4 text-emerald-400" />
                <span>สถิติสำหรับผู้เข้าร่วมกิจกรรม (Participant Metrics)</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-white mt-1">
                คะแนน Show-up Rate: {showUpRate}%
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-lg leading-relaxed">
                คำนวณจากสูตร: ผู้เช็คอินจริง หารด้วย ผู้ลงทะเบียนยืนยันสิทธิ์ คูณด้วย 100
                การมีอัตรา Show-up Rate สูงจะช่วยรักษาความน่าเชื่อถือและได้รับสิทธิยืนยันที่นั่งเป็นลำดับแรก
              </p>
            </div>

            {/* Counts */}
            <div className="flex items-center gap-6 p-4 rounded-2xl bg-white/5 border border-white/10 shrink-0">
              <div className="text-center">
                <div className="text-3xl font-black text-emerald-400">{attendedCount}</div>
                <div className="text-[11px] text-slate-300">เช็คอินแล้ว</div>
              </div>
              <div className="text-2xl font-light text-white/30">/</div>
              <div className="text-center">
                <div className="text-3xl font-black text-white">{registeredCount}</div>
                <div className="text-[11px] text-slate-300">กิจกรรมที่จอง</div>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-6">
            <div className="w-full bg-white/10 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${showUpRate}%` }}
              />
            </div>
          </div>
        </div>
      ) : (
        /* Organizer Dashboard Summary */
        <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
                <Briefcase className="w-4 h-4 text-indigo-400" />
                <span>เครื่องมือสำหรับผู้จัดกิจกรรม (Organizer Hub)</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-white mt-1">
                ศูนย์จัดการกิจกรรมและ Check-in
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-lg leading-relaxed">
                ในฐานะผู้จัดกิจกรรม คุณสามารถตรวจสอบรายชื่อผู้ลงทะเบียนแบบเรียลไทม์, คัดกรอง Waiting List, และใช้งานเครื่องสแกน QR Code หน้างาน
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {onOpenScanner && (
                <button
                  type="button"
                  onClick={onOpenScanner}
                  className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-md"
                >
                  <QrCode className="w-4 h-4" />
                  <span>เริ่มสแกน QR หน้างาน</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Account Actions Section */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-slate-900">การจัดการบัญชี CampusLink</h4>
          <p className="text-xs text-slate-500 mt-0.5">
            เข้าสู่ระบบด้วยอีเมลมหาวิทยาลัย (@up.ac.th) หรือรหัสนิสิต • บทบาท:{' '}
            <span className="font-semibold text-slate-700">
              {isOrganizer ? 'ผู้จัดกิจกรรม (Organizer)' : 'ผู้เข้าร่วมกิจกรรม (Participant)'}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={onLogout}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors text-center flex items-center justify-center gap-2 cursor-pointer border border-rose-200"
          >
            <LogOut className="w-4 h-4" />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </div>
    </div>
  );
};
