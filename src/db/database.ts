import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Activity, AppNotification, Registration, User } from '../types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database file path
const DB_PATH = path.resolve(process.cwd(), 'campus_activity.db');

export const db = new DatabaseSync(DB_PATH);

// Initialize Tables
export function initDatabase() {
  // Foreign keys enabled
  db.exec('PRAGMA foreign_keys = ON;');

  // 1. Users table (matching specification)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      faculty TEXT NOT NULL,
      student_id TEXT,
      profile_image TEXT DEFAULT '',
      university_verified INTEGER DEFAULT 0,
      show_up_rate INTEGER DEFAULT 100,
      attended_count INTEGER DEFAULT 0,
      registered_count INTEGER DEFAULT 0,
      role TEXT DEFAULT 'student'
    );
  `);

  // 2. Activities table (matching specification)
  db.exec(`
    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      location TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      max_participants INTEGER NOT NULL,
      organizer_id INTEGER NOT NULL,
      organizer_name TEXT NOT NULL,
      organizer_faculty TEXT,
      category TEXT NOT NULL,
      tags TEXT,
      banner_image TEXT,
      required_items TEXT,
      status TEXT DEFAULT 'UPCOMING',
      FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // 3. Registrations table (matching specification)
  db.exec(`
    CREATE TABLE IF NOT EXISTS registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      activity_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      qr_token TEXT UNIQUE NOT NULL,
      checked_in_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE
    );
  `);

  // 4. Notifications table
  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL,
      read INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      activity_id INTEGER,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Seed default data if empty
  seedDatabaseIfEmpty();
}

