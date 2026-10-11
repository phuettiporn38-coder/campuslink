-- ==============================================================================
-- Campus Activity Platform: Supabase PostgreSQL Schema
-- สามารถนำไฟล์ SQL นี้ไปรันใน Supabase -> SQL Editor เพื่อสร้างตารางทั้งหมด
-- ==============================================================================

-- 1. ตาราง users (ผู้ใช้งาน: นิสิต และ ผู้จัดกิจกรรม)
CREATE TABLE IF NOT EXISTS public.users (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  faculty TEXT NOT NULL,
  student_id TEXT,
  profile_image TEXT DEFAULT '',
  university_verified BOOLEAN DEFAULT FALSE,
  show_up_rate INTEGER DEFAULT 100,
  attended_count INTEGER DEFAULT 0,
  registered_count INTEGER DEFAULT 0,
  role TEXT DEFAULT 'student',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ตาราง activities (กิจกรรมภายในมหาวิทยาลัย)
CREATE TABLE IF NOT EXISTS public.activities (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  max_participants INTEGER NOT NULL,
  organizer_id BIGINT REFERENCES public.users(id) ON DELETE CASCADE,
  organizer_name TEXT NOT NULL,
  organizer_faculty TEXT,
  category TEXT NOT NULL,
  tags TEXT DEFAULT '[]',
  banner_image TEXT,
  required_items TEXT,
  status TEXT DEFAULT 'UPCOMING',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ตาราง registrations (การลงทะเบียน ตั๋ว QR Token และการเช็คอิน)
CREATE TABLE IF NOT EXISTS public.registrations (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  activity_id BIGINT NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('CONFIRMED', 'WAITING', 'CANCELLED')),
  qr_token TEXT UNIQUE NOT NULL,
  checked_in_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ตาราง notifications (ระบบแจ้งเตือนผู้ใช้งาน)
CREATE TABLE IF NOT EXISTS public.notifications (
  id TEXT PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  activity_id BIGINT REFERENCES public.activities(id) ON DELETE SET NULL
);

-- Indexes เพื่อเพิ่มประสิทธิภาพการค้นหา
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_student_id ON public.users(student_id);
CREATE INDEX IF NOT EXISTS idx_activities_category ON public.activities(category);
CREATE INDEX IF NOT EXISTS idx_registrations_user_id ON public.registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_registrations_activity_id ON public.registrations(activity_id);
CREATE INDEX IF NOT EXISTS idx_registrations_qr_token ON public.registrations(qr_token);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);

-- เปิด Row Level Security (RLS) และอนุญาต Service Role & Public เข้าถึงตาม API
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- สร้าง Security Policies ให้สามารถเรียกใช้งานผ่าน Backend หรือ Client Key ได้
CREATE POLICY "Allow public read users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Allow insert users" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update users" ON public.users FOR UPDATE USING (true);

CREATE POLICY "Allow public read activities" ON public.activities FOR SELECT USING (true);
CREATE POLICY "Allow insert activities" ON public.activities FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update activities" ON public.activities FOR UPDATE USING (true);

CREATE POLICY "Allow read registrations" ON public.registrations FOR SELECT USING (true);
CREATE POLICY "Allow insert registrations" ON public.registrations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update registrations" ON public.registrations FOR UPDATE USING (true);

CREATE POLICY "Allow read notifications" ON public.notifications FOR SELECT USING (true);
CREATE POLICY "Allow insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update notifications" ON public.notifications FOR UPDATE USING (true);

-- ข้อมูลตัวอย่างเริ่มต้น (Seed Initial Data)
INSERT INTO public.users (id, name, email, password, faculty, student_id, university_verified, show_up_rate, attended_count, registered_count, role)
VALUES
  (1, 'นายพีรพัฒน์ วงศ์สว่าง', 'student@up.ac.th', 'password123', 'คณะเทคโนโลยีสารสนเทศและการสื่อสาร (ICT)', '66020101', true, 90, 9, 10, 'student'),
  (2, 'น.ส.กานต์พิชชา รัตนคุณ', 'kanpicha.r@up.ac.th', 'password123', 'คณะวิศวกรรมศาสตร์', '66030214', true, 100, 6, 6, 'student'),
  (3, 'ดร.สมชาย นพคุณ (สโมสรนักศึกษา)', 'somchai.n@up.ac.th', 'password123', 'คณะเทคโนโลยีสารสนเทศและการสื่อสาร (ICT)', 'STAFF-009', true, 98, 24, 24, 'organizer')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.activities (id, title, description, location, start_date, end_date, max_participants, organizer_id, organizer_name, organizer_faculty, category, tags, banner_image, required_items, status)
VALUES
  (1, 'ฟุตบอล 5 คน มินิลีกหลังเลิกเรียน', 'แข่งขันฟุตซอล 5 คน เพื่อสุขภาพและสร้างเครือข่ายนักศึกษา แบ่งสายแข่งขันกระชับมิตร มีน้ำดื่มและอุปกรณ์ปฐมพยาบาลพร้อม', 'สนามฟุตซอลในร่ม อาคารศูนย์กีฬา มหาวิทยาลัย', '2026-10-06T17:00:00Z', '2026-10-06T20:00:00Z', 10, 3, 'ชมรมฟุตซอลและกีฬามหาวิทยาลัย', 'คณะเทคโนโลยีสารสนเทศและการสื่อสาร (ICT)', 'Sports & Fitness', '["ฟุตซอล", "ออกกำลังกาย", "สร้างมิตรภาพ"]', 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&auto=format&fit=crop&q=80', 'รองเท้าผ้าใบหรือรองเท้าฟุตซอล, ชุดออกกำลังกาย, กระบอกน้ำส่วนตัว', 'UPCOMING'),
  (2, 'AI Campus Hackathon 2026: พัฒนาแอปพลิเคชันระดับมหาวิทยาลัย', 'แข่งขันระดมไอเดียและสร้างโปรโตไทป์ AI ภายใน 24 ชั่วโมง พร้อมที่ปรึกษาจากสายงานเทคโนโลยี มีอาหารและเครื่องดื่มตลอดงาน พร้อมใบประกาศนียบัตร', 'ห้อง Co-Working & Conference Hall ชั้น 4 คณะ ICT', '2026-10-10T09:00:00Z', '2026-10-11T16:00:00Z', 24, 3, 'สโมสรนิสิตคณะ ICT', 'คณะเทคโนโลยีสารสนเทศและการสื่อสาร (ICT)', 'Technology & Academic', '["AI", "Hackathon", "Coding", "ทักษะวิชาการ"]', 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&auto=format&fit=crop&q=80', 'คอมพิวเตอร์พกพาส่วนตัว, ปลั๊กพ่วง, บัตรประจำตัวนักศึกษา', 'UPCOMING'),
  (3, 'Workshop: ออกแบบ UI/UX ด้วย Figma สำหรับนิสิต', 'เรียนรู้หลักการออกแบบโมบายล์แอปและเว็บไซต์ตั้งแต่พื้นฐานจนถึง Design System พร้อมสร้างผลงานจริงลงแฟ้มสะสมงาน', 'ห้องปฏิบัติการคอมพิวเตอร์ Lab 3 อาคารเทคโนโลยีสารสนเทศ', '2026-10-08T13:30:00Z', '2026-10-08T16:30:00Z', 15, 3, 'ชมรม Digital Design', 'คณะเทคโนโลยีสารสนเทศและการสื่อสาร (ICT)', 'Technology & Academic', '["Figma", "UI/UX", "Portfolio"]', 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=800&auto=format&fit=crop&q=80', 'ติดตั้ง Figma ล่วงหน้า, คอมพิวเตอร์พกพา, เมาส์', 'UPCOMING')
ON CONFLICT (id) DO NOTHING;
