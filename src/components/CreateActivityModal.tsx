import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Plus,
  Calendar,
  MapPin,
  Users,
  Tag,
  Image as ImageIcon,
  FileText,
  CheckCircle2,
  AlertCircle,
  Upload,
  Camera,
  Trash2,
  Loader2,
  Clock,
} from 'lucide-react';
import type { ActivityCategory, User } from '../types';
import { api } from '../services/api';
import { compressImageFile } from '../utils/image';

interface CreateActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onActivityCreated: () => void;
}

const PRESET_BANNERS = [
  {
    name: 'วิชาการ / สัมมนา',
    url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80',
  },
  {
    name: 'เทคโนโลยี / เวิร์กช็อป',
    url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80',
  },
  {
    name: 'กีฬา / สุขภาพ',
    url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&auto=format&fit=crop&q=80',
  },
  {
    name: 'กิจกรรม / สันทนาการ',
    url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&auto=format&fit=crop&q=80',
  },
];

function formatToLocalDateTimeInput(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export const CreateActivityModal: React.FC<CreateActivityModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onActivityCreated,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');

  // Default to tomorrow 09:00 and end 7 days later 18:00 (longer duration as requested)
  const calculateDefaultDates = () => {
    const now = new Date();
    const start = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    start.setHours(9, 0, 0, 0);
    const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
    end.setHours(18, 0, 0, 0);
    return {
      startStr: formatToLocalDateTimeInput(start),
      endStr: formatToLocalDateTimeInput(end),
    };
  };

  const initialDates = calculateDefaultDates();
  const [startDate, setStartDate] = useState(initialDates.startStr);
  const [endDate, setEndDate] = useState(initialDates.endStr);
  const [maxParticipants, setMaxParticipants] = useState('20');
  const [category, setCategory] = useState<ActivityCategory>('Technology & Academic');
  const [tagsStr, setTagsStr] = useState('วิชาการ, กิจกรรมนักศึกษา');
  const [requiredItems, setRequiredItems] = useState('บัตรประจำตัวนักศึกษา');
  const [bannerImage, setBannerImage] = useState(
    'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80'
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [showUrlFallback, setShowUrlFallback] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);


  // Current minimum selectable datetime (now)
  const minDateTime = formatToLocalDateTimeInput(new Date());

  // Real-time checks
  const isStartDatePast = Boolean(
    startDate && new Date(startDate).getTime() < new Date().getTime() - 60000
  );
  const isEndDateInvalid = Boolean(
    startDate && endDate && new Date(endDate).getTime() <= new Date(startDate).getTime()
  );

  // Reset dates to valid upcoming time when modal opens
  useEffect(() => {
    if (isOpen) {
      const dates = calculateDefaultDates();
      setStartDate(dates.startStr);
      setEndDate(dates.endStr);
      setError('');
    }
  }, [isOpen]);

  const handleFileProcess = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('กรุณาเลือกไฟล์รูปภาพ เช่น JPG, PNG, WEBP');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError('ขนาดไฟล์ต้องไม่เกิน 15MB');
      return;
    }

    try {
      setIsProcessingImage(true);
      setError('');
      const compressed = await compressImageFile(file, 1280, 720, 0.85);
      setBannerImage(compressed);
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถประมวลผลไฟล์รูปภาพได้');
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim() || !location.trim() || !startDate) {
      setError('กรุณากรอกชื่อกิจกรรม สถานที่ และวันเวลาให้ครบถ้วน');
      return;
    }

    const startTimestamp = new Date(startDate).getTime();
    const currentTimestamp = Date.now() - 60000; // 1 min buffer

    if (startTimestamp < currentTimestamp) {
      setError('ไม่สามารถเลือกวันและเวลาในอดีตได้ กรุณาเลือกวันและเวลาปัจจุบันหรือในอนาคต');
      return;
    }

    if (endDate) {
      const endTimestamp = new Date(endDate).getTime();
      if (endTimestamp <= startTimestamp) {
        setError('วันและเวลาสิ้นสุดกิจกรรมต้องอยู่หลังวันและเวลาเริ่มต้น');
        return;
      }
    }

    setLoading(true);
    try {
      const tags = tagsStr
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      await api.createActivity({
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        start_date: startDate,
        end_date: endDate || startDate,
        max_participants: parseInt(maxParticipants) || 10,
        organizer_id: currentUser.id,
        category,
        tags,
        required_items: requiredItems.trim(),
        banner_image: bannerImage,
      });

      onActivityCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการสร้างกิจกรรม');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[92vh]">
        {/* Header without emojis */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg">สร้างกิจกรรมใหม่</h3>
              <p className="text-xs text-slate-300">ระบบจัดสรรที่นั่งและ Waiting List อัตโนมัติ</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body without demo presets */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              ชื่อกิจกรรม <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="เช่น ฟุตบอล 5 คน มินิลีก, การอบรม UI/UX"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Category & Capacity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">หมวดหมู่กิจกรรม</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ActivityCategory)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="Sports & Fitness">กีฬาและสุขภาพ (Sports & Fitness)</option>
                <option value="Technology & Academic">เทคโนโลยีและวิชาการ (Technology & Academic)</option>
                <option value="Arts & Culture">ศิลปวัฒนธรรม (Arts & Culture)</option>
                <option value="Volunteer & Social">จิตอาสาและสังคม (Volunteer & Social)</option>
                <option value="Career & Workshop">พัฒนาทักษะและอาชีพ (Career & Workshop)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                จำนวนผู้เข้าร่วมสูงสุด (ความจุ) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="2"
                max="500"
                required
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                วันและเวลาเริ่ม <span className="text-rose-500">*</span>
              </label>
              <input
                type="datetime-local"
                required
                min={minDateTime}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 ${
                  isStartDatePast
                    ? 'border-rose-400 bg-rose-50/50 text-rose-900 focus:ring-rose-400'
                    : 'border-slate-300 focus:ring-indigo-500'
                }`}
              />
              {isStartDatePast && (
                <p className="text-[11px] text-rose-500 mt-1.5 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  ไม่สามารถเลือกวันและเวลาในอดีตได้
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                วันและเวลาสิ้นสุด
              </label>
              <input
                type="datetime-local"
                min={startDate || minDateTime}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 ${
                  isEndDateInvalid
                    ? 'border-rose-400 bg-rose-50/50 text-rose-900 focus:ring-rose-400'
                    : 'border-slate-300 focus:ring-indigo-500'
                }`}
              />
              {isEndDateInvalid && (
                <p className="text-[11px] text-rose-500 mt-1.5 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มต้น
                </p>
              )}
            </div>
          </div>

          {/* Auto-Delete Notice */}
          <div className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50/90 p-3 rounded-2xl border border-amber-200/80">
            <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-amber-900">กำหนดวันและเวลาได้อย่างอิสระ:</span>
              <span>
                คุณสามารถเลือกวันและเวลาเริ่มต้น - สิ้นสุดกิจกรรมได้ตามต้องการจากช่องเลือกเวลาด้านบน โดยเมื่อถึงเวลาสิ้นสุดกิจกรรมที่กำหนดไว้ ระบบจะลบกิจกรรมและข้อมูลการลงทะเบียนออกจากระบบโดยอัตโนมัติทันที
              </span>
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              สถานที่จัดกิจกรรม <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="เช่น อาคารเรียนรวม ICT ชั้น 4, สนามฟุตซอลในร่ม"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">รายละเอียดกิจกรรม</label>
            <textarea
              rows={3}
              placeholder="ระบุจุดประสงค์ กิจกรรมที่ทำ ใครเหมาะกับกิจกรรมนี้"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Required Items & Tags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">สิ่งที่ต้องเตรียมมา</label>
              <input
                type="text"
                placeholder="เช่น บัตรประจำตัวนักศึกษา, อุปกรณ์ส่วนตัว"
                value={requiredItems}
                onChange={(e) => setRequiredItems(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">แท็ก (คั่นด้วยเครื่องหมายจุลภาค)</label>
              <input
                type="text"
                placeholder="วิชาการ, กีฬา, สุขภาพ"
                value={tagsStr}
                onChange={(e) => setTagsStr(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Banner Image Upload */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-indigo-600" />
                <span>รูปภาพหน้าปกกิจกรรม (อัปโหลดรูปภาพ)</span>
              </label>
              {bannerImage && (
                <button
                  type="button"
                  onClick={() => setShowUrlFallback(!showUrlFallback)}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                >
                  {showUrlFallback ? 'ซ่อนการระบุ URL' : 'หรือระบุ URL รูปภาพ'}
                </button>
              )}
            </div>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageFileChange}
            />

            {/* Upload Area / Image Preview */}
            {bannerImage ? (
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 group shadow-xs">
                <img
                  src={bannerImage}
                  alt="Banner preview"
                  className="w-full h-44 object-cover group-hover:scale-101 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/30 flex items-end justify-between p-3.5">
                  <div className="text-white text-xs font-medium flex items-center gap-1.5 drop-shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>รูปภาพพร้อมใช้งาน</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isProcessingImage}
                      className="px-3 py-1.5 rounded-xl bg-white/90 hover:bg-white text-slate-900 text-xs font-bold shadow-md flex items-center gap-1.5 backdrop-blur-xs transition-all hover:scale-105 active:scale-95"
                    >
                      {isProcessingImage ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                      ) : (
                        <Upload className="w-3.5 h-3.5 text-indigo-600" />
                      )}
                      <span>เปลี่ยนรูปภาพ</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBannerImage('')}
                      className="p-1.5 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-white shadow-md transition-all hover:scale-105 active:scale-95"
                      title="ลบรูปภาพ"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`w-full p-6 rounded-2xl border-2 border-dashed cursor-pointer transition-all flex flex-col items-center justify-center text-center ${
                  isDragging
                    ? 'border-indigo-500 bg-indigo-50/80 scale-[1.01]'
                    : 'border-slate-300 bg-slate-50/70 hover:bg-indigo-50/40 hover:border-indigo-400'
                }`}
              >
                {isProcessingImage ? (
                  <div className="flex flex-col items-center gap-2 py-3">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                    <span className="text-xs font-bold text-slate-700">กำลังประมวลผลรูปภาพ...</span>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-2.5 shadow-xs transition-transform">
                      <Upload className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-bold text-slate-800 mb-0.5">
                      คลิกเพื่ออัปโหลดรูปภาพ หรือลากไฟล์มาวางที่นี่
                    </p>
                    <p className="text-[11px] text-slate-500 mb-3">
                      รองรับไฟล์ภาพ JPG, PNG, WEBP (บีบอัดความละเอียดให้อัตโนมัติ)
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>เลือกรูปภาพจากเครื่อง</span>
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Quick Preset Images */}
            <div className="mt-2.5">
              <span className="text-[11px] text-slate-500 font-medium block mb-1.5">
                หรือเลือกรูปภาพตัวอย่างตามหมวดหมู่:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PRESET_BANNERS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setBannerImage(preset.url)}
                    className={`relative rounded-xl overflow-hidden border text-left p-1.5 transition-all flex items-center gap-2 group ${
                      bannerImage === preset.url
                        ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <img
                      src={preset.url}
                      alt={preset.name}
                      className="w-8 h-8 rounded-lg object-cover shrink-0"
                    />
                    <span className="text-[11px] font-semibold text-slate-700 truncate group-hover:text-indigo-600">
                      {preset.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* URL Fallback if needed */}
            {(!bannerImage || showUrlFallback) && (
              <div className="mt-2.5 pt-2.5 border-t border-slate-100">
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                  หรือวางลิงก์รูปภาพ (URL)
                </label>
                <div className="relative">
                  <input
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    value={bannerImage}
                    onChange={(e) => setBannerImage(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-slate-600"
                  />
                  {bannerImage && (
                    <button
                      type="button"
                      onClick={() => setBannerImage('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer Submit */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={loading || isStartDatePast || isEndDateInvalid}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'กำลังบันทึก...' : 'สร้างกิจกรรม'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
