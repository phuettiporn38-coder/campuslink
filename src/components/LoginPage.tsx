import React, { useState, useEffect } from 'react';
import {
  Compass,
  Mail,
  Lock,
  User,
  GraduationCap,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  LogIn,
  UserPlus,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Users,
  Briefcase,
  QrCode,
  Ticket,
  BarChart3,
  Check,
} from 'lucide-react';
import { api } from '../services/api';
import type { User as UserType } from '../types';

interface LoginPageProps {
  onLoginSuccess: (user: UserType) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  // Portal separation: 'student' = ผู้เข้าร่วมกิจกรรม, 'organizer' = ผู้จัดกิจกรรม
  const [selectedPortal, setSelectedPortal] = useState<'student' | 'organizer'>('student');
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Login form state
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regFaculty, setRegFaculty] = useState('คณะเทคโนโลยีสารสนเทศและการสื่อสาร (ICT)');
  const [regStudentId, setRegStudentId] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!identifier.trim() || !password) {
      setError(
        selectedPortal === 'organizer'
          ? 'กรุณากรอกอีเมลผู้จัด หรือรหัสบุคลากร และรหัสผ่าน'
          : 'กรุณากรอกรหัสนิสิต หรืออีเมลมหาวิทยาลัย และรหัสผ่าน'
      );
      return;
    }

    setLoading(true);
    try {
      const res = await api.login(identifier.trim(), password);
      // Validate that role matches selected portal
      if (selectedPortal === 'organizer' && res.user.role !== 'organizer') {
        setError('บัญชีนี้เป็นบัญชีผู้เข้าร่วมกิจกรรม ไม่สามารถเข้าสู่ระบบในพอร์ทัลผู้จัดกิจกรรมได้ กรุณาเลือกพอร์ทัล "ผู้เข้าร่วมกิจกรรม"');
        setLoading(false);
        return;
      }
      if (selectedPortal === 'student' && res.user.role === 'organizer') {
        setError('บัญชีนี้เป็นบัญชีผู้จัดกิจกรรม กรุณาเลือกพอร์ทัล "ผู้จัดกิจกรรม" เพื่อเข้าใช้งานระบบจัดการ');
        setLoading(false);
        return;
      }
      onLoginSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!regName.trim() || !regEmail.trim() || !regPassword || !regFaculty) {
      setError('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
      return;
    }

    if (regPassword.length < 6) {
      setError('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }

    setLoading(true);
    try {
      const res = await api.register({
        name: regName.trim(),
        email: regEmail.trim(),
        password: regPassword,
        faculty: regFaculty,
        student_id: regStudentId.trim() || undefined,
        role: selectedPortal,
      });
      onLoginSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'ลงทะเบียนไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  const isStudentPortal = selectedPortal === 'student';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 flex flex-col justify-center items-center px-4 py-8 sm:py-12 relative overflow-hidden">
      {/* Decorative ambient background blur lights */}
      <div
        className={`absolute top-1/4 -left-20 w-96 h-96 rounded-full blur-3xl pointer-events-none transition-colors duration-700 ${
          isStudentPortal ? 'bg-emerald-500/10' : 'bg-indigo-500/15'
        }`}
      />
      <div
        className={`absolute bottom-1/4 -right-20 w-96 h-96 rounded-full blur-3xl pointer-events-none transition-colors duration-700 ${
          isStudentPortal ? 'bg-teal-500/10' : 'bg-purple-500/15'
        }`}
      />

      {/* Main Container */}
      <div className="w-full max-w-lg sm:max-w-xl z-10 space-y-5">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 mb-1 ring-4 ring-white/10">
            <Compass className="w-7 h-7" />
          </div>
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              CampusLink
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              UP
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-md mx-auto">
            แพลตฟอร์มกิจกรรมมหาวิทยาลัย แยกพอร์ทัลเฉพาะสำหรับผู้เข้าร่วมและผู้จัด
          </p>
        </div>

        {/* PRIMARY ROLE PORTAL SELECTOR: แยกตั้งแต่หน้า Login */}
        <div className="bg-slate-800/80 p-1.5 rounded-3xl border border-slate-700/80 shadow-xl backdrop-blur-md">
          <div className="text-[11px] font-bold text-slate-400 text-center uppercase tracking-wider mb-1.5 pt-1">
            เลือกพอร์ทัลเข้าสู่ระบบตามบทบาทของคุณ
          </div>
          <div className="grid grid-cols-2 gap-2">
            {/* Tab 1: ผู้เข้าร่วมกิจกรรม (Student) */}
            <button
              type="button"
              onClick={() => {
                setSelectedPortal('student');
                setError('');
                setIdentifier('');
                setPassword('');
              }}
              className={`p-3.5 sm:p-4 rounded-2xl text-left transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden ${
                isStudentPortal
                  ? 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-lg shadow-emerald-900/40 ring-2 ring-white/20'
                  : 'bg-slate-900/50 hover:bg-slate-900 text-slate-300 border border-slate-700/50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    isStudentPortal ? 'bg-white/20 text-white' : 'bg-slate-800 text-emerald-400'
                  }`}
                >
                  <GraduationCap className="w-5 h-5" />
                </div>
                {isStudentPortal && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-emerald-800">
                    กำลังใช้งาน
                  </span>
                )}
              </div>
              <div>
                <div className="font-black text-sm sm:text-base leading-snug">
                  ผู้เข้าร่วมกิจกรรม
                </div>
                <div className={`text-[11px] mt-0.5 ${isStudentPortal ? 'text-emerald-100' : 'text-slate-400'}`}>
                  นิสิต / นักศึกษาทั่วไป
                </div>
              </div>
            </button>

            {/* Tab 2: ผู้จัดกิจกรรม (Organizer) */}
            <button
              type="button"
              onClick={() => {
                setSelectedPortal('organizer');
                setError('');
                setIdentifier('');
                setPassword('');
              }}
              className={`p-3.5 sm:p-4 rounded-2xl text-left transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden ${
                !isStudentPortal
                  ? 'bg-gradient-to-br from-indigo-600 to-violet-700 text-white shadow-lg shadow-indigo-900/40 ring-2 ring-white/20'
                  : 'bg-slate-900/50 hover:bg-slate-900 text-slate-300 border border-slate-700/50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    !isStudentPortal ? 'bg-white/20 text-white' : 'bg-slate-800 text-indigo-400'
                  }`}
                >
                  <Briefcase className="w-5 h-5" />
                </div>
                {!isStudentPortal && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-indigo-800">
                    กำลังใช้งาน
                  </span>
                )}
              </div>
              <div>
                <div className="font-black text-sm sm:text-base leading-snug">
                  ผู้จัดกิจกรรม
                </div>
                <div className={`text-[11px] mt-0.5 ${!isStudentPortal ? 'text-indigo-100' : 'text-slate-400'}`}>
                  อาจารย์ / สโมสร / ชมรม
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Portal Information Banner */}
        <div
          className={`px-4 py-2.5 rounded-2xl border text-xs flex items-center justify-between transition-all ${
            isStudentPortal
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
              : 'bg-indigo-950/40 border-indigo-500/30 text-indigo-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {isStudentPortal ? (
              <Ticket className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <QrCode className="w-4 h-4 text-indigo-400 shrink-0" />
            )}
            <span className="font-medium">
              {isStudentPortal
                ? 'เข้าถึง: สำรวจกิจกรรม • รับตั๋ว E-Pass QR • สถิติ Show-up Rate'
                : 'เข้าถึง: แดชบอร์ดสรุปสถิติ • สร้างกิจกรรม • สแกน QR Check-in'}
            </span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 shrink-0">
            {isStudentPortal ? 'PARTICIPANT' : 'ORGANIZER'}
          </span>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
          {/* Sub Mode Tabs: Login vs Register */}
          <div className="flex border-b border-slate-100 bg-slate-50/70 p-1.5">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
              }}
              className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-2xl transition-all flex items-center justify-center gap-1.5 ${
                mode === 'login'
                  ? isStudentPortal
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>
                {isStudentPortal ? 'เข้าสู่ระบบนิสิต' : 'เข้าสู่ระบบผู้จัด'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError('');
              }}
              className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-2xl transition-all flex items-center justify-center gap-1.5 ${
                mode === 'register'
                  ? isStudentPortal
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>
                สมัครบัญชีใหม่
              </span>
            </button>
          </div>

          <div className="p-6 sm:p-8 space-y-5">
            {/* Error Banner */}
            {error && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2.5 animate-fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            {mode === 'login' ? (
              /* LOGIN FORM */
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    {isStudentPortal
                      ? 'รหัสนิสิต หรือ อีเมลมหาวิทยาลัย'
                      : 'อีเมลผู้จัด หรือ รหัสบุคลากร/หน่วยงาน'}
                  </label>
                  <div className="relative">
                    {isStudentPortal ? (
                      <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    ) : (
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    )}
                    <input
                      type="text"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder={
                        isStudentPortal
                          ? 'เช่น 66020101 หรือ 67026089@up.ac.th'
                          : 'เช่น somchai.n@up.ac.th หรือ STAFF-009'
                      }
                      className={`w-full pl-10 pr-3.5 py-2.5 rounded-2xl border border-slate-200 text-sm focus:outline-none transition-all font-medium ${
                        isStudentPortal ? 'focus:ring-2 focus:ring-emerald-600' : 'focus:ring-2 focus:ring-indigo-600'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    รหัสผ่าน
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="กรอกรหัสผ่านของคุณ"
                      className={`w-full pl-10 pr-10 py-2.5 rounded-2xl border border-slate-200 text-sm focus:outline-none transition-all font-medium ${
                        isStudentPortal ? 'focus:ring-2 focus:ring-emerald-600' : 'focus:ring-2 focus:ring-indigo-600'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-3 px-4 rounded-2xl text-white text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                    isStudentPortal
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20 active:scale-98'
                      : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20 active:scale-98'
                  }`}
                >
                  {loading ? (
                    <span>กำลังเข้าสู่ระบบ...</span>
                  ) : (
                    <>
                      <span>
                        เข้าสู่ระบบในฐานะ {isStudentPortal ? 'ผู้เข้าร่วมกิจกรรม' : 'ผู้จัดกิจกรรม'}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* REGISTER FORM TAILORED BY SELECTED PORTAL */
              <form onSubmit={handleRegister} className="space-y-3.5">
                <div
                  className={`p-3 rounded-2xl border text-xs flex items-center gap-2 ${
                    isStudentPortal
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-indigo-50 border-indigo-200 text-indigo-900'
                  }`}
                >
                  {isStudentPortal ? (
                    <GraduationCap className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <Briefcase className="w-4 h-4 text-indigo-600 shrink-0" />
                  )}
                  <span>
                    กำลังสมัครบัญชีใหม่ในฐานะ: <strong>{isStudentPortal ? 'ผู้เข้าร่วมกิจกรรม (นิสิต/นักศึกษา)' : 'ผู้จัดกิจกรรม (อาจารย์/สโมสร/ชมรม)'}</strong>
                  </span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {isStudentPortal ? 'ชื่อ-นามสกุล' : 'ชื่อผู้จัด / ชมรม / สโมสร / ฝ่ายงาน'}{' '}
                    <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder={
                        isStudentPortal ? 'เช่น นายพีรพัฒน์ วงศ์สว่าง' : 'เช่น สโมสรนักศึกษาคณะ ICT หรือ อ.สมศรี'
                      }
                      className="w-full pl-10 pr-3.5 py-2 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    อีเมลมหาวิทยาลัย (@up.ac.th) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="เช่น student@up.ac.th หรือ organizer@up.ac.th"
                      className="w-full pl-10 pr-3.5 py-2 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      {isStudentPortal ? 'รหัสนิสิต' : 'รหัสบุคลากร / หน่วยงาน'}
                    </label>
                    <input
                      type="text"
                      value={regStudentId}
                      onChange={(e) => setRegStudentId(e.target.value)}
                      placeholder={isStudentPortal ? 'เช่น 66020101' : 'STAFF-01 หรือ CLUB-01'}
                      className="w-full px-3.5 py-2 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      คณะสังกัด <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={regFaculty}
                      onChange={(e) => setRegFaculty(e.target.value)}
                      className="w-full px-3 py-2 rounded-2xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white"
                    >
                      <option value="คณะเทคโนโลยีสารสนเทศและการสื่อสาร (ICT)">คณะ ICT</option>
                      <option value="คณะวิศวกรรมศาสตร์">คณะวิศวกรรมศาสตร์</option>
                      <option value="คณะบริหารธุรกิจและนิเทศศาสตร์">คณะบริหารธุรกิจฯ</option>
                      <option value="คณะวิทยาศาสตร์">คณะวิทยาศาสตร์</option>
                      <option value="คณะแพทยศาสตร์และวิทยาศาสตร์สุขภาพ">คณะแพทยศาสตร์ฯ</option>
                      <option value="คณะสถาปัตยกรรมศาสตร์และศิลปกรรมศาสตร์">คณะสถาปัตยกรรมฯ</option>
                      <option value="คณะมนุษยศาสตร์และสังคมศาสตร์">คณะมนุษยศาสตร์ฯ</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    กำหนดรหัสผ่าน (อย่างน้อย 6 ตัวอักษร) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="กำหนดรหัสผ่าน"
                      className="w-full pl-10 pr-3.5 py-2 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-3 px-4 rounded-2xl text-white text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2 ${
                    isStudentPortal
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20 active:scale-98'
                      : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20 active:scale-98'
                  }`}
                >
                  {loading ? (
                    <span>กำลังสร้างบัญชี...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        สมัครบัญชีใหม่ ({isStudentPortal ? 'ผู้เข้าร่วมกิจกรรม' : 'ผู้จัดกิจกรรม'})
                      </span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-xs text-slate-400 space-y-1">
          <p>CampusLink • ระบบกิจกรรมมหาวิทยาลัย</p>
          <p className="text-[11px] text-slate-500">
            {isStudentPortal
              ? 'พอร์ทัลนิสิต: สมัครกิจกรรม • รับตั๋ว E-Pass QR Code • เช็ค Show-up Rate'
              : 'พอร์ทัลผู้จัด: แดชบอร์ดสรุปสถิติ • สร้างกิจกรรม • สแกน QR Check-in'}
          </p>
        </div>
      </div>
    </div>
  );
};
