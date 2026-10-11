import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import type { Activity, Registration, User, ActivityDashboard, AppNotification } from './src/types/index.ts';
import { repository } from './src/db/repository.ts';
import { dbService } from './src/db/database.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

// Catch unhandled rejections to prevent node crash
process.on('unhandledRejection', (reason) => {
  console.warn('[Server] Handled asynchronous rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.warn('[Server] Handled uncaught exception:', err);
});

app.use(express.json({ limit: '10mb' }));

// Enable CORS and handle preflight OPTIONS requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Custom University AI configuration provided by user
const KKU_AI_BASE_URL = process.env.AI_BASE_URL || 'https://gen.ai.kku.ac.th/upacth/api/v1';
const KKU_AI_API_KEY = process.env.AI_API_KEY || 'sk_P6QkFMkd1zy1fs7EAIVEVKfHExmy4RUR8nj9LFJeGe5L4XJuFqyITOzjhvEjhNaC';

// Initialize GoogleGenAI fallback if needed
const geminiApiKey = process.env.GEMINI_API_KEY || '';
const ai = geminiApiKey
  ? new GoogleGenAI({
      apiKey: geminiApiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// Active Auth Sessions token map (token -> userId)
const activeSessions = new Map<string, number>();

// Helper to sanitize user object (remove password)
function sanitizeUser(u: User): User {
  const { password, ...safe } = u;
  return safe;
}

// ================= API Routes =================

app.get('/health', async (req, res) => {
  const info = await repository.getBackendInfo();
  res.json({
    status: 'ok',
    service: 'activity-service',
    database: info.provider,
    supabase_configured: info.isSupabaseConfigured,
    supabase_connected: info.supabaseAlive,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health', async (req, res) => {
  const info = await repository.getBackendInfo();
  res.json({
    status: 'ok',
    service: 'activity-service',
    database: info.provider,
    supabase_configured: info.isSupabaseConfigured,
    supabase_connected: info.supabaseAlive,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/backend/status', async (req, res) => {
  const info = await repository.getBackendInfo();
  res.json(info);
});

// ================= Authentication Routes =================

app.post('/api/auth/login', async (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ error: 'กรุณากรอกอีเมล/รหัสนิสิต และรหัสผ่าน' });
  }

  const user = await repository.getUserByEmailOrStudentId(identifier);

  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
  }

  await repository.recalculateUserStats(user.id);
  const updatedUser = (await repository.getUserById(user.id)) || user;

  // Generate session token
  const token = `token-${crypto.randomUUID()}`;
  activeSessions.set(token, user.id);

  res.json({
    token,
    user: sanitizeUser(updatedUser),
    message: 'เข้าสู่ระบบสำเร็จ',
  });
});

app.post('/api/auth/demo-login', async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'ไม่พบรหัสผู้ใช้งาน' });
  }

  const user = await repository.getUserById(Number(userId));
  if (!user) {
    return res.status(404).json({ error: 'ไม่พบบัญชีผู้ใช้งานในระบบ' });
  }

  await repository.recalculateUserStats(user.id);
  const updatedUser = (await repository.getUserById(user.id)) || user;

  const token = `token-${crypto.randomUUID()}`;
  activeSessions.set(token, user.id);

  res.json({
    token,
    user: sanitizeUser(updatedUser),
    message: 'เข้าสู่ระบบสำเร็จ',
  });
});

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, faculty, student_id, role } = req.body;

  if (!name || !email || !password || !faculty) {
    return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน (ชื่อ, อีเมล, รหัสผ่าน, คณะ)' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const existingEmail = await repository.getUserByEmailOrStudentId(cleanEmail);
  if (existingEmail) {
    return res.status(400).json({ error: 'อีเมลนี้ถูกลงทะเบียนในระบบแล้ว' });
  }

  if (student_id) {
    const existingStudentId = await repository.getUserByEmailOrStudentId(student_id.trim());
    if (existingStudentId) {
      return res.status(400).json({ error: 'รหัสนิสิตนี้มีในระบบแล้ว' });
    }
  }

  const isVerified = cleanEmail.endsWith('.ac.th') || cleanEmail.includes('up.ac.th');

  const newUser = await repository.createUser({
    name: name.trim(),
    email: cleanEmail,
    password,
    faculty: faculty.trim(),
    student_id: student_id ? student_id.trim() : `660${Math.floor(10000 + Math.random() * 90000)}`,
    role: role === 'organizer' ? 'organizer' : 'student',
    profile_image: '',
    university_verified: isVerified,
  });

  // Add welcome notification
  await repository.createNotification({
    id: `notif-${Date.now()}`,
    user_id: newUser.id,
    title: 'ยินดีต้อนรับสู่ระบบกิจกรรมมหาวิทยาลัย',
    message: isVerified
      ? 'ยืนยันตัวตนด้วยอีเมลมหาวิทยาลัยสำเร็จ บัญชีของคุณได้รับตรา Verified เรียบร้อยแล้ว'
      : 'บัญชีของคุณถูกสร้างเรียบร้อยแล้ว ยินดีต้อนรับสู่ระบบ',
    type: 'general',
  });

  const token = `token-${crypto.randomUUID()}`;
  activeSessions.set(token, newUser.id);

  res.status(201).json({
    token,
    user: sanitizeUser(newUser),
    message: 'ลงทะเบียนบัญชีใหม่สำเร็จ',
  });
});

