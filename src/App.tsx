import React, { useState, useEffect } from 'react';
import {
  Compass,
  Ticket,
  BarChart3,
  Sparkles,
  User as UserIcon,
  Plus,
  QrCode,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  Layers,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Menu,
  X,
  Bell,
  LogOut,
  Briefcase,
  GraduationCap,
  RefreshCw,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api, authStorage } from './services/api';
import type { Activity, Registration, User as UserType, AppNotification } from './types';

// Components
import { LoginPage } from './components/LoginPage';
import { ActivityCard } from './components/ActivityCard';
import { ActivityDetailModal } from './components/ActivityDetailModal';
import { QRCodeModal } from './components/QRCodeModal';
import { QRScannerModal } from './components/QRScannerModal';
import { CreateActivityModal } from './components/CreateActivityModal';
import { MyTicketsView } from './components/MyTicketsView';
import { DashboardView } from './components/DashboardView';
import { AIAssistantView } from './components/AIAssistantView';
import { ProfileView } from './components/ProfileView';
import { NotificationModal } from './components/NotificationModal';
import { AuthModal } from './components/AuthModal';

type TabType = 'explore' | 'tickets' | 'dashboard' | 'ai' | 'profile';

export default function App() {
  const [currentTab, setCurrentTab] = useState<TabType>(() => {
    try {
      const saved = localStorage.getItem('campus_activity_current_tab');
      return (saved as TabType) || 'explore';
    } catch {
      return 'explore';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('campus_activity_current_tab', currentTab);
    } catch {}
  }, [currentTab]);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [userRegistrations, setUserRegistrations] = useState<Registration[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state for Explore tab
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [seatAvailabilityFilter, setSeatAvailabilityFilter] = useState<'all' | 'available' | 'waiting'>('all');

  // Modals state
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [activeTicketModal, setActiveTicketModal] = useState<Registration | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [aiQuestionPrompt, setAiQuestionPrompt] = useState<string>('');

  // Toast notification (Clean, no emojis)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Refresh activities, registrations, and notifications for active user without logging out
  const refreshData = async () => {
    try {
      const acts = await api.getActivities().catch(() => []);
      setActivities(acts);

      if (currentUser) {
        const [regsResult, notifsResult] = await Promise.allSettled([
          api.getUserRegistrations(currentUser.id),
          api.getNotifications(currentUser.id),
        ]);
        if (regsResult.status === 'fulfilled') setUserRegistrations(regsResult.value);
        if (notifsResult.status === 'fulfilled') setNotifications(notifsResult.value);
      }
    } catch (err) {
      console.warn('Failed to refresh data:', err);
    }
  };

  // Initial page entry: load activities and check active session
  useEffect(() => {
    let isMounted = true;
    Promise.all([
      api.getActivities(),
      api.getMe().catch(() => null),
    ])
      .then(([acts, user]) => {
        if (!isMounted) return;
        setActivities(acts);
        if (user) {
          setCurrentUser(user);
        } else {
          setCurrentUser(null);
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setActivities([]);
        setCurrentUser(null);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Periodic check: automatically refresh and clean up activities as soon as their end time arrives
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const anyExpired = activities.some(
        (a) => a.end_date && new Date(a.end_date).getTime() <= now
      );
      if (anyExpired) {
        refreshData();
      }
    }, 10000);
    return () => clearInterval(timer);
  }, [activities]);

  // Reload user registrations and notifications when user changes
  useEffect(() => {
    if (currentUser) {
      api.getUserRegistrations(currentUser.id)
        .then((regs) => setUserRegistrations(regs))
        .catch((err) => console.warn('Could not load registrations:', err));
      api.getNotifications(currentUser.id)
        .then((notifs) => setNotifications(notifs))
        .catch((err) => console.warn('Could not load notifications:', err));
    } else {
      setUserRegistrations([]);
      setNotifications([]);
    }
  }, [currentUser?.id]);

  // Handle Authentication Success
  const handleAuthSuccess = async (user: UserType) => {
    setCurrentUser(user);
    if (user.role === 'organizer') {
      setCurrentTab('dashboard');
    } else {
      setCurrentTab('explore');
    }
    showToast(`ยินดีต้อนรับ ${user.name} (${user.role === 'organizer' ? 'ผู้จัดกิจกรรม' : 'ผู้เข้าร่วมกิจกรรม'})`, 'success');
    try {
      const [regsResult, notifsResult] = await Promise.allSettled([
        api.getUserRegistrations(user.id),
        api.getNotifications(user.id),
      ]);
      setUserRegistrations(regsResult.status === 'fulfilled' ? regsResult.value : []);
      setNotifications(notifsResult.status === 'fulfilled' ? notifsResult.value : []);
    } catch (err) {
      console.warn('Failed to load user data on login:', err);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    await api.logout();
    setCurrentUser(null);
    setUserRegistrations([]);
    setNotifications([]);
    showToast('ออกจากระบบเรียบร้อยแล้ว', 'info');
  };

  // Handle RSVP
  const handleRSVP = async (activity: Activity) => {
    if (!currentUser) {
      setAuthModalMode('login');
      setIsAuthModalOpen(true);
      showToast('กรุณาเข้าสู่ระบบก่อนทำการลงทะเบียนกิจกรรม', 'info');
      return;
    }
    if (currentUser.role === 'organizer') {
      showToast('บัญชีผู้จัดกิจกรรมไม่สามารถลงทะเบียนเข้าร่วมกิจกรรมได้', 'error');
      return;
    }

    try {
      const res = await api.registerActivity(activity.id, currentUser.id);

      if (res.status === 'CONFIRMED') {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 },
        });
        showToast(`ลงทะเบียนสำเร็จ คุณได้รับการยืนยันที่นั่งใน "${activity.title}"`, 'success');
      } else {
        showToast(`ลงทะเบียนสำเร็จ คุณอยู่ใน Waiting List ลำดับถัดไป`, 'success');
      }

      await refreshData();

      setActiveTicketModal(res.registration);
      if (selectedActivity?.id === activity.id) {
        setSelectedActivity(null);
      }
    } catch (err: any) {
      showToast(err.message || 'ไม่สามารถลงทะเบียนได้', 'error');
    }
  };

  // Handle Cancel RSVP (สละสิทธิ์) without bouncing out
  const handleCancelRSVP = async (activityId: number) => {
    if (!currentUser) return;
    try {
      const res = await api.cancelRegistration(activityId, currentUser.id);
      showToast(res.message || 'สละสิทธิ์และยกเลิกการลงทะเบียนเรียบร้อยแล้ว', 'info');
      await refreshData();
      // Keep modal open so the user sees their updated status in-place without bouncing out (ไม่เด้งออก)
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการยกเลิก', 'error');
    }
  };

  // Open AI with question
  const handleAskAI = (activity: Activity) => {
    setAiQuestionPrompt(`ขอข้อมูลเกี่ยวกับกิจกรรม "${activity.title}" ต้องเตรียมอะไรบ้างและจัดที่ไหน`);
    setSelectedActivity(null);
    setCurrentTab('ai');
  };

  // Quick check-in test from QR modal
  const handleQuickCheckIn = async (token: string) => {
    try {
      const res = await api.checkIn({ qr_token: token });
      confetti({
        particleCount: 90,
        spread: 80,
        origin: { y: 0.5 },
      });
      showToast(`Check-in หน้างานสำเร็จ ผู้เข้าร่วม: ${res.user?.name}`, 'success');
      await refreshData();
      if (activeTicketModal) {
        setActiveTicketModal((prev) => (prev ? { ...prev, checked_in_at: new Date().toISOString() } : null));
      }
    } catch (err: any) {
      showToast(err.message || 'Check-in ล้มเหลว', 'error');
    }
  };

  // Mark single notification read
  const handleMarkNotificationRead = async (id: string) => {
    await api.markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  // Mark all notifications read
  const handleMarkAllNotificationsRead = async () => {
    if (!currentUser) return;
    await api.markAllNotificationsRead(currentUser.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  // Filtered activities (automatically filters out activities that have passed their end time)
  const filteredActivities = activities.filter((act) => {
    // If activity reached its scheduled expiration/end time, exclude it immediately
    if (act.end_date) {
      const endTime = new Date(act.end_date).getTime();
      if (!isNaN(endTime) && endTime <= Date.now()) {
        return false;
      }
    }

    const q = searchQuery.toLowerCase();
    const matchSearch =
      act.title.toLowerCase().includes(q) ||
      act.description.toLowerCase().includes(q) ||
      act.location.toLowerCase().includes(q) ||
      act.tags?.some((t) => t.toLowerCase().includes(q));

    if (!matchSearch) return false;

    if (selectedCategory !== 'All' && act.category !== selectedCategory) {
      return false;
    }

    if (seatAvailabilityFilter === 'available' && act.is_full) return false;
    if (seatAvailabilityFilter === 'waiting' && !act.is_full) return false;

    return true;
  });

  const categories: { label: string; value: string }[] = [
    { label: 'ทั้งหมด', value: 'All' },
    { label: 'กีฬาและสุขภาพ', value: 'Sports & Fitness' },
    { label: 'เทคโนโลยีและวิชาการ', value: 'Technology & Academic' },
    { label: 'ศิลปวัฒนธรรม', value: 'Arts & Culture' },
    { label: 'จิตอาสาและสังคม', value: 'Volunteer & Social' },
    { label: 'พัฒนาทักษะและอาชีพ', value: 'Career & Workshop' },
  ];

  const unreadNotificationCount = notifications.filter((n) => !n.read).length;

  if (loading && activities.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto animate-pulse">
            <Compass className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-slate-300">กำลังเชื่อมต่อ CampusLink...</p>
        </div>
      </div>
    );
  }

  // Requirement: ตอนเข้าหน้าเว็ปต้องเป็นหน้า login ก่อนเสมอ
  if (!currentUser) {
    return (
      <>
        {toast && (
          <div
            className={`fixed top-4 inset-x-4 max-w-md mx-auto z-50 p-4 rounded-2xl shadow-xl border text-sm font-medium flex items-center gap-3 animate-fade-in ${
              toast.type === 'success'
                ? 'bg-emerald-600 text-white border-emerald-700'
                : toast.type === 'error'
                ? 'bg-rose-600 text-white border-rose-700'
                : 'bg-slate-900 text-white border-slate-800'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 shrink-0" />}
            {toast.type === 'info' && <Layers className="w-5 h-5 shrink-0 text-indigo-300" />}
            <span className="flex-1 leading-snug">{toast.message}</span>
          </div>
        )}
        <LoginPage onLoginSuccess={handleAuthSuccess} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans pb-24 md:pb-8 w-full max-w-full overflow-x-hidden">
      {/* Toast Notification without emojis */}
      {toast && (
        <div
          className={`fixed top-4 inset-x-4 max-w-md mx-auto z-50 p-4 rounded-2xl shadow-xl border text-sm font-medium flex items-center gap-3 animate-fade-in ${
            toast.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-700'
              : toast.type === 'error'
              ? 'bg-rose-600 text-white border-rose-700'
              : 'bg-slate-900 text-white border-slate-800'
          }`}
        >
          {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 shrink-0" />}
          {toast.type === 'error' && <AlertCircle className="w-5 h-5 shrink-0" />}
          {toast.type === 'info' && <Layers className="w-5 h-5 shrink-0 text-indigo-300" />}
          <span className="flex-1 leading-snug">{toast.message}</span>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs w-full">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-3 w-full">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs shrink-0">
              <Compass className="w-5 h-5 text-white" />
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-black text-base sm:text-lg tracking-tight text-slate-900 whitespace-nowrap">
                CampusLink
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 whitespace-nowrap">
                {currentUser?.role === 'organizer' ? 'Organizer' : 'Student'}
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links tailored by Role */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/60 text-xs font-semibold text-slate-600 shrink-0">
            {currentUser?.role === 'organizer' ? (
              <>
                <button
                  type="button"
                  onClick={() => setCurrentTab('dashboard')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    currentTab === 'dashboard'
                      ? 'bg-white text-indigo-600 shadow-2xs font-bold'
                      : 'hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>แดชบอร์ด</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsScannerOpen(true)}
                  className="px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 hover:text-indigo-700 hover:bg-slate-200/60 text-indigo-600 font-bold whitespace-nowrap cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5 shrink-0" />
                  <span>สแกน QR</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentTab('explore')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    currentTab === 'explore'
                      ? 'bg-white text-indigo-600 shadow-2xs font-bold'
                      : 'hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5 shrink-0" />
                  <span>กิจกรรม</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentTab('ai')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    currentTab === 'ai'
                      ? 'bg-white text-indigo-600 shadow-2xs font-bold'
                      : 'hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span>AI ผู้ช่วย</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setCurrentTab('explore')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    currentTab === 'explore'
                      ? 'bg-white text-indigo-600 shadow-2xs font-bold'
                      : 'hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5 shrink-0" />
                  <span>สำรวจกิจกรรม</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!currentUser) {
                      setAuthModalMode('login');
                      setIsAuthModalOpen(true);
                      showToast('กรุณาเข้าสู่ระบบเพื่อดูตั๋วของคุณ', 'info');
                    } else {
                      setCurrentTab('tickets');
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 relative whitespace-nowrap cursor-pointer ${
                    currentTab === 'tickets'
                      ? 'bg-white text-indigo-600 shadow-2xs font-bold'
                      : 'hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <Ticket className="w-3.5 h-3.5 shrink-0" />
                  <span>ตั๋วของฉัน</span>
                  {userRegistrations.length > 0 && (
                    <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-mono font-bold">
                      {userRegistrations.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentTab('ai')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    currentTab === 'ai'
                      ? 'bg-white text-indigo-600 shadow-2xs font-bold'
                      : 'hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span>AI ผู้ช่วย</span>
                </button>
              </>
            )}
          </nav>

          {/* Right Header Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {currentUser ? (
              <>
                {/* Notification Bell Button */}
                <button
                  type="button"
                  onClick={() => setIsNotificationOpen(true)}
                  className="relative p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200/80 text-slate-700 transition-colors shrink-0 cursor-pointer"
                  title="การแจ้งเตือน"
                >
                  <Bell className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                  {unreadNotificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center font-mono shadow-xs">
                      {unreadNotificationCount}
                    </span>
                  )}
                </button>

                {/* Organizer Actions (only visible for organizers) */}
                {currentUser.role === 'organizer' && (
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(true)}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden sm:inline">สร้างกิจกรรม</span>
                  </button>
                )}

                {/* User Profile Pill */}
                <button
                  type="button"
                  onClick={() => setCurrentTab('profile')}
                  className="flex items-center gap-1.5 p-1 sm:px-2 sm:py-1 rounded-xl bg-white hover:bg-slate-100 border border-slate-200/80 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  title={`โปรไฟล์: ${currentUser.name}`}
                >
                  <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                    {currentUser.profile_image ? (
                      <img
                        src={currentUser.profile_image}
                        alt={currentUser.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <UserIcon className="w-4 h-4 text-slate-600" />
                    )}
                  </div>
                  <span className="hidden xl:inline text-xs font-bold text-slate-700 max-w-[90px] truncate">
                    {currentUser.name}
                  </span>
                </button>

                {/* Header Logout Button */}
                <button
                  type="button"
                  onClick={handleLogout}
                  title="ออกจากระบบ"
                  className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-rose-50 border border-slate-200/80 text-slate-600 hover:text-rose-600 transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer shadow-2xs whitespace-nowrap shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden lg:inline">ออกจากระบบ</span>
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setAuthModalMode('login');
                    setIsAuthModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  เข้าสู่ระบบ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthModalMode('register');
                    setIsAuthModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors shadow-xs whitespace-nowrap shrink-0 cursor-pointer"
                >
                  สมัครบัญชีใหม่
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        {/* TAB 1: EXPLORE ACTIVITIES */}
        {currentTab === 'explore' && (
          <div className="space-y-6 sm:space-y-8 animate-fade-in">
            {/* Hero Banner without emojis */}
            <div className="relative rounded-3xl bg-slate-900 text-white p-6 sm:p-10 overflow-hidden shadow-xs border border-slate-800">
              <div className="relative z-10 max-w-2xl space-y-3">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-slate-200 border border-white/10">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  CampusLink • เชื่อมต่อผู้เข้าร่วมกิจกรรมและผู้จัดกิจกรรม
                </div>
                <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
                  ค้นหากิจกรรมมหาวิทยาลัย <br className="hidden sm:inline" />
                  ลงทะเบียนรับที่นั่ง และยืนยันผ่าน QR Check-in
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  จัดการโควตาที่นั่งอัตโนมัติ รองรับ Waiting List เมื่อกิจกรรมเต็ม และสะสมคะแนน Show-up Rate เพื่อรักษาความน่าเชื่อถือ
                </p>

                {/* Quick Actions */}
                <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
                  {currentUser?.role === 'organizer' ? (
                    <>
                      <button
                        onClick={() => setCurrentTab('dashboard')}
                        className="px-3.5 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-xs flex items-center gap-1.5 transition-all"
                      >
                        <BarChart3 className="w-4 h-4" />
                        <span>ไปที่แดชบอร์ดผู้จัด</span>
                      </button>
                      <button
                        onClick={() => setIsScannerOpen(true)}
                        className="px-3.5 py-2 rounded-xl bg-white text-slate-900 font-bold hover:bg-slate-100 shadow-xs flex items-center gap-1.5 transition-all"
                      >
                        <QrCode className="w-4 h-4 text-indigo-600" />
                        <span>เปิดเครื่องสแกน QR</span>
                      </button>
                      <button
                        onClick={() => setIsCreateOpen(true)}
                        className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold border border-white/20 transition-all flex items-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        <span>+ สร้างกิจกรรม</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setAiQuestionPrompt('ช่วยแนะนำกิจกรรมที่เปิดรับสมัครตอนนี้ และมีที่นั่งว่าง');
                          setCurrentTab('ai');
                        }}
                        className="px-3.5 py-2 rounded-xl bg-white text-slate-900 font-bold hover:bg-slate-100 shadow-xs flex items-center gap-1.5 transition-all"
                      >
                        <Sparkles className="w-4 h-4 text-indigo-600" />
                        <span>สอบถาม AI แนะนำกิจกรรม</span>
                      </button>
                      <button
                        onClick={() => setCurrentTab('tickets')}
                        className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold border border-white/20 transition-all flex items-center gap-1.5"
                      >
                        <Ticket className="w-4 h-4" />
                        <span>ตั๋วของฉัน ({userRegistrations.length})</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Search & Category Filter Section */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="ค้นหาชื่อกิจกรรม, สถานที่, ผู้จัด หรือแท็ก..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 bg-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Seat Status Filter Pills */}
                <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-slate-200/80 shadow-2xs text-xs font-semibold text-slate-600 self-start sm:self-auto">
                  <button
                    onClick={() => setSeatAvailabilityFilter('all')}
                    className={`px-3 py-2 rounded-xl transition-colors ${
                      seatAvailabilityFilter === 'all'
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'hover:text-slate-900'
                    }`}
                  >
                    ที่นั่งทั้งหมด
                  </button>
                  <button
                    onClick={() => setSeatAvailabilityFilter('available')}
                    className={`px-3 py-2 rounded-xl transition-colors ${
                      seatAvailabilityFilter === 'available'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'hover:text-slate-900'
                    }`}
                  >
                    ว่างเท่านั้น
                  </button>
                  <button
                    onClick={() => setSeatAvailabilityFilter('waiting')}
                    className={`px-3 py-2 rounded-xl transition-colors ${
                      seatAvailabilityFilter === 'waiting'
                        ? 'bg-amber-600 text-white shadow-2xs'
                        : 'hover:text-slate-900'
                    }`}
                  >
                    Waiting List
                  </button>
                </div>
              </div>

              {/* Category Horizontal Chips without emojis */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold no-scrollbar">
                {categories.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setSelectedCategory(cat.value)}
                    className={`px-4 py-2.5 rounded-2xl whitespace-nowrap transition-all ${
                      selectedCategory === cat.value
                        ? 'bg-slate-900 text-white'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/80'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Activities Grid */}
            {filteredActivities.length === 0 ? (
              <div className="p-16 bg-white rounded-3xl border border-dashed border-slate-200 text-center space-y-3">
                <Compass className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="font-bold text-base text-slate-800">ไม่พบกิจกรรมที่ตรงกับคำค้นหา</h3>
                <p className="text-xs text-slate-500">
                  ลองเปลี่ยนคำค้นหา หรือกดรีเซ็ตหมวดหมู่เพื่อดูกิจกรรมทั้งหมด
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('All');
                    setSeatAvailabilityFilter('all');
                  }}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors"
                >
                  ล้างตัวกรองทั้งหมด
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredActivities.map((act) => {
                  const userReg =
                    currentUser?.role === 'organizer'
                      ? undefined
                      : userRegistrations.find(
                          (r) => r.activity_id === act.id && r.status !== 'CANCELLED'
                        );

                  return (
                    <ActivityCard
                      key={act.id}
                      activity={act}
                      currentUser={currentUser}
                      userRegistration={userReg}
                      onSelect={(a) => setSelectedActivity(a)}
                      onRSVP={(a) => handleRSVP(a)}
                      onAskAI={(a) => handleAskAI(a)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MY TICKETS & QR CODE */}
        {currentTab === 'tickets' && (
          <MyTicketsView
            currentUser={currentUser}
            registrations={userRegistrations}
            onViewQR={(reg) => setActiveTicketModal(reg)}
            onExplore={() => setCurrentTab('explore')}
            onCancelRSVP={(actId) => handleCancelRSVP(actId)}
            onOpenLogin={() => {
              setAuthModalMode('login');
              setIsAuthModalOpen(true);
            }}
          />
        )}

        {/* TAB 3: ORGANIZER DASHBOARD */}
        {currentTab === 'dashboard' && currentUser && (
          <DashboardView
            activities={activities}
            currentUser={currentUser}
            onOpenScanner={() => setIsScannerOpen(true)}
            onRefreshData={refreshData}
          />
        )}

        {/* TAB 4: AI ACTIVITY ASSISTANT */}
        {currentTab === 'ai' && (
          <AIAssistantView
            currentUser={currentUser}
            activities={activities}
            initialQuestion={aiQuestionPrompt}
          />
        )}

        {/* TAB 5: STUDENT PROFILE */}
        {currentTab === 'profile' && (
          currentUser ? (
            <ProfileView
              currentUser={currentUser}
              onUpdateUser={(updated) => {
                setCurrentUser(updated);
                showToast('อัปเดตข้อมูลโปรไฟล์เรียบร้อยแล้ว', 'success');
              }}
              userRegistrations={userRegistrations}
              onViewQR={(reg) => setActiveTicketModal(reg)}
              onLogout={handleLogout}
              onOpenScanner={() => setIsScannerOpen(true)}
              onOpenCreate={() => setIsCreateOpen(true)}
              onViewTickets={() => setCurrentTab('tickets')}
            />
          ) : (
            <div className="max-w-md mx-auto py-16 text-center space-y-4 bg-white rounded-3xl border border-slate-200 p-8 shadow-xs">
              <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <UserIcon className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">ยังไม่ได้เข้าสู่ระบบ</h3>
                <p className="text-xs text-slate-500 mt-1">
                  เข้าสู่ระบบ CampusLink ด้วยอีเมลมหาวิทยาลัยเพื่อดูตั๋วและสถิติ Show-up Rate
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => {
                    setAuthModalMode('login');
                    setIsAuthModalOpen(true);
                  }}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                >
                  เข้าสู่ระบบ
                </button>
                <button
                  onClick={() => {
                    setAuthModalMode('register');
                    setIsAuthModalOpen(true);
                  }}
                  className="px-5 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all"
                >
                  สมัครบัญชีใหม่
                </button>
              </div>
            </div>
          )
        )}
      </main>

      {/* Mobile Ergonomic Bottom Navigation Bar (Tailored by Role) */}
      <div className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-lg border-t border-slate-200/80 shadow-lg z-40 pb-safe">
        {currentUser?.role === 'organizer' ? (
          <div className="grid grid-cols-4 h-16 text-[10px] font-bold">
            <button
              onClick={() => setCurrentTab('dashboard')}
              className={`flex flex-col items-center justify-center gap-1 transition-colors ${
                currentTab === 'dashboard' ? 'text-indigo-600' : 'text-slate-400'
              }`}
            >
              <BarChart3 className="w-5 h-5" />
              <span>แดชบอร์ด</span>
            </button>

            <button
              onClick={() => setIsScannerOpen(true)}
              className="flex flex-col items-center justify-center gap-1 transition-colors text-indigo-600"
            >
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                <QrCode className="w-4 h-4" />
              </div>
              <span className="font-bold text-[10px]">สแกน QR</span>
            </button>

            <button
              onClick={() => setCurrentTab('explore')}
              className={`flex flex-col items-center justify-center gap-1 transition-colors ${
                currentTab === 'explore' ? 'text-indigo-600' : 'text-slate-400'
              }`}
            >
              <Compass className="w-5 h-5" />
              <span>กิจกรรม</span>
            </button>

            <button
              onClick={() => setCurrentTab('profile')}
              className={`flex flex-col items-center justify-center gap-1 transition-colors ${
                currentTab === 'profile' ? 'text-indigo-600' : 'text-slate-400'
              }`}
            >
              <UserIcon className="w-5 h-5" />
              <span>โปรไฟล์</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-4 h-16 text-[10px] font-bold">
            <button
              onClick={() => setCurrentTab('explore')}
              className={`flex flex-col items-center justify-center gap-1 transition-colors ${
                currentTab === 'explore' ? 'text-indigo-600' : 'text-slate-400'
              }`}
            >
              <Compass className="w-5 h-5" />
              <span>สำรวจ</span>
            </button>

            <button
              onClick={() => {
                if (!currentUser) {
                  setAuthModalMode('login');
                  setIsAuthModalOpen(true);
                  showToast('กรุณาเข้าสู่ระบบเพื่อดูตั๋วของคุณ', 'info');
                } else {
                  setCurrentTab('tickets');
                }
              }}
              className={`flex flex-col items-center justify-center gap-1 transition-colors relative ${
                currentTab === 'tickets' ? 'text-indigo-600' : 'text-slate-400'
              }`}
            >
              <Ticket className="w-5 h-5" />
              <span>ตั๋ว E-Pass</span>
              {userRegistrations.length > 0 && (
                <span className="absolute top-2 right-4 w-4 h-4 rounded-full bg-indigo-600 text-white text-[9px] flex items-center justify-center font-mono">
                  {userRegistrations.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setCurrentTab('ai')}
              className={`flex flex-col items-center justify-center gap-1 transition-colors ${
                currentTab === 'ai' ? 'text-indigo-600' : 'text-slate-400'
              }`}
            >
              <Sparkles className="w-5 h-5" />
              <span>AI ผู้ช่วย</span>
            </button>

            <button
              onClick={() => setCurrentTab('profile')}
              className={`flex flex-col items-center justify-center gap-1 transition-colors ${
                currentTab === 'profile' ? 'text-indigo-600' : 'text-slate-400'
              }`}
            >
              <UserIcon className="w-5 h-5" />
              <span>โปรไฟล์</span>
            </button>
          </div>
        )}
      </div>

      {/* MODALS */}
      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
        initialMode={authModalMode}
      />

      {/* Notifications Modal */}
      <NotificationModal
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        notifications={notifications}
        onMarkAsRead={handleMarkNotificationRead}
        onMarkAllAsRead={handleMarkAllNotificationsRead}
        onSelectActivity={(actId) => {
          const act = activities.find((a) => a.id === actId);
          if (act) setSelectedActivity(act);
        }}
        onViewTickets={() => setCurrentTab('tickets')}
      />

      {/* Activity Detail Modal */}
      {selectedActivity && (
        <ActivityDetailModal
          activity={selectedActivity}
          currentUser={currentUser || {
            id: 0,
            name: 'ผู้เยี่ยมชม',
            email: '',
            faculty: '',
            university_verified: false,
            show_up_rate: 100,
          }}
          userRegistration={
            currentUser?.role === 'organizer'
              ? undefined
              : userRegistrations.find(
                  (r) => r.activity_id === selectedActivity.id && r.status !== 'CANCELLED'
                )
          }
          onClose={() => setSelectedActivity(null)}
          onRSVP={(a) => handleRSVP(a)}
          onCancelRSVP={(a) => handleCancelRSVP(a.id)}
          onViewQR={(reg) => {
            setSelectedActivity(null);
            setActiveTicketModal(reg);
          }}
          onAskAI={(a) => handleAskAI(a)}
        />
      )}

      {/* QR Code Pass Modal */}
      {activeTicketModal && (
        <QRCodeModal
          registration={activeTicketModal}
          onClose={() => setActiveTicketModal(null)}
          onQuickCheckIn={(token) => handleQuickCheckIn(token)}
        />
      )}

      {/* QR Scanner Modal for Organizers */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        activities={activities}
        onCheckInSuccess={() => refreshData()}
      />

      {/* Create Activity Modal */}
      {currentUser && (
        <CreateActivityModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          currentUser={currentUser}
          onActivityCreated={() => {
            refreshData();
            showToast('สร้างกิจกรรมใหม่เรียบร้อยแล้ว', 'success');
          }}
        />
      )}

      {/* Subtle Footer */}
      <footer className="mt-8 py-6 border-t border-slate-200/60 text-center text-xs text-slate-400">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <span className="font-bold text-slate-600">CampusLink</span>
          <span>•</span>
          <span>แพลตฟอร์มเชื่อมต่อกิจกรรมมหาวิทยาลัย สำหรับผู้เข้าร่วมและผู้จัด</span>
        </div>
      </footer>
    </div>
  );
}
