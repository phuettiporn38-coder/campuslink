import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  QrCode,
  Camera,
  CameraOff,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  GraduationCap,
  Sparkles,
  Zap,
  Volume2,
  VolumeX,
  Search,
  Check,
  SwitchCamera,
  History,
  ShieldCheck,
  Calendar,
  MapPin,
  Flame,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import jsQR from 'jsqr';
import { api } from '../services/api';
import type { Activity, Registration, User as UserType } from '../types';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  activities: Activity[];
  initialActivityId?: number;
  onCheckInSuccess?: () => void;
}

interface ScanHistoryItem {
  id: string;
  user: UserType;
  activityTitle: string;
  checkedInAt: string;
  showUpRate?: number;
  status: 'SUCCESS' | 'ALREADY';
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  activities,
  initialActivityId = 0,
  onCheckInSuccess,
}) => {
  // Mode selection
  const [activeTab, setActiveTab] = useState<'camera' | 'upload' | 'manual'>('camera');

  // Selected activity to filter (0 = all activities)
  const [selectedActivityId, setSelectedActivityId] = useState<number>(initialActivityId);

  // Camera State
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [continuousMode, setContinuousMode] = useState<boolean>(true);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [torchSupported, setTorchSupported] = useState<boolean>(false);

  // Scanning state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const lastScannedTokenRef = useRef<string>('');
  const lastScannedTimeRef = useRef<number>(0);

  // Manual input state
  const [inputToken, setInputToken] = useState('');
  const [loading, setLoading] = useState(false);

  // Scan result state
  const [scanResult, setScanResult] = useState<{
    type: 'success' | 'already' | 'warning' | 'error';
    title: string;
    description: string;
    user?: UserType;
    activity?: Activity;
    checkedInAt?: string;
    showUpRate?: number;
  } | null>(null);

  // Recent scan history in this session
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Quick lookup of participants for selected activity
  const [participants, setParticipants] = useState<Registration[]>([]);
  const [participantSearch, setParticipantSearch] = useState('');
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  // Sound generator using Web Audio API
  const playSound = (success = true) => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (success) {
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else {
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch {
      // Audio not supported or blocked
    }
  };

  // Start Camera
  const startCamera = async () => {
    stopCamera();
    setCameraError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('เบราว์เซอร์ไม่รองรับการเข้าถึงกล้องโดยตรง');
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // Check torch capability
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities: any = videoTrack.getCapabilities ? videoTrack.getCapabilities() : {};
        if (capabilities.torch) {
          setTorchSupported(true);
        } else {
          setTorchSupported(false);
        }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setCameraActive(true);
        startScanningLoop();
      }
    } catch (err: any) {
      console.warn('Camera error:', err);
      setCameraActive(false);
      let msg = 'ไม่สามารถเปิดกล้องได้';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'คุณปฏิเสธการเข้าถึงกล้อง กรุณาอนุญาตในตั้งค่าเบราว์เซอร์ หรือใช้วิธีอัปโหลดรูปภาพ';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'ไม่พบอุปกรณ์กล้องบนเครื่องของคุณ';
      } else if (err.name === 'NotReadableError') {
        msg = 'กล้องกำลังถูกใช้งานโดยแอปพลิเคชันอื่น';
      } else {
        msg = err.message || 'ไม่สามารถเริ่มการทำงานของกล้องได้';
      }
      setCameraError(msg);
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setTorchOn(false);
  };

  // Toggle Torch
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && torchSupported) {
      try {
        const nextState = !torchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: nextState }],
        });
        setTorchOn(nextState);
      } catch (e) {
        console.warn('Failed to toggle torch:', e);
      }
    }
  };

  // Switch Camera facing mode
  const toggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
  };

  // Start scanning frame loop
  const startScanningLoop = () => {
    const scanLoop = () => {
      if (!videoRef.current || !canvasRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
        animationFrameRef.current = requestAnimationFrame(scanLoop);
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code && code.data) {
          const rawData = code.data.trim();
          handleScannedData(rawData);
        }
      }

      animationFrameRef.current = requestAnimationFrame(scanLoop);
    };

    animationFrameRef.current = requestAnimationFrame(scanLoop);
  };

  // Clean raw token from QR data (e.g. if encoded as URL or JSON)
  const extractToken = (raw: string): string => {
    if (!raw) return '';
    // Check if JSON
    try {
      const obj = JSON.parse(raw);
      if (obj.qr_token) return obj.qr_token;
      if (obj.token) return obj.token;
    } catch {
      // not JSON
    }
    // Check if URL with token param
    try {
      if (raw.includes('token=')) {
        const url = new URL(raw, 'http://localhost');
        const t = url.searchParams.get('token') || url.searchParams.get('qr_token');
        if (t) return t;
      }
    } catch {
      // ignore URL parse errors
    }
    return raw.trim();
  };

  // Handle scanned token with debouncing and processing
  const handleScannedData = async (rawString: string) => {
    const token = extractToken(rawString);
    if (!token) return;

    const now = Date.now();
    // Prevent re-triggering same token within 3 seconds
    if (token === lastScannedTokenRef.current && now - lastScannedTimeRef.current < 3000) {
      return;
    }

    if (isProcessing) return;

    lastScannedTokenRef.current = token;
    lastScannedTimeRef.current = now;

    await executeCheckIn(token);
  };

  // Perform Check-in API call
  const executeCheckIn = async (token: string, registrationId?: number) => {
    setIsProcessing(true);
    setLoading(true);

    try {
      const res = await api.checkIn({
        qr_token: registrationId ? undefined : token,
        registration_id: registrationId,
      });

      // Verify activity match if specific activity is chosen
      if (selectedActivityId > 0 && res.activity && res.activity.id !== selectedActivityId) {
        playSound(false);
        setScanResult({
          type: 'warning',
          title: 'กิจกรรมไม่ตรงกับที่เลือกตรวจ',
          description: `บัตรนี้เป็นของ "${res.activity.title}" (ไม่ใช่กิจกรรมที่คุณกำลังตรวจเช็ค)`,
          user: res.user,
          activity: res.activity,
          checkedInAt: res.checked_in_at,
          showUpRate: res.user_show_up_rate,
        });
        return;
      }

      if (res.already_checked_in) {
        playSound(false);
        setScanResult({
          type: 'already',
          title: 'เคยทำการ Check-in แล้ว',
          description: `${res.user?.name || 'ผู้เข้าร่วม'} ได้เช็คอินไปก่อนหน้าแล้ว เมื่อ ${
            res.checked_in_at
              ? new Date(res.checked_in_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.'
              : ''
          }`,
          user: res.user,
          activity: res.activity,
          checkedInAt: res.checked_in_at,
          showUpRate: res.user_show_up_rate,
        });

        if (res.user) {
          setScanHistory((prev) => [
            {
              id: `hist-${Date.now()}`,
              user: res.user!,
              activityTitle: res.activity?.title || 'กิจกรรม',
              checkedInAt: res.checked_in_at || new Date().toISOString(),
              showUpRate: res.user_show_up_rate,
              status: 'ALREADY',
            },
            ...prev.slice(0, 19),
          ]);
        }
      } else {
        // Success check-in!
        playSound(true);
        confetti({
          particleCount: 65,
          spread: 70,
          origin: { y: 0.65 },
          colors: ['#10b981', '#6366f1', '#f59e0b', '#3b82f6'],
        });

        const checkInTimeStr = res.checked_in_at || new Date().toISOString();

        setScanResult({
          type: 'success',
          title: 'Check-in สำเร็จ ยืนยันสิทธิ์เรียบร้อย',
          description: `${res.user?.name} เข้าร่วม "${res.activity?.title}" • Show-up Rate ปัจจุบัน: ${res.user_show_up_rate || 100}%`,
          user: res.user,
          activity: res.activity,
          checkedInAt: checkInTimeStr,
          showUpRate: res.user_show_up_rate,
        });

        if (res.user) {
          setScanHistory((prev) => [
            {
              id: `hist-${Date.now()}`,
              user: res.user!,
              activityTitle: res.activity?.title || 'กิจกรรม',
              checkedInAt: checkInTimeStr,
              showUpRate: res.user_show_up_rate,
              status: 'SUCCESS',
            },
            ...prev.slice(0, 19),
          ]);
        }

        setInputToken('');
        if (onCheckInSuccess) onCheckInSuccess();

        // If continuous mode, clear result banner after 3.5 seconds to scan next
        if (continuousMode && activeTab === 'camera') {
          setTimeout(() => {
            setScanResult(null);
          }, 3500);
        }
      }
    } catch (err: any) {
      playSound(false);
      setScanResult({
        type: 'error',
        title: 'ไม่สามารถ Check-in ได้',
        description: err.message || 'QR Token ไม่ถูกต้อง หรือผู้ใช้อยู่ในสถานะ Waiting List / ยกเลิก',
      });
    } finally {
      setIsProcessing(false);
      setLoading(false);
    }
  };

  // Scan from Uploaded Image File
  const handleImageUpload = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code && code.data) {
          executeCheckIn(code.data.trim());
        } else {
          playSound(false);
          setScanResult({
            type: 'error',
            title: 'ไม่พบ QR Code ในรูปภาพ',
            description: 'กรุณาอัปโหลดภาพที่มี QR Code ที่ชัดเจน หรือลองสแกนด้วยกล้องอีกครั้ง',
          });
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Load participants for quick roster check
  const loadParticipants = async (actId: number) => {
    if (!actId) {
      setParticipants([]);
      return;
    }
    setLoadingParticipants(true);
    try {
      const list = await api.getActivityParticipants(actId);
      setParticipants(list);
    } catch (err) {
      console.warn('Failed to load participants:', err);
    } finally {
      setLoadingParticipants(false);
    }
  };

  // Lifecycle effects
  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'camera') {
        startCamera();
      }
      if (selectedActivityId > 0) {
        loadParticipants(selectedActivityId);
      }
    } else {
      stopCamera();
      setScanResult(null);
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab, facingMode]);

  useEffect(() => {
    if (selectedActivityId > 0 && isOpen) {
      loadParticipants(selectedActivityId);
    }
  }, [selectedActivityId]);

  if (!isOpen) return null;

  const filteredParticipants = participants.filter((p) => {
    if (!participantSearch) return true;
    const q = participantSearch.toLowerCase();
    return (
      p.user?.name.toLowerCase().includes(q) ||
      p.user?.student_id?.toLowerCase().includes(q) ||
      p.qr_token.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200/80 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg">ระบบสแกน QR Check-in</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  สแกนได้จริง Real-time
                </span>
              </div>
              <p className="text-xs text-slate-300">สำหรับผู้จัดกิจกรรมตรวจสอบและยืนยันการเข้าร่วม</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Sound toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'เปิดเสียงอยู่ (คลิกเพื่อปิด)' : 'ปิดเสียงอยู่ (คลิกเพื่อเปิด)'}
              className={`p-2 rounded-xl transition-colors ${
                soundEnabled ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-rose-500/20 text-rose-300'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Close button */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Top Controls: Activity selector + Tabs */}
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 shrink-0 space-y-2.5">
          {/* Activity Filter Dropdown */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
            <div className="flex-1">
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                กิจกรรมที่ตรวจเช็ค:
              </label>
              <select
                value={selectedActivityId}
                onChange={(e) => setSelectedActivityId(Number(e.target.value))}
                className="w-full text-xs font-medium bg-white border border-slate-300 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
              >
                <option value={0}>ตรวจได้ทุกกิจกรรม (All Activities)</option>
                {activities.map((act) => (
                  <option key={act.id} value={act.id}>
                    {act.title} (ยืนยัน {act.current_confirmed}/{act.max_participants})
                  </option>
                ))}
              </select>
            </div>

            {/* Scan History Button */}
            <div className="flex items-end">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={`w-full sm:w-auto px-3 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                  showHistory
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>ประวัติการเช็คอิน</span>
                {scanHistory.length > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-mono">
                    {scanHistory.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => {
                setActiveTab('camera');
                setShowHistory(false);
              }}
              className={`flex-1 py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'camera' && !showHistory
                  ? 'bg-white text-indigo-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>สแกนด้วยกล้อง (Camera)</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('upload');
                setShowHistory(false);
              }}
              className={`flex-1 py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'upload' && !showHistory
                  ? 'bg-white text-indigo-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>อัปโหลดภาพ QR</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('manual');
                setShowHistory(false);
              }}
              className={`flex-1 py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'manual' && !showHistory
                  ? 'bg-white text-indigo-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>ค้นหา / Token</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* History Drawer */}
          {showHistory ? (
            <div className="space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <History className="w-4 h-4 text-indigo-600" />
                  <span>รายชื่อที่เช็คอินในรอบนี้ ({scanHistory.length} คน)</span>
                </h4>
                <button
                  onClick={() => setShowHistory(false)}
                  className="text-xs text-indigo-600 hover:underline font-semibold"
                >
                  กลับไปหน้าสแกน
                </button>
              </div>

              {scanHistory.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  ยังไม่มีประวัติการเช็คอินในรอบนี้
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs max-h-80 overflow-y-auto">
                  {scanHistory.map((item) => (
                    <div key={item.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {item.user.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1.5">
                            <span>{item.user.name}</span>
                            <span className="text-[10px] font-mono text-slate-500">
                              ({item.user.student_id || 'ID'})
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">{item.activityTitle}</div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.status === 'SUCCESS'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          {item.status === 'SUCCESS' ? 'สำเร็จ' : 'เช็คแล้ว'}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                          {new Date(item.checkedInAt).toLocaleTimeString('th-TH', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}{' '}
                          น.
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* TAB 1: Real Camera View */}
              {activeTab === 'camera' && (
                <div className="space-y-3 animate-fade-in">
                  {/* Camera Video Viewport */}
                  <div className="relative aspect-video sm:aspect-[16/9] w-full bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex flex-col items-center justify-center text-white">
                    {/* Hidden canvas for decoding */}
                    <canvas ref={canvasRef} className="hidden" />

                    {/* Real Video Element */}
                    <video
                      ref={videoRef}
                      className="absolute inset-0 w-full h-full object-cover"
                      playsInline
                      muted
                    />

                    {/* Viewfinder Overlay & Target Frame */}
                    {cameraActive && (
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        {/* Dim backdrop outside scan box */}
                        <div className="relative w-56 h-56 sm:w-64 sm:h-64 border-2 border-indigo-400/80 rounded-2xl shadow-[0_0_0_9999px_rgba(15,23,42,0.45)] flex items-center justify-center overflow-hidden">
                          {/* Corner Markers */}
                          <div className="absolute top-0 left-0 w-5 h-5 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                          <div className="absolute top-0 right-0 w-5 h-5 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                          <div className="absolute bottom-0 left-0 w-5 h-5 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                          <div className="absolute bottom-0 right-0 w-5 h-5 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

                          {/* Scanning Laser Beam */}
                          <div className="w-full h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#10b981] animate-pulse" />
                        </div>

                        {/* Top Scanning Helper Banner */}
                        <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-white text-[11px] font-medium border border-white/20 flex items-center gap-1.5 shadow-sm">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                          <span>จัดตำแหน่ง QR Code ให้อยู่ในกรอบ</span>
                        </div>
                      </div>
                    )}

                    {/* Camera Offline / Error State */}
                    {(!cameraActive || cameraError) && (
                      <div className="relative z-10 p-6 text-center max-w-sm space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-white/10 mx-auto flex items-center justify-center text-rose-400">
                          <CameraOff className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-white">
                            {cameraError ? 'ไม่สามารถเปิดกล้องได้' : 'กำลังเตรียมกล้องสแกน...'}
                          </p>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            {cameraError || 'กรุณารอสักครู่ ระบบกำลังขอสิทธิ์การใช้งานกล้องบนอุปกรณ์'}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 justify-center pt-1">
                          <button
                            onClick={startCamera}
                            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>ลองเปิดกล้องใหม่</span>
                          </button>
                          <button
                            onClick={() => setActiveTab('upload')}
                            className="px-3.5 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold flex items-center gap-1.5 transition-all"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>ใช้วิธีอัปโหลดภาพ QR</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* On-Camera Floating Controls */}
                    {cameraActive && (
                      <div className="absolute bottom-3 inset-x-3 flex items-center justify-between pointer-events-auto">
                        <button
                          onClick={toggleFacingMode}
                          className="px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 backdrop-blur-md text-white text-xs font-semibold flex items-center gap-1.5 border border-white/20 transition-all shadow-xs"
                        >
                          <SwitchCamera className="w-3.5 h-3.5" />
                          <span>สลับกล้อง ({facingMode === 'environment' ? 'หลัง' : 'หน้า'})</span>
                        </button>

                        {torchSupported && (
                          <button
                            onClick={toggleTorch}
                            className={`px-3 py-1.5 rounded-xl backdrop-blur-md text-xs font-semibold flex items-center gap-1.5 border border-white/20 transition-all shadow-xs ${
                              torchOn
                                ? 'bg-amber-500 text-white border-amber-400'
                                : 'bg-slate-900/80 hover:bg-slate-900 text-white'
                            }`}
                          >
                            <Zap className="w-3.5 h-3.5" />
                            <span>{torchOn ? 'ปิดแฟลช' : 'เปิดแฟลช'}</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Mode Settings Toggle */}
                  <div className="flex items-center justify-between text-xs px-1 text-slate-600">
                    <label className="flex items-center gap-2 cursor-pointer font-medium select-none">
                      <input
                        type="checkbox"
                        checked={continuousMode}
                        onChange={(e) => setContinuousMode(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                      />
                      <span>โหมดสแกนต่อเนื่อง (Continuous Scan สำหรับจุดลงทะเบียนหน้างาน)</span>
                    </label>
                  </div>
                </div>
              )}

              {/* TAB 2: Upload QR Image */}
              {activeTab === 'upload' && (
                <div className="space-y-4 animate-fade-in">
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files[0];
                      if (file) handleImageUpload(file);
                    }}
                    className="p-8 border-2 border-dashed border-indigo-200 hover:border-indigo-500 rounded-3xl bg-indigo-50/40 text-center transition-all group flex flex-col items-center justify-center cursor-pointer"
                    onClick={() => document.getElementById('qr-file-input')?.click()}
                  >
                    <input
                      id="qr-file-input"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file);
                      }}
                    />

                    <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mb-3 shadow-md group-hover:scale-105 transition-transform">
                      <Upload className="w-7 h-7" />
                    </div>

                    <h4 className="text-sm font-bold text-slate-800">
                      คลิกเพื่อเลือกภาพ QR Code หรือลากไฟล์มาวางที่นี่
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm">
                      รองรับไฟล์ JPG, PNG, WebP หรือถ่ายภาพ QR Code จากหน้าจอมือถือ
                    </p>

                    <div className="mt-4 px-4 py-2 rounded-xl bg-white border border-indigo-200 text-indigo-700 text-xs font-bold shadow-2xs group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      เลือกไฟล์จากอุปกรณ์
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-2xl border border-slate-200 leading-relaxed">
                    <strong>💡 เคล็ดลับ:</strong> ผู้จัดสามารถให้นักศึกษาส่งภาพแคปหน้าจอ QR Pass ผ่านไลน์หรืออีเมล แล้วนำมาอัปโหลดเพื่อยืนยันการเช็คอินได้เช่นเดียวกัน
                  </div>
                </div>
              )}

              {/* TAB 3: Manual Input & Search */}
              {activeTab === 'manual' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 block">
                      ระบุ QR Token ด้วยตนเอง (หรือสแกนด้วย Barcode Scanner แบบ USB/Bluetooth)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="วางรหัส Token เช่น 550e8400-e29b-41d4-a716-446655440001"
                        value={inputToken}
                        onChange={(e) => setInputToken(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && executeCheckIn(inputToken)}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono shadow-2xs"
                      />
                      <button
                        onClick={() => executeCheckIn(inputToken)}
                        disabled={loading || !inputToken.trim()}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all shadow-xs"
                      >
                        {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        <span>ตรวจสอบ</span>
                      </button>
                    </div>
                  </div>

                  {/* Fast Roster Search */}
                  {selectedActivityId > 0 && (
                    <div className="pt-2 border-t border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700">
                          รายชื่อผู้มีสิทธิ์ในกิจกรรมนี้ ({participants.length} คน)
                        </label>
                        <span className="text-[11px] text-slate-500">คลิกที่ชื่อเพื่อเช็คอินทันที</span>
                      </div>

                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="ค้นหาด้วยชื่อ หรือรหัสนักศึกษา..."
                          value={participantSearch}
                          onChange={(e) => setParticipantSearch(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div className="border border-slate-200 rounded-2xl max-h-48 overflow-y-auto divide-y divide-slate-100 bg-white">
                        {loadingParticipants ? (
                          <div className="p-4 text-center text-xs text-slate-400">กำลังโหลดรายชื่อ...</div>
                        ) : filteredParticipants.length === 0 ? (
                          <div className="p-4 text-center text-xs text-slate-400">ไม่พบรายชื่อที่ตรงกัน</div>
                        ) : (
                          filteredParticipants.map((reg) => (
                            <div
                              key={reg.id}
                              className="p-2.5 flex items-center justify-between hover:bg-slate-50 transition-colors text-xs"
                            >
                              <div>
                                <div className="font-bold text-slate-900">{reg.user?.name}</div>
                                <div className="text-[11px] text-slate-500 font-mono">
                                  {reg.user?.student_id || 'ID'} • {reg.status}
                                </div>
                              </div>
                              <button
                                onClick={() => executeCheckIn(reg.qr_token, reg.id)}
                                disabled={!!reg.checked_in_at || reg.status !== 'CONFIRMED'}
                                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                  reg.checked_in_at
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                                    : reg.status === 'CONFIRMED'
                                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs'
                                    : 'bg-amber-100 text-amber-800 cursor-not-allowed'
                                }`}
                              >
                                {reg.checked_in_at ? 'เช็คอินแล้ว' : reg.status === 'CONFIRMED' ? 'เช็คอิน' : 'รอคิว'}
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Status & Verification Result Card */}
              {scanResult && (
                <div
                  className={`p-4 sm:p-5 rounded-2xl border text-sm animate-scale-up shadow-sm transition-all ${
                    scanResult.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                      : scanResult.type === 'already'
                      ? 'bg-amber-50 border-amber-200 text-amber-950'
                      : scanResult.type === 'warning'
                      ? 'bg-amber-50 border-amber-300 text-amber-950'
                      : 'bg-rose-50 border-rose-200 text-rose-950'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {scanResult.type === 'success' && (
                      <div className="p-2 rounded-xl bg-emerald-600 text-white shrink-0 mt-0.5">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                    )}
                    {scanResult.type === 'already' && (
                      <div className="p-2 rounded-xl bg-amber-600 text-white shrink-0 mt-0.5">
                        <Clock className="w-5 h-5" />
                      </div>
                    )}
                    {(scanResult.type === 'warning' || scanResult.type === 'error') && (
                      <div className="p-2 rounded-xl bg-rose-600 text-white shrink-0 mt-0.5">
                        <AlertCircle className="w-5 h-5" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-sm sm:text-base leading-tight">{scanResult.title}</h4>
                        <button
                          onClick={() => setScanResult(null)}
                          className="text-xs opacity-60 hover:opacity-100 font-semibold"
                        >
                          ปิด
                        </button>
                      </div>
                      <p className="text-xs mt-1 leading-relaxed opacity-90">{scanResult.description}</p>

                      {/* Participant Card Details */}
                      {scanResult.user && (
                        <div className="mt-3 p-3 rounded-xl bg-white/80 border border-black/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                              {scanResult.user.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">{scanResult.user.name}</div>
                              <div className="text-[11px] text-slate-600 font-mono">
                                {scanResult.user.student_id || 'Student'} • {scanResult.user.faculty}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <div className="px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 font-mono text-[11px] font-bold">
                              Show-up: {scanResult.showUpRate || 100}%
                            </div>
                            {scanResult.checkedInAt && (
                              <div className="text-[11px] text-slate-500 font-mono">
                                {new Date(scanResult.checkedInAt).toLocaleTimeString('th-TH', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}{' '}
                                น.
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>ระบบคำนวณ Show-up Rate และส่งการแจ้งเตือนทันทีเมื่อเช็คอิน</span>
          </div>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 transition-colors font-bold"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
