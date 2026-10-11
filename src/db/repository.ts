import { dbService, initDatabase } from './database';
import { supabaseService, isSupabaseConfigured, supabase } from './supabase';
import type { Activity, AppNotification, Registration, User } from '../types';

// Initialize local SQLite on startup
initDatabase();

// Cache Supabase health / table presence so we don't spam 404s when tables aren't created yet
let supabaseSchemaReady: boolean | null = null;
let lastCheckTime = 0;

async function checkSupabaseReady(): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  const now = Date.now();
  if (supabaseSchemaReady !== null && now - lastCheckTime < 10000) {
    return supabaseSchemaReady;
  }
  try {
    const { error } = await supabase.from('users').select('id').limit(1);
    supabaseSchemaReady = !error;
    lastCheckTime = now;
    return supabaseSchemaReady;
  } catch {
    supabaseSchemaReady = false;
    lastCheckTime = now;
    return false;
  }
}

export const repository = {
  isSupabaseActive(): boolean {
    return isSupabaseConfigured && Boolean(supabaseSchemaReady);
  },

  async getBackendInfo() {
    const supabaseUrl =
      process.env.SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.VITE_SUPABASE_URL ||
      '';
    const maskedUrl = supabaseUrl
      ? supabaseUrl.replace(/^https:\/\/([^.]+)\..*$/, 'https://$1.supabase.co')
      : null;

    const supabaseAlive = await checkSupabaseReady();

    return {
      provider: supabaseAlive ? 'supabase' : 'sqlite',
      isSupabaseConfigured,
      supabaseAlive,
      supabaseUrl: maskedUrl,
      timestamp: new Date().toISOString(),
    };
  },

  // ================= USERS =================
  async getUserByEmailOrStudentId(identifier: string): Promise<User | null> {
    const isReady = await checkSupabaseReady();
    if (isReady) {
      try {
        const user = await supabaseService.getUserByEmailOrStudentId(identifier);
        if (user) return user;
      } catch (err) {
        supabaseSchemaReady = null;
        console.warn('[Repository] Supabase getUserByEmailOrStudentId failed, falling back to SQLite:', err);
      }
    }
    return (await dbService.getUserByEmailOrStudentId(identifier)) || null;
  },

  async getUserById(id: number): Promise<User | null> {
    const isReady = await checkSupabaseReady();
    if (isReady) {
      try {
        const user = await supabaseService.getUserById(id);
        if (user) return user;
      } catch (err) {
        supabaseSchemaReady = null;
        console.warn('[Repository] Supabase getUserById failed, falling back to SQLite:', err);
      }
    }
    return (await dbService.getUserById(id)) || null;
  },

  async getAllUsers(): Promise<User[]> {
    const isReady = await checkSupabaseReady();
    if (isReady) {
      try {
        const users = await supabaseService.getAllUsers();
        if (users.length > 0) return users;
      } catch (err) {
        supabaseSchemaReady = null;
        console.warn('[Repository] Supabase getAllUsers failed, falling back to SQLite:', err);
      }
    }
    return await dbService.getAllUsers();
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
    const isReady = await checkSupabaseReady();
    if (isReady) {
      try {
        return await supabaseService.createUser(data);
      } catch (err) {
        supabaseSchemaReady = null;
        console.warn('[Repository] Supabase createUser failed, falling back to SQLite:', err);
      }
    }
    return await dbService.createUser(data);
  },

  async updateUser(id: number, data: Partial<User>): Promise<User | null> {
    const isReady = await checkSupabaseReady();
    if (isReady) {
      try {
        const updated = await supabaseService.updateUser(id, data);
        if (updated) return updated;
      } catch (err) {
        supabaseSchemaReady = null;
        console.warn('[Repository] Supabase updateUser failed, falling back to SQLite:', err);
      }
    }
    return await dbService.updateUser(id, data);
  },

  async recalculateUserStats(userId: number): Promise<void> {
    const isReady = await checkSupabaseReady();
    if (isReady) {
      try {
        await supabaseService.recalculateUserStats(userId);
        return;
      } catch (err) {
        supabaseSchemaReady = null;
        console.warn('[Repository] Supabase recalculateUserStats failed:', err);
      }
    }
    await dbService.recalculateUserStats(userId);
  },

  // ================= ACTIVITIES =================
  async cleanupExpiredActivities(): Promise<number> {
    let deleted = 0;
    const isReady = await checkSupabaseReady();
    if (isReady) {
      try {
        deleted += await supabaseService.cleanupExpiredActivities();
      } catch (err) {
        console.warn('[Repository] Supabase cleanupExpiredActivities error:', err);
      }
    }
    try {
      deleted += await dbService.cleanupExpiredActivities();
    } catch (err) {
      console.warn('[Repository] SQLite cleanupExpiredActivities error:', err);
    }
    return deleted;
  },

  async getAllActivities(params?: { search?: string; category?: string; status?: string }): Promise<Activity[]> {
    // Automatically delete activities that have passed their expiration / end time
    await this.cleanupExpiredActivities();

    const isReady = await checkSupabaseReady();
    if (isReady) {
      try {
        const activities = await supabaseService.getAllActivities(params);
        if (activities && activities.length > 0) return activities;
      } catch (err) {
        supabaseSchemaReady = null;
        console.warn('[Repository] Supabase getAllActivities failed, falling back to SQLite:', err);
      }
    }
    return await dbService.getAllActivities(params);
  },

  async getActivityById(id: number): Promise<Activity | null> {
    const isReady = await checkSupabaseReady();
    if (isReady) {
      try {
        const activity = await supabaseService.getActivityById(id);
        if (activity) return activity;
      } catch (err) {
        supabaseSchemaReady = null;
        console.warn('[Repository] Supabase getActivityById failed, falling back to SQLite:', err);
      }
    }
    return (await dbService.getActivityById(id)) || null;
  },

  async updateActivity(id: number, data: Partial<Activity>): Promise<Activity | null> {
    const isReady = await checkSupabaseReady();
    if (isReady) {
      try {
        const updated = await supabaseService.updateActivity(id, data);
        if (updated) return updated;
      } catch (err) {
        supabaseSchemaReady = null;
        console.warn('[Repository] Supabase updateActivity failed, falling back to SQLite:', err);
      }
    }
    return await dbService.updateActivity(id, data);
  },

  async deleteActivity(id: number): Promise<boolean> {
    const isReady = await checkSupabaseReady();
    if (isReady) {
      try {
        await supabaseService.deleteActivity(id);
      } catch (err) {
        console.warn('[Repository] Supabase deleteActivity error:', err);
      }
    }
    return await dbService.deleteActivity(id);
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
    const isReady = await checkSupabaseReady();
    if (isReady) {
      try {
        return await supabaseService.createActivity(data);
      } catch (err) {
        supabaseSchemaReady = null;
        console.warn('[Repository] Supabase createActivity failed, falling back to SQLite:', err);
      }
    }
    return await dbService.createActivity(data);
  },

  // ================= REGISTRATIONS =================
  async findUserRegistration(activityId: number, userId: number): Promise<Registration | null> {
    const isReady = await checkSupabaseReady();
    if (isReady) {
      try {
        const reg = await supabaseService.findUserRegistration(activityId, userId);
        if (reg) return reg;
      } catch (err) {
        supabaseSchemaReady = null;
        console.warn('[Repository] Supabase findUserRegistration failed:', err);
      }
    }
    return await dbService.findUserRegistration(activityId, userId);
  },

  async createRegistration(data: {
    user_id: number;
    activity_id: number;
    status: 'CONFIRMED' | 'WAITING';
    qr_token: string;
  }): Promise<Registration> {
    const isReady = await checkSupabaseReady();
    if (isReady) {
      try {
        return await supabaseService.createRegistration(data);
      } catch (err) {
        supabaseSchemaReady = null;
        console.warn('[Repository] Supabase createRegistration failed, falling back to SQLite:', err);
      }
    }
    return await dbService.createRegistration(data);
  },

  async cancelRegistration(activityId: number, userId: number): Promise<{
    cancelledReg: Registration | null;
    promotedReg: Registration | null;
  }> {
    const isReady = await checkSupabaseReady();
    if (isReady) {
      try {
        return await supabaseService.cancelRegistration(activityId, userId);
      } catch (err) {
        supabaseSchemaReady = null;
        console.warn('[Repository] Supabase cancelRegistration failed, falling back to SQLite:', err);
      }
    }
    return await dbService.cancelRegistration(activityId, userId);
  },

  async getRegistrationsByActivity(activityId: number): Promise<Registration[]> {
    const isReady = await checkSupabaseReady();
    if (isReady) {
      try {
        const regs = await supabaseService.getRegistrationsByActivity(activityId);
        if (regs) return regs;
      } catch (err) {
        supabaseSchemaReady = null;
        console.warn('[Repository] Supabase getRegistrationsByActivity failed:', err);
      }
    }
    return await dbService.getRegistrationsByActivity(activityId);
  },

  async getRegistrationsByUser(userId: number): Promise<Registration[]> {
    const isReady = await checkSupabaseReady();
    if (isReady) {
      try {
        const regs = await supabaseService.getRegistrationsByUser(userId);
        if (regs) return regs;
      } catch (err) {
        supabaseSchemaReady = null;
        console.warn('[Repository] Supabase getRegistrationsByUser failed:', err);
      }
    }
    return await dbService.getRegistrationsByUser(userId);
  },

  async getRegistrationByToken(token: string): Promise<Registration | null> {
    const isReady = await checkSupabaseReady();
    if (isReady) {
      try {
        const reg = await supabaseService.getRegistrationByToken(token);
        if (reg) return reg;
      } catch (err) {
        supabaseSchemaReady = null;
        console.warn('[Repository] Supabase getRegistrationByToken failed:', err);
      }
    }
    return await dbService.getRegistrationByToken(token);
  },

  async getRegistrationById(id: number): Promise<Registration | null> {
    const isReady = await checkSupabaseReady();
    if (isReady) {
      try {
        const reg = await supabaseService.getRegistrationById(id);
        if (reg) return reg;
      } catch (err) {
        supabaseSchemaReady = null;
        console.warn('[Repository] Supabase getRegistrationById failed:', err);
      }
    }
    return await dbService.getRegistrationById(id);
  },

  async checkIn(id: number): Promise<Registration | null> {
    const isReady = await checkSupabaseReady();
    if (isReady) {
      try {
        const reg = await supabaseService.checkIn(id);
        if (reg) return reg;
      } catch (err) {
        supabaseSchemaReady = null;
        console.warn('[Repository] Supabase checkIn failed:', err);
      }
    }
    return await dbService.checkIn(id);
  },

  // ================= NOTIFICATIONS =================
  async getUserNotifications(userId: number): Promise<AppNotification[]> {
    const isReady = await checkSupabaseReady();
    if (isReady) {
      try {
        const notifs = await supabaseService.getUserNotifications(userId);
        if (notifs) return notifs;
      } catch (err) {
        supabaseSchemaReady = null;
        console.warn('[Repository] Supabase getUserNotifications failed:', err);
      }
    }
    return await dbService.getUserNotifications(userId);
  },

  async createNotification(notif: {
    id: string;
    user_id: number;
    title: string;
    message: string;
    type: string;
    activity_id?: number | null;
  }): Promise<void> {
    const isReady = await checkSupabaseReady();
    if (isReady) {
      try {
        await supabaseService.createNotification(notif);
        return;
      } catch (err) {
        supabaseSchemaReady = null;
        console.warn('[Repository] Supabase createNotification failed:', err);
      }
    }
    await dbService.createNotification(notif);
  },

  async markNotificationRead(id: string): Promise<void> {
    const isReady = await checkSupabaseReady();
    if (isReady) {
      try {
        await supabaseService.markNotificationRead(id);
        return;
      } catch (err) {
        supabaseSchemaReady = null;
        console.warn('[Repository] Supabase markNotificationRead failed:', err);
      }
    }
    await dbService.markNotificationRead(id);
  },

  async markAllNotificationsRead(userId: number): Promise<void> {
    const isReady = await checkSupabaseReady();
    if (isReady) {
      try {
        await supabaseService.markAllNotificationsRead(userId);
        return;
      } catch (err) {
        supabaseSchemaReady = null;
        console.warn('[Repository] Supabase markAllNotificationsRead failed:', err);
      }
    }
    await dbService.markAllNotificationsRead(userId);
  },

  // ================= STATS & DEMO =================
  getDatabaseStats() {
    return dbService.getDatabaseStats();
  },

  resetDatabaseToSeed() {
    return dbService.resetDatabaseToSeed();
  },
};