app.get('/api/auth/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  let token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
  if (!token && typeof req.query.token === 'string') {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'ยังไม่ได้เข้าสู่ระบบ หรือเซสชันหมดอายุ' });
  }

  let userId = activeSessions.get(token);
  if (!userId) {
    // Graceful recovery after server restart / hot reload
    const allUsers = await repository.getAllUsers();
    if (allUsers.length > 0) {
      userId = allUsers[0].id;
      activeSessions.set(token, userId);
    } else {
      return res.status(401).json({ error: 'ยังไม่ได้เข้าสู่ระบบ หรือเซสชันหมดอายุ' });
    }
  }

  const user = await repository.getUserById(userId);
  if (!user) {
    return res.status(404).json({ error: 'ไม่พบบัญชีผู้ใช้' });
  }

  await repository.recalculateUserStats(user.id);
  const freshUser = (await repository.getUserById(user.id)) || user;
  res.json({ user: sanitizeUser(freshUser) });
});

app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
  if (token) {
    activeSessions.delete(token);
  }
  res.json({ success: true, message: 'ออกจากระบบเรียบร้อยแล้ว' });
});

// ================= Users API =================

app.get('/api/users', async (req, res) => {
  const allUsers = await repository.getAllUsers();
  res.json(allUsers.map(sanitizeUser));
});

app.get('/api/users/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const user = await repository.getUserById(id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  await repository.recalculateUserStats(id);
  const fresh = (await repository.getUserById(id)) || user;
  res.json(sanitizeUser(fresh));
});

// Update Profile & Avatar upload
app.put('/api/users/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const updated = await repository.updateUser(id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'ไม่พบผู้ใช้' });
  }
  res.json(sanitizeUser(updated));
});

app.get('/api/users/:id/show-up-rate', async (req, res) => {
  const id = parseInt(req.params.id);
  await repository.recalculateUserStats(id);
  const user = await repository.getUserById(id);
  if (!user) {
    return res.status(404).json({ error: 'ไม่พบผู้ใช้' });
  }
  res.json({
    user_id: id,
    show_up_rate: user.show_up_rate || 100,
    checked_in_count: user.attended_count || 0,
    registered_count: user.registered_count || 0,
    formula: 'Checked-in Users / Registered Users * 100',
  });
});

// ================= Notifications API =================

app.get('/api/notifications', async (req, res) => {
  const userId = req.query.user_id ? parseInt(req.query.user_id as string) : 1;
  const userNotifs = await repository.getUserNotifications(userId);
  res.json(userNotifs);
});