function seedDatabaseIfEmpty() {
  const userCount = (db.prepare('SELECT count(*) as count FROM users').get() as { count: number }).count;
  if (userCount > 0) return;

  // Insert Default Users
  const insertUser = db.prepare(`
    INSERT INTO users (id, name, email, password, faculty, student_id, profile_image, university_verified, show_up_rate, attended_count, registered_count, role)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertUser.run(1, 'นายพีรพัฒน์ วงศ์สว่าง', 'student@up.ac.th', 'password123', 'คณะเทคโนโลยีสารสนเทศและการสื่อสาร (ICT)', '66020101', '', 1, 90, 9, 10, 'student');
  insertUser.run(2, 'น.ส.กานต์พิชชา รัตนคุณ', 'kanpicha.r@up.ac.th', 'password123', 'คณะวิศวกรรมศาสตร์', '66030214', '', 1, 100, 6, 6, 'student');
  insertUser.run(3, 'ดร.สมชาย นพคุณ (สโมสรนักศึกษา)', 'somchai.n@up.ac.th', 'password123', 'คณะเทคโนโลยีสารสนเทศและการสื่อสาร (ICT)', 'STAFF-009', '', 1, 98, 24, 24, 'organizer');

  // Insert Default Activities
  const insertActivity = db.prepare(`
    INSERT INTO activities (id, title, description, location, start_date, end_date, max_participants, organizer_id, organizer_name, organizer_faculty, category, tags, banner_image, required_items, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertActivity.run(
    1,
    'ฟุตบอล 5 คน มินิลีกหลังเลิกเรียน',
    'แข่งขันฟุตซอล 5 คน เพื่อสุขภาพและสร้างเครือข่ายนักศึกษา แบ่งสายแข่งขันกระชับมิตร มีน้ำดื่มและอุปกรณ์ปฐมพยาบาลพร้อม',
    'สนามฟุตซอลในร่ม อาคารศูนย์กีฬา มหาวิทยาลัย',
    '2026-10-06T17:00:00',
    '2026-10-06T20:00:00',
    10,
    3,
    'ชมรมฟุตซอลและกีฬามหาวิทยาลัย',
    'คณะเทคโนโลยีสารสนเทศและการสื่อสาร (ICT)',
    'Sports & Fitness',
    JSON.stringify(['ฟุตซอล', 'ออกกำลังกาย', 'สร้างมิตรภาพ']),
    'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&auto=format&fit=crop&q=80',
    'รองเท้าผ้าใบหรือรองเท้าฟุตซอล, ชุดออกกำลังกาย, กระบอกน้ำส่วนตัว',
    'UPCOMING'
  );

  insertActivity.run(
    2,
    'AI Campus Hackathon 2026: พัฒนาแอปพลิเคชันระดับมหาวิทยาลัย',
    'แข่งขันระดมไอเดียและสร้างโปรโตไทป์ AI ภายใน 24 ชั่วโมง พร้อมที่ปรึกษาจากสายงานเทคโนโลยี มีอาหารและเครื่องดื่มตลอดงาน พร้อมใบประกาศนียบัตร',
    'ห้อง Co-Working & Conference Hall ชั้น 4 คณะ ICT',
    '2026-10-10T09:00:00',
    '2026-10-11T16:00:00',
    24,
    3,
    'สโมสรนิสิตคณะ ICT',
    'คณะเทคโนโลยีสารสนเทศและการสื่อสาร (ICT)',
    'Technology & Academic',
    JSON.stringify(['AI', 'Hackathon', 'Coding', 'ทักษะวิชาการ']),
    'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&auto=format&fit=crop&q=80',
    'คอมพิวเตอร์พกพาส่วนตัว, ปลั๊กพ่วง, บัตรประจำตัวนักศึกษา',
    'UPCOMING'
  );

  insertActivity.run(
    3,
    'Workshop: ออกแบบ UI/UX ด้วย Figma สำหรับนิสิต',
    'เรียนรู้หลักการออกแบบโมบายล์แอปและเว็บไซต์ตั้งแต่พื้นฐานจนถึง Design System พร้อมสร้างผลงานจริงลงแฟ้มสะสมงาน',
    'ห้องปฏิบัติการคอมพิวเตอร์ Lab 3 อาคารเทคโนโลยีสารสนเทศ',
    '2026-10-08T13:30:00',
    '2026-10-08T16:30:00',
    15,
    3,
    'ชมรม Digital Design',
    'คณะเทคโนโลยีสารสนเทศและการสื่อสาร (ICT)',
    'Technology & Academic',
    JSON.stringify(['Figma', 'UI/UX', 'Portfolio']),
    'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=800&auto=format&fit=crop&q=80',
    'ติดตั้ง Figma ล่วงหน้า, คอมพิวเตอร์พกพา, เมาส์',
    'UPCOMING'
  );

  insertActivity.run(
    4,
    'ค่ายจิตอาสาพัฒนาโรงเรียนชุมชน ครั้งที่ 8',
    'ร่วมทาสีอาคารเรียน ปรับปรุงห้องสมุด และจัดกิจกรรมเสริมทักษะแก่นักเรียนในโรงเรียนรอบมหาวิทยาลัย สะสมชั่วโมงจิตอาสา กยศ. ได้ 16 ชั่วโมง',
    'จุดรวมพล ลานหน้าหอประชุมใหญ่ (เดินทางโดยรถของมหาวิทยาลัย)',
    '2026-10-17T06:30:00',
    '2026-10-18T18:00:00',
    30,
    3,
    'ชมรมอาสาพัฒนาชนบท',
    'คณะมนุษยศาสตร์และสังคมศาสตร์',
    'Volunteer & Social',
    JSON.stringify(['จิตอาสา', 'กยศ', 'ช่วยเหลือสังคม', 'ชั่วโมงกิจกรรม']),
    'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800&auto=format&fit=crop&q=80',
    'ชุดทะมัดทะแมง, หมวกกันแดด, ยารักษาโรคประจำตัว',
    'UPCOMING'
  );

  insertActivity.run(
    5,
    'Board Game และกิจกรรมเชื่อมสัมพันธ์นักศึกษา',
    'พบปะเพื่อนใหม่ต่างคณะด้วยบอร์ดเกมเสริมทักษะตรรกะและการวางแผน',
    'Student Lounge ชั้น 1 อาคารเรียนรวม 2',
    '2026-10-09T17:30:00',
    '2026-10-09T20:30:00',
    16,
    3,
    'ชมรม Board Games & Logic',
    'คณะวิทยาศาสตร์',
    'Arts & Culture',
    JSON.stringify(['บอร์ดเกม', 'สังสรรค์', 'Networking']),
    'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=800&auto=format&fit=crop&q=80',
    'บัตรประจำตัวนักศึกษา',
    'UPCOMING'
  );

  // Insert Default Registrations
  const insertReg = db.prepare(`
    INSERT INTO registrations (id, user_id, activity_id, status, qr_token, checked_in_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertReg.run(1, 1, 1, 'CONFIRMED', '550e8400-e29b-41d4-a716-446655440001', null, '2026-10-01T10:15:00Z');
  insertReg.run(2, 2, 1, 'CONFIRMED', '550e8400-e29b-41d4-a716-446655440002', '2026-10-06T16:55:00Z', '2026-10-01T10:20:00Z');
  insertReg.run(3, 1, 2, 'CONFIRMED', '550e8400-e29b-41d4-a716-446655440003', null, '2026-10-02T08:00:00Z');
  insertReg.run(4, 1, 4, 'CONFIRMED', '550e8400-e29b-41d4-a716-446655440007', null, '2026-10-03T16:00:00Z');

  // Insert Default Notifications
  const insertNotif = db.prepare(`
    INSERT INTO notifications (id, user_id, title, message, type, read, created_at, activity_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertNotif.run(
    'notif-1',
    1,
    'การลงทะเบียนได้รับการยืนยัน',
    'คุณได้รับการยืนยันที่นั่งในกิจกรรม "ฟุตบอล 5 คน มินิลีกหลังเลิกเรียน" พร้อมรับ QR Token สำหรับเช็คอินหน้างาน',
    'registration_confirmed',
    0,
    new Date(Date.now() - 3600000 * 2).toISOString(),
    1
  );

  insertNotif.run(
    'notif-2',
    1,
    'แจ้งเตือนกิจกรรมใกล้ถึงกำหนด',
    'กิจกรรม "ฟุตบอล 5 คน มินิลีกหลังเลิกเรียน" จะเริ่มในวันที่ 6 ต.ค. เวลา 17:00 น. กรุณาเตรียม QR Code แสดงต่อผู้จัด',
    'event_reminder',
    0,
    new Date(Date.now() - 3600000 * 8).toISOString(),
    1
  );

  insertNotif.run(
    'notif-3',
    1,
    'ยินดีต้อนรับสู่ระบบ',
    'ระบบฐานข้อมูล SQLite พร้อมใช้งาน ข้อมูลทั้งหมดถูกจัดเก็บและสืบค้นอย่างถูกต้องตามมาตรฐาน',
    'general',
    1,
    new Date(Date.now() - 86400000).toISOString(),
    null
  );
}

// ================= CRUD Query Operations =================

export const dbService = {
  // Users
  async getAllUsers(): Promise<User[]> {
    const rows = db.prepare('SELECT * FROM users ORDER BY id ASC').all() as any[];
    return rows.map((r) => ({
      ...r,
      university_verified: Boolean(r.university_verified),
    }));
  },

  async getUserById(id: number): Promise<User | null> {
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
    if (!row) return null;
    return {
      ...row,
      university_verified: Boolean(row.university_verified),
    };
  },

  async getUserByEmailOrStudentId(identifier: string): Promise<User | null> {
    const clean = identifier.trim().toLowerCase();
    const row = db.prepare(`
      SELECT * FROM users 
      WHERE LOWER(email) = ? OR LOWER(student_id) = ?
      LIMIT 1
    `).get(clean, clean) as any;
    if (!row) return null;
    return {
      ...row,
      university_verified: Boolean(row.university_verified),
    };
  },

  async createUser(data: {
    name: string;
    email: string;
    password: string;
    faculty: string;
    student_id?: string;
    role?: 'student' | 'organizer';
    profile_image?: string;
    university_verified?: boolean;
  }): Promise<User> {
    const stmt = db.prepare(`
      INSERT INTO users (name, email, password, faculty, student_id, role, profile_image, university_verified, show_up_rate, attended_count, registered_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 100, 0, 0)
    `);

    const result = stmt.run(
      data.name,
      data.email.toLowerCase(),
      data.password,
      data.faculty,
      data.student_id || null,
      data.role || 'student',
      data.profile_image || '',
      data.university_verified ? 1 : 0
    );

    const created = await this.getUserById(Number(result.lastInsertRowid));
    return created!;
  },

  async updateUser(id: number, data: Partial<User>): Promise<User | null> {
    const existing = await this.getUserById(id);
    if (!existing) return null;

    const fields: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.faculty !== undefined) { fields.push('faculty = ?'); values.push(data.faculty); }
    if (data.student_id !== undefined) { fields.push('student_id = ?'); values.push(data.student_id); }
    if (data.profile_image !== undefined) { fields.push('profile_image = ?'); values.push(data.profile_image); }
    if (data.role !== undefined) { fields.push('role = ?'); values.push(data.role); }
    if (data.show_up_rate !== undefined) { fields.push('show_up_rate = ?'); values.push(data.show_up_rate); }
    if (data.attended_count !== undefined) { fields.push('attended_count = ?'); values.push(data.attended_count); }
    if (data.registered_count !== undefined) { fields.push('registered_count = ?'); values.push(data.registered_count); }

    if (fields.length > 0) {
      values.push(id);
      db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    }

    return this.getUserById(id);
  },

  // Activities
  async getAllActivities(params?: { search?: string; category?: string; status?: string }): Promise<Activity[]> {
    let sql = 'SELECT * FROM activities WHERE 1=1';
    const values: any[] = [];

    if (params?.category && params.category !== 'All') {
      sql += ' AND category = ?';
      values.push(params.category);
    }

    if (params?.status) {
      sql += ' AND status = ?';
      values.push(params.status);
    }

    if (params?.search) {
      const q = `%${params.search.toLowerCase()}%`;
      sql += ' AND (LOWER(title) LIKE ? OR LOWER(description) LIKE ? OR LOWER(location) LIKE ?)';
      values.push(q, q, q);
    }

    sql += ' ORDER BY id DESC';

    const rows = db.prepare(sql).all(...values) as any[];

    // Enrich with current confirmed and waiting counts
    return rows.map((r) => {
      const confirmed = (db.prepare(`
        SELECT count(*) as count FROM registrations 
        WHERE activity_id = ? AND status = 'CONFIRMED'
      `).get(r.id) as { count: number }).count;

      const waiting = (db.prepare(`
        SELECT count(*) as count FROM registrations 
        WHERE activity_id = ? AND status = 'WAITING'
      `).get(r.id) as { count: number }).count;

      let tags: string[] = [];
      try {
        tags = r.tags ? JSON.parse(r.tags) : [];
      } catch {
        tags = [];
      }

      return {
        ...r,
        tags,
        current_confirmed: confirmed,
        current_waiting: waiting,
        is_full: confirmed >= r.max_participants,
      };
    });
  },

  async getActivityById(id: number): Promise<Activity | null> {
    const row = db.prepare('SELECT * FROM activities WHERE id = ?').get(id) as any;
    if (!row) return null;

    const confirmed = (db.prepare(`
      SELECT count(*) as count FROM registrations 
      WHERE activity_id = ? AND status = 'CONFIRMED'
    `).get(id) as { count: number }).count;

    const waiting = (db.prepare(`
      SELECT count(*) as count FROM registrations 
      WHERE activity_id = ? AND status = 'WAITING'
    `).get(id) as { count: number }).count;

    let tags: string[] = [];
    try {
      tags = row.tags ? JSON.parse(row.tags) : [];
    } catch {
      tags = [];
    }

    return {
      ...row,
      tags,
      current_confirmed: confirmed,
      current_waiting: waiting,
      is_full: confirmed >= row.max_participants,
    };
  },

  async createActivity(data: {
    title: string;
    description?: string;
    location: string;
    start_date: string;
    end_date: string;
    max_participants: number;
    organizer_id: number;
    organizer_name: string;
    organizer_faculty?: string;
    category: string;
    tags?: string[];
    banner_image?: string;
    required_items?: string;
  }): Promise<Activity> {
    const stmt = db.prepare(`
      INSERT INTO activities (title, description, location, start_date, end_date, max_participants, organizer_id, organizer_name, organizer_faculty, category, tags, banner_image, required_items, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'UPCOMING')
    `);

    const result = stmt.run(
      data.title,
      data.description || '',
      data.location,
      data.start_date,
      data.end_date,
      data.max_participants,
      data.organizer_id,
      data.organizer_name,
      data.organizer_faculty || '',
      data.category,
      JSON.stringify(data.tags || []),
      data.banner_image || '',
      data.required_items || ''
    );

    const created = await this.getActivityById(Number(result.lastInsertRowid));
    return created!;
  },

  async updateActivity(id: number, data: Partial<Activity>): Promise<Activity | null> {
    const existing = await this.getActivityById(id);
    if (!existing) return null;

    const fields: string[] = [];
    const values: any[] = [];

    if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
    if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
    if (data.location !== undefined) { fields.push('location = ?'); values.push(data.location); }
    if (data.start_date !== undefined) { fields.push('start_date = ?'); values.push(data.start_date); }
    if (data.end_date !== undefined) { fields.push('end_date = ?'); values.push(data.end_date); }
    if (data.max_participants !== undefined) { fields.push('max_participants = ?'); values.push(data.max_participants); }
    if (data.category !== undefined) { fields.push('category = ?'); values.push(data.category); }
    if (data.tags !== undefined) { fields.push('tags = ?'); values.push(JSON.stringify(data.tags)); }
    if (data.banner_image !== undefined) { fields.push('banner_image = ?'); values.push(data.banner_image); }
    if (data.required_items !== undefined) { fields.push('required_items = ?'); values.push(data.required_items); }
    if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }

    if (fields.length > 0) {
      values.push(id);
      db.prepare(`UPDATE activities SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    }
    return this.getActivityById(id);
  },

  async deleteActivity(id: number): Promise<boolean> {
    try {
      db.prepare('DELETE FROM registrations WHERE activity_id = ?').run(id);
      db.prepare('DELETE FROM notifications WHERE activity_id = ?').run(id);
      db.prepare('DELETE FROM activities WHERE id = ?').run(id);
      return true;
    } catch (err) {
      console.error('[SQLite] deleteActivity error:', err);
      return false;
    }
  },

  async cleanupExpiredActivities(): Promise<number> {
    try {
      const now = new Date();
      const all = db.prepare('SELECT id, end_date FROM activities').all() as { id: number; end_date: string }[];
      let deletedCount = 0;
      for (const act of all) {
        if (act.end_date) {
          const endTime = new Date(act.end_date).getTime();
          if (!isNaN(endTime) && endTime <= now.getTime()) {
            await this.deleteActivity(act.id);
            deletedCount++;
          }
        }
      }
      return deletedCount;
    } catch (err) {
      console.error('[SQLite] cleanupExpiredActivities error:', err);
      return 0;
    }
  },

  // Registrations
  async getRegistrationsByActivity(activityId: number): Promise<Registration[]> {
    const rows = db.prepare(`
      SELECT * FROM registrations 
      WHERE activity_id = ? AND status != 'CANCELLED'
      ORDER BY id ASC
    `).all(activityId) as any[];

    const result: Registration[] = [];
    for (const r of rows) {
      const user = await this.getUserById(r.user_id);
      result.push({
        ...r,
        user: user || undefined,
      });
    }
    return result;
  },

  async getRegistrationsByUser(userId: number): Promise<Registration[]> {
    const rows = db.prepare(`
      SELECT * FROM registrations 
      WHERE user_id = ? AND status != 'CANCELLED'
      ORDER BY id DESC
    `).all(userId) as any[];

    const result: Registration[] = [];
    for (const r of rows) {
      const activity = await this.getActivityById(r.activity_id);
      const user = await this.getUserById(r.user_id);
      result.push({
        ...r,
        activity: activity || undefined,
        user: user || undefined,
      });
    }
    return result;
  },

  async getRegistrationByToken(token: string): Promise<Registration | null> {
    const row = db.prepare(`
      SELECT * FROM registrations WHERE qr_token = ? AND status != 'CANCELLED' LIMIT 1
    `).get(token) as any;
    if (!row) return null;
    return {
      ...row,
      activity: (await this.getActivityById(row.activity_id)) || undefined,
      user: (await this.getUserById(row.user_id)) || undefined,
    };
  },

  async getRegistrationById(id: number): Promise<Registration | null> {
    const row = db.prepare(`
      SELECT * FROM registrations WHERE id = ? AND status != 'CANCELLED' LIMIT 1
    `).get(id) as any;
    if (!row) return null;
    return {
      ...row,
      activity: (await this.getActivityById(row.activity_id)) || undefined,
      user: (await this.getUserById(row.user_id)) || undefined,
    };
  },

  async findUserRegistration(activityId: number, userId: number): Promise<Registration | null> {
    const row = db.prepare(`
      SELECT * FROM registrations 
      WHERE activity_id = ? AND user_id = ? AND status != 'CANCELLED'
      LIMIT 1
    `).get(activityId, userId) as any;
    return row || null;
  },

  async createRegistration(data: {
    user_id: number;
    activity_id: number;
    status: 'CONFIRMED' | 'WAITING';
    qr_token: string;
  }): Promise<Registration> {
    const stmt = db.prepare(`
      INSERT INTO registrations (user_id, activity_id, status, qr_token, checked_in_at, created_at)
      VALUES (?, ?, ?, ?, NULL, ?)
    `);

    const now = new Date().toISOString();
    const result = stmt.run(data.user_id, data.activity_id, data.status, data.qr_token, now);

    await this.recalculateUserStats(data.user_id);
    const created = await this.getRegistrationById(Number(result.lastInsertRowid));
    return created!;
  },

  async cancelRegistration(activityId: number, userId: number): Promise<{
    cancelledReg: Registration | null;
    promotedReg: Registration | null;
  }> {
    const reg = await this.findUserRegistration(activityId, userId);
    if (!reg) return { cancelledReg: null, promotedReg: null };

    const wasConfirmed = reg.status === 'CONFIRMED';
    db.prepare("UPDATE registrations SET status = 'CANCELLED' WHERE id = ?").run(reg.id);

    let promotedReg: Registration | null = null;
    // Auto promote waiting list if confirmed user cancels
    if (wasConfirmed) {
      const nextWaiting = db.prepare(`
        SELECT * FROM registrations 
        WHERE activity_id = ? AND status = 'WAITING'
        ORDER BY id ASC LIMIT 1
      `).get(activityId) as any;

      if (nextWaiting) {
        db.prepare("UPDATE registrations SET status = 'CONFIRMED' WHERE id = ?").run(nextWaiting.id);
        promotedReg = await this.getRegistrationById(nextWaiting.id);
      }
    }

    await this.recalculateUserStats(userId);
    return { cancelledReg: { ...reg, status: 'CANCELLED' }, promotedReg };
  },

  async checkIn(id: number): Promise<Registration | null> {
    const now = new Date().toISOString();
    db.prepare('UPDATE registrations SET checked_in_at = ? WHERE id = ?').run(now, id);
    const reg = await this.getRegistrationById(id);
    if (reg) {
      await this.recalculateUserStats(reg.user_id);
    }
    return reg;
  },

  async recalculateUserStats(userId: number): Promise<void> {
    const confirmedCount = (db.prepare(`
      SELECT count(*) as count FROM registrations 
      WHERE user_id = ? AND status = 'CONFIRMED'
    `).get(userId) as { count: number }).count;

    const checkedInCount = (db.prepare(`
      SELECT count(*) as count FROM registrations 
      WHERE user_id = ? AND status = 'CONFIRMED' AND checked_in_at IS NOT NULL
    `).get(userId) as { count: number }).count;

    const rate = confirmedCount > 0 ? Math.round((checkedInCount / confirmedCount) * 100) : 100;

    db.prepare(`
      UPDATE users 
      SET show_up_rate = ?, attended_count = ?, registered_count = ?
      WHERE id = ?
    `).run(rate, checkedInCount, confirmedCount, userId);
  },

  // Notifications
  async getUserNotifications(userId: number): Promise<AppNotification[]> {
    const rows = db.prepare(`
      SELECT * FROM notifications 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `).all(userId) as any[];

    return rows.map((r) => ({
      ...r,
      read: Boolean(r.read),
    }));
  },

  async createNotification(notif: {
    id: string;
    user_id: number;
    title: string;
    message: string;
    type: string;
    activity_id?: number | null;
  }): Promise<void> {
    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type, read, created_at, activity_id)
      VALUES (?, ?, ?, ?, ?, 0, ?, ?)
    `).run(
      notif.id,
      notif.user_id,
      notif.title,
      notif.message,
      notif.type,
      new Date().toISOString(),
      notif.activity_id || null
    );
  },

  async markNotificationRead(id: string): Promise<void> {
    db.prepare('UPDATE notifications SET read = 1 WHERE id = ?').run(id);
  },

  async markAllNotificationsRead(userId: number): Promise<void> {
    db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(userId);
  },

  // Database Management / Inspector
  getDatabaseStats() {
    const tables = ['users', 'activities', 'registrations', 'notifications'];
    const tableStats = tables.map((tableName) => {
      const count = (db.prepare(`SELECT count(*) as count FROM ${tableName}`).get() as { count: number }).count;
      const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as any[];
      return {
        table_name: tableName,
        row_count: count,
        columns: columns.map((c) => ({
          name: c.name,
          type: c.type,
          pk: Boolean(c.pk),
          notnull: Boolean(c.notnull),
        })),
      };
    });

    return {
      db_type: 'SQLite 3 (Persistent File)',
      db_file: 'campus_activity.db',
      db_path: DB_PATH,
      total_tables: tables.length,
      tables: tableStats,
    };
  },

  getTableRows(tableName: string, limit = 100) {
    const allowed = ['users', 'activities', 'registrations', 'notifications'];
    if (!allowed.includes(tableName)) {
      throw new Error(`Table ${tableName} is not accessible`);
    }

    const rows = db.prepare(`SELECT * FROM ${tableName} ORDER BY id DESC LIMIT ?`).all(limit) as any[];
    // Sanitize passwords if users table
    if (tableName === 'users') {
      return rows.map(({ password, ...rest }) => rest);
    }
    return rows;
  },

  executeCustomQuery(sqlQuery: string) {
    const trimmed = sqlQuery.trim();
    if (!trimmed) throw new Error('SQL query is empty');

    // Only allow SELECT, PRAGMA, or EXPLAIN
    const isSafeSelect = /^(SELECT|PRAGMA|EXPLAIN)\s+/i.test(trimmed);
    if (!isSafeSelect) {
      throw new Error('ระบบอนุญาตเฉพาะคำสั่งอ่านข้อมูล (SELECT, PRAGMA) เพื่อความปลอดภัย');
    }

    const results = db.prepare(trimmed).all();
    return results;
  },

  resetDatabaseToSeed() {
    db.exec(`
      DROP TABLE IF EXISTS notifications;
      DROP TABLE IF EXISTS registrations;
      DROP TABLE IF EXISTS activities;
      DROP TABLE IF EXISTS users;
    `);
    initDatabase();
    return { success: true, message: 'Database reset to initial seed data successfully' };
  },
};