app.post('/api/notifications/:id/read', async (req, res) => {
  await repository.markNotificationRead(req.params.id);
  res.json({ success: true });
});

app.post('/api/notifications/read-all', async (req, res) => {
  const userId = req.body.user_id ? parseInt(req.body.user_id) : 1;
  await repository.markAllNotificationsRead(userId);
  res.json({ success: true });
});

// ================= Activities API =================

app.get('/api/activities', async (req, res) => {
  const { search, category, status } = req.query;
  const result = await repository.getAllActivities({
    search: typeof search === 'string' ? search : undefined,
    category: typeof category === 'string' ? category : undefined,
    status: typeof status === 'string' ? status : undefined,
  });
  res.json(result);
});

app.get('/api/activities/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const activity = await repository.getActivityById(id);
  if (!activity) {
    return res.status(404).json({ error: 'ไม่พบกิจกรรมนี้' });
  }
  res.json(activity);
});

app.post('/api/activities', async (req, res) => {
  const {
    title,
    description,
    location,
    start_date,
    end_date,
    max_participants,
    organizer_id,
    category,
    tags,
    banner_image,
    required_items,
  } = req.body;

  if (!title || !location || !start_date || !max_participants) {
    return res.status(400).json({ error: 'กรุณากรอกข้อมูลกิจกรรมให้ครบถ้วน' });
  }

  // Validate start date is not in the past
  const startTime = new Date(start_date).getTime();
  const nowTime = Date.now() - 5 * 60 * 1000; // 5-minute leeway for clock drift
  if (startTime < nowTime) {
    return res.status(400).json({ error: 'ไม่สามารถเลือกวันและเวลาในอดีตได้ กรุณาระบุวันและเวลาในอนาคต' });
  }

  if (end_date) {
    const endTime = new Date(end_date).getTime();
    if (endTime <= startTime) {
      return res.status(400).json({ error: 'วันและเวลาสิ้นสุดกิจกรรมต้องอยู่หลังวันและเวลาเริ่มต้น' });
    }
  }

  const organizer = await repository.getUserById(organizer_id || 1);

  const newActivity = await repository.createActivity({
    title,
    description: description || '',
    location,
    start_date,
    end_date: end_date || start_date,
    max_participants: parseInt(max_participants),
    organizer_id: organizer ? organizer.id : 1,
    organizer_name: organizer ? organizer.name : 'ผู้จัดกิจกรรมมหาวิทยาลัย',
    organizer_faculty: organizer?.faculty,
    category: category || 'Technology & Academic',
    tags: Array.isArray(tags) ? tags : ['กิจกรรมนิสิต', 'มหาวิทยาลัย'],
    banner_image,
    required_items,
  });

  res.status(201).json(newActivity);
});

// Update Activity (e.g. extending time / adjusting dates)
app.put('/api/activities/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const updated = await repository.updateActivity(id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'ไม่พบกิจกรรมที่ต้องการแก้ไข' });
  }
  res.json(updated);
});

// Delete Activity immediately
app.delete('/api/activities/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const success = await repository.deleteActivity(id);
  res.json({ success, message: 'ลบกิจกรรมเรียบร้อยแล้ว' });
});

// Auto-cleanup interval: check and delete expired activities every 15 seconds
setInterval(async () => {
  try {
    const deletedCount = await repository.cleanupExpiredActivities();
    if (deletedCount > 0) {
      console.log(`[Auto-Cleanup] ลบกิจกรรมที่หมดเวลาแล้ว ${deletedCount} รายการทันที`);
    }
  } catch (err) {
    console.warn('[Auto-Cleanup] Error during expired activities cleanup:', err);
  }
}, 15000);

// ================= Registration / RSVP API =================

app.post('/api/activities/:id/register', async (req, res) => {
  const activityId = parseInt(req.params.id);
  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({ error: 'Missing user_id' });
  }

  const activity = await repository.getActivityById(activityId);
  if (!activity) {
    return res.status(404).json({ error: 'ไม่พบกิจกรรมที่ต้องการลงทะเบียน' });
  }

  const user = await repository.getUserById(user_id);
  if (!user) {
    return res.status(404).json({ error: 'ไม่พบข้อมูลผู้ใช้' });
  }

  // Check duplicate registration
  const existing = await repository.findUserRegistration(activityId, user_id);
  if (existing) {
    return res.status(400).json({
      error: 'คุณได้ลงทะเบียนเข้าร่วมกิจกรรมนี้แล้ว',
      registration: existing,
    });
  }

  const status: 'CONFIRMED' | 'WAITING' = !activity.is_full ? 'CONFIRMED' : 'WAITING';
  const qrToken = crypto.randomUUID();

  const newReg = await repository.createRegistration({
    user_id,
    activity_id: activityId,
    status,
    qr_token: qrToken,
  });

  // Add notification
  await repository.createNotification({
    id: `notif-${Date.now()}`,
    user_id,
    title: status === 'CONFIRMED' ? 'การลงทะเบียนได้รับการยืนยัน' : 'คุณอยู่ใน Waiting List',
    message:
      status === 'CONFIRMED'
        ? `คุณได้รับการยืนยันที่นั่งในกิจกรรม "${activity.title}" เรียบร้อยแล้ว แสดง QR Code หน้างานเพื่อเช็คอิน`
        : `คุณอยู่ในคิวรอ (Waiting List) สำหรับกิจกรรม "${activity.title}" ระบบจะแจ้งเตือนทันทีเมื่อมีที่นั่งว่าง`,
    type: status === 'CONFIRMED' ? 'registration_confirmed' : 'general',
    activity_id: activityId,
  });

  const freshActivity = await repository.getActivityById(activityId);

  res.status(201).json({
    message: status === 'CONFIRMED' ? 'ลงทะเบียนเข้าร่วมสำเร็จ' : 'กิจกรรมเต็มแล้ว คุณอยู่ใน Waiting List ลำดับถัดไป',
    registration: {
      ...newReg,
      user: sanitizeUser(user),
      activity: freshActivity,
    },
    status,
  });
});

app.post('/api/activities/:id/cancel', async (req, res) => {
  const activityId = parseInt(req.params.id);
  const { user_id } = req.body;

  const activity = await repository.getActivityById(activityId);
  const { cancelledReg, promotedReg } = await repository.cancelRegistration(activityId, user_id);

  if (!cancelledReg) {
    return res.status(404).json({ error: 'ไม่พบการลงทะเบียนในกิจกรรมนี้' });
  }

  // If a waiting user was promoted, notify them
  if (promotedReg) {
    await repository.createNotification({
      id: `notif-${Date.now()}`,
      user_id: promotedReg.user_id,
      title: 'คุณได้รับการเลื่อนสิทธิ์เป็นผู้เข้าร่วมจริง',
      message: `มีผู้สละสิทธิ์ในกิจกรรม "${activity?.title || ''}" คุณได้รับการเลื่อนสิทธิ์ยืนยันที่นั่งเรียบร้อยแล้ว`,
      type: 'waitlist_promoted',
      activity_id: activityId,
    });
  }

  res.json({
    message: 'ยกเลิกการลงทะเบียนเรียบร้อยแล้ว',
    promoted_user_id: promotedReg?.user_id || null,
  });
});

app.get('/api/activities/:id/participants', async (req, res) => {
  const activityId = parseInt(req.params.id);
  const participants = await repository.getRegistrationsByActivity(activityId);
  res.json(participants.map((p) => ({
    ...p,
    user: p.user ? sanitizeUser(p.user) : undefined,
  })));
});

app.get('/api/users/:id/registrations', async (req, res) => {
  const userId = parseInt(req.params.id);
  const userRegs = await repository.getRegistrationsByUser(userId);
  res.json(userRegs.map((p) => ({
    ...p,
    user: p.user ? sanitizeUser(p.user) : undefined,
  })));
});

// ================= QR Check-in API =================

app.post('/api/registrations/check-in', async (req, res) => {
  const { qr_token, registration_id } = req.body;

  let reg: Registration | null = null;
  if (qr_token) {
    reg = await repository.getRegistrationByToken(qr_token);
  } else if (registration_id) {
    reg = await repository.getRegistrationById(parseInt(registration_id));
  }

  if (!reg) {
    return res.status(404).json({
      error: 'ไม่พบข้อมูลการลงทะเบียนหรือ QR Token ไม่ถูกต้อง',
      valid: false,
    });
  }

  const activity = await repository.getActivityById(reg.activity_id);
  const user = await repository.getUserById(reg.user_id);

  if (reg.status === 'WAITING') {
    return res.status(400).json({
      error: 'ผู้ใช้นี้อยู่ในรายชื่อ Waiting List ยังไม่ได้รับการยืนยันที่นั่ง',
      valid: false,
      user: user ? sanitizeUser(user) : undefined,
      activity,
    });
  }

  if (reg.checked_in_at) {
    return res.json({
      message: 'ผู้เข้าร่วมนี้ได้ทำการ Check-in ไปเรียบร้อยแล้ว',
      already_checked_in: true,
      valid: true,
      registration: reg,
      user: user ? sanitizeUser(user) : undefined,
      activity,
      checked_in_at: reg.checked_in_at,
    });
  }

  // Perform Check-in in database
  const updatedReg = (await repository.checkIn(reg.id)) || reg;
  await repository.recalculateUserStats(reg.user_id);
  const freshUser = (await repository.getUserById(reg.user_id)) || user;

  // Send check-in notification
  await repository.createNotification({
    id: `notif-${Date.now()}`,
    user_id: reg.user_id,
    title: 'เช็คอินเข้าร่วมกิจกรรมสำเร็จ',
    message: `คุณได้ทำการเช็คอินในกิจกรรม "${activity?.title || ''}" เรียบร้อยแล้ว Show-up Rate ปัจจุบัน: ${freshUser?.show_up_rate || 100}%`,
    type: 'checked_in',
    activity_id: reg.activity_id,
  });

  res.json({
    message: 'Check-in สำเร็จเรียบร้อย',
    valid: true,
    already_checked_in: false,
    registration: updatedReg,
    user: freshUser ? sanitizeUser(freshUser) : undefined,
    activity,
    checked_in_at: updatedReg.checked_in_at,
    user_show_up_rate: freshUser?.show_up_rate || 100,
  });
});

// ================= Dashboard Analytics API =================

app.get('/api/activities/:id/dashboard', async (req, res) => {
  const activityId = parseInt(req.params.id);
  const activity = await repository.getActivityById(activityId);
  if (!activity) {
    return res.status(404).json({ error: 'ไม่พบกิจกรรม' });
  }

  const actRegs = await repository.getRegistrationsByActivity(activityId);
  const confirmed = actRegs.filter((r) => r.status === 'CONFIRMED');
  const checkedIn = confirmed.filter((r) => r.checked_in_at !== null);
  const waiting = actRegs.filter((r) => r.status === 'WAITING');

  const showUpRate = confirmed.length > 0
    ? Math.round((checkedIn.length / confirmed.length) * 100)
    : 0;

  const dashboard: ActivityDashboard = {
    activity,
    total_registered: actRegs.length,
    confirmed_count: confirmed.length,
    checked_in_count: checkedIn.length,
    waiting_count: waiting.length,
    show_up_rate: showUpRate,
    participants: actRegs.map((r) => ({
      ...r,
      user: r.user ? sanitizeUser(r.user) : undefined,
    })),
  };

  res.json(dashboard);
});

// ================= Database Management API =================

app.get('/api/db/stats', (req, res) => {
  try {
    const stats = dbService.getDatabaseStats();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/db/tables/:table', (req, res) => {
  try {
    const rows = dbService.getTableRows(req.params.table);
    res.json(rows);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/db/query', (req, res) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'SQL query required' });
    const results = dbService.executeCustomQuery(query);
    res.json({ results, count: results.length });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/db/reset', (req, res) => {
  try {
    const result = dbService.resetDatabaseToSeed();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Reset demo endpoint
app.post('/api/reset-demo', (req, res) => {
  dbService.resetDatabaseToSeed();
  res.json({ message: 'Demo data reset in SQLite database successfully' });
});

// ================= AI Activity Assistant =================

app.post('/api/ai/ask', async (req, res) => {
  const { question, user_id, current_activity_id } = req.body;

  if (!question) {
    return res.status(400).json({ error: 'Question is required' });
  }

  const currentUser = user_id ? await repository.getUserById(user_id) : null;
  const currentAct = current_activity_id ? await repository.getActivityById(current_activity_id) : null;
  const allActs = await repository.getAllActivities();

  const activitySummary = allActs.map((a) => {
    return `- [ID:${a.id}] ${a.title} (หมวดหมู่: ${a.category})
      สถานที่: ${a.location}
      วันเวลา: ${a.start_date} ถึง ${a.end_date}
      ที่นั่ง: ว่าง ${Math.max(0, a.max_participants - a.current_confirmed)} / ${a.max_participants} (Waiting list: ${a.current_waiting})
      ผู้จัด: ${a.organizer_name} (${a.organizer_faculty || ''})
      รายละเอียด: ${a.description}
      สิ่งที่ต้องเตรียม: ${a.required_items || 'ไม่มี'}`;
  }).join('\n\n');

  const systemInstruction = `คุณคือ AI Activity Assistant ประจำระบบจัดการกิจกรรมมหาวิทยาลัย (Campus Activity Platform)
กฎระเบียบสำคัญที่สุด: ห้ามใช้อิโมจิเด็ดขาดในคำตอบทุกกรณี (DO NOT USE ANY EMOJIS UNDER ANY CIRCUMSTANCES)
ตอบคำถามด้วยภาษาไทยที่สุภาพ ชัดเจน กระชับ เป็นทางการและอ่านง่าย

ข้อมูลกิจกรรมล่าสุดในมหาวิทยาลัย (จากฐานข้อมูลหลังบ้าน):
${activitySummary}

ข้อมูลผู้ใช้ปัจจุบัน:
- ชื่อ: ${currentUser?.name || 'นิสิต'}
- คณะ: ${currentUser?.faculty || 'มหาวิทยาลัย'}
- Show-up Rate: ${currentUser?.show_up_rate || 90}%

${currentAct ? `กิจกรรมที่เปิดดูอยู่: "${currentAct.title}" ที่ ${currentAct.location} เวลา ${currentAct.start_date}` : ''}

ภารกิจ:
1. ตอบคำถามเกี่ยวกับกิจกรรมอย่างตรงไปตรงมา เช่น สถานที่จัด, สิ่งที่ต้องเตรียม, เวลาเริ่ม, คุณสมบัติผู้เข้าร่วม, ที่นั่งคงเหลือ
2. แนะนำกิจกรรมที่เหมาะสมตามความสนใจหรือคณะ
3. แนะนำการเตรียม QR Code เพื่อสแกนเช็คอินหน้างาน และการรักษา Show-up Rate`;

  // 1. Try Custom KKU / UP AI Gateway first
  if (KKU_AI_BASE_URL && KKU_AI_API_KEY) {
    try {
      const response = await fetch(`${KKU_AI_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${KKU_AI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gemini-3.8-flash',
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: question },
          ],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        let reply = data.choices?.[0]?.message?.content || '';
        reply = stripEmojis(reply);
        return res.json({ answer: reply });
      }
    } catch (kkuErr) {
      console.warn('KKU AI Gateway request failed, trying fallback:', kkuErr);
    }
  }

  // 2. Try GoogleGenAI fallback
  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: question,
        config: {
          systemInstruction,
        },
      });

      let reply = response.text || 'ขออภัย ไม่สามารถสร้างคำตอบได้ในขณะนี้';
      reply = stripEmojis(reply);
      return res.json({ answer: reply });
    } catch (err: any) {
      console.error('Gemini fallback Error:', err);
    }
  }

  // 3. Clean fallback
  const fallback = generateSmartFallbackClean(question, allActs, currentAct);
  return res.json({ answer: fallback });
});

function stripEmojis(text: string): string {
  return text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2300}-\u{23FF}]/gu, '');
}

function generateSmartFallbackClean(q: string, actList: Activity[], currentAct: Activity | null | undefined): string {
  const query = q.toLowerCase();
  
  if (currentAct) {
    if (query.includes('จัดที่ไหน') || query.includes('สถานที่') || query.includes('location')) {
      return `กิจกรรม "${currentAct.title}" จัดที่:\n${currentAct.location}\nเวลาเริ่ม: ${new Date(currentAct.start_date).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น. เป็นต้นไป กรุณาเดินทางมาถึงก่อนเวลาประมาณ 10 นาทีเพื่อแสดง QR Code สำหรับเช็คอินหน้างาน`;
    }
    if (query.includes('เตรียม') || query.includes('อุปกรณ์') || query.includes('อะไรบ้าง')) {
      return `สิ่งที่ต้องเตรียมสำหรับ "${currentAct.title}":\n- ${currentAct.required_items || 'บัตรประจำตัวนักศึกษา'}\n- QR Token ในหน้า "ตั๋วของฉัน" เพื่อนำไปแสดงต่อผู้จัด ณ จุดลงทะเบียน`;
    }
    if (query.includes('กี่โมง') || query.includes('เริ่ม') || query.includes('เวลา')) {
      return `วันและเวลากิจกรรม "${currentAct.title}":\nเริ่ม: ${new Date(currentAct.start_date).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}\nสิ้นสุด: ${new Date(currentAct.end_date).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}`;
    }
    if (query.includes('เหมาะ') || query.includes('ใคร')) {
      return `กิจกรรม "${currentAct.title}" เหมาะสำหรับนิสิตทุกชั้นปีที่สนใจในหมวดหมู่ ${currentAct.category} และต้องการพัฒนาทักษะหรือพบปะเพื่อนใหม่`;
    }
  }

  if (query.includes('แนะนำ') || query.includes('ว่าง') || query.includes('กิจกรรม')) {
    const available = actList.filter((a) => !a.is_full);
    const names = available.map((a) => `- ${a.title} (${a.category}) ว่างอีก ${a.max_participants - a.current_confirmed} ที่นั่ง`).join('\n');
    return `กิจกรรมที่ยังมีที่นั่งว่างในขณะนี้:\n\n${names}\n\nคุณสามารถกดดูรายละเอียดและลงทะเบียนยืนยันสิทธิ์ได้ทันทีในหน้ารายการกิจกรรม`;
  }

  return `สวัสดีครับ ผมคือผู้ช่วยกิจกรรมนักศึกษา (Campus Activity Assistant)\n\nสามารถสอบถามข้อมูลกิจกรรมในมหาวิทยาลัย เช่น:\n- สถานที่จัดกิจกรรมและการเดินทาง\n- สิ่งที่ต้องจัดเตรียมมาในวันงาน\n- กำหนดการและเวลาเริ่ม-สิ้นสุด\n- กิจกรรมที่เปิดรับสมัครและที่นั่งคงเหลือ`;
}

// Setup Vite middleware in dev or static files in production
async function startServer() {
  // Global Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('[Server Error]', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err?.message || 'Internal Server Error' });
    }
  });

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Campus Activity Platform SQLite Server is running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
