import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import type { Activity, AppNotification, Registration, User } from '../types';

dotenv.config();

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  '';
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseKey &&
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('your-project-id')
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

if (isSupabaseConfigured) {
  console.log(`[Database] Connected to Supabase Cloud Database: ${supabaseUrl}`);
} else {
  console.log('[Database] Supabase credentials not found in env; using local persistent SQLite backend.');
}

export const supabaseService = {
  // ================= USERS =================
  async getAllUsers(): Promise<User[]> {
    if (!supabase) return [];
    const { data, error } = await supabase.from('users').select('*').order('id', { ascending: true });
    if (error) {
      console.error('[Supabase] getAllUsers error:', error);
      throw error;
    }
    return (data || []).map((u) => ({
      ...u,
      university_verified: Boolean(u.university_verified),
    }));
  },

  async getUserById(id: number): Promise<User | null> {
    if (!supabase) return null;
    const { data, error } = await supabase.from('users').select('*').eq('id', id).maybeSingle();
    if (error) {
      console.error('[Supabase] getUserById error:', error);
      throw error;
    }
    if (!data) return null;
    return {
      ...data,
      university_verified: Boolean(data.university_verified),
    };
  },

  async getUserByEmailOrStudentId(identifier: string): Promise<User | null> {
    if (!supabase) return null;
    const clean = identifier.trim().toLowerCase();
    
    // Check email first
    const { data: userByEmail } = await supabase
      .from('users')
      .select('*')
      .ilike('email', clean)
      .maybeSingle();

    if (userByEmail) {
      return {
        ...userByEmail,
        university_verified: Boolean(userByEmail.university_verified),
      };
    }

    // Check student_id
    const { data: userById } = await supabase
      .from('users')
      .select('*')
      .ilike('student_id', clean)
      .maybeSingle();

    if (!userById) return null;
    return {
      ...userById,
      university_verified: Boolean(userById.university_verified),
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
    if (!supabase) throw new Error('Supabase is not configured');

    const payload = {
      name: data.name,
      email: data.email.toLowerCase(),
      password: data.password,
      faculty: data.faculty,
      student_id: data.student_id || null,
      role: data.role || 'student',
      profile_image: data.profile_image || '',
      university_verified: data.university_verified ? true : false,
      show_up_rate: 100,
      attended_count: 0,
      registered_count: 0,
    };

    const { data: inserted, error } = await supabase
      .from('users')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      console.error('[Supabase] createUser error:', error);
      throw error;
    }

    return {
      ...inserted,
      university_verified: Boolean(inserted.university_verified),
    };
  },

  async updateUser(id: number, data: Partial<User>): Promise<User | null> {
    if (!supabase) return null;

    const updatePayload: Record<string, any> = {};
    if (data.name !== undefined) updatePayload.name = data.name;
    if (data.faculty !== undefined) updatePayload.faculty = data.faculty;
    if (data.student_id !== undefined) updatePayload.student_id = data.student_id;
    if (data.profile_image !== undefined) updatePayload.profile_image = data.profile_image;
    if (data.role !== undefined) updatePayload.role = data.role;
    if (data.show_up_rate !== undefined) updatePayload.show_up_rate = data.show_up_rate;
    if (data.attended_count !== undefined) updatePayload.attended_count = data.attended_count;
    if (data.registered_count !== undefined) updatePayload.registered_count = data.registered_count;

    const { data: updated, error } = await supabase
      .from('users')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('[Supabase] updateUser error:', error);
      throw error;
    }

    return {
      ...updated,
      university_verified: Boolean(updated.university_verified),
    };
  },

  // ================= ACTIVITIES =================
  async getAllActivities(params?: { search?: string; category?: string; status?: string }): Promise<Activity[]> {
    if (!supabase) return [];

    let query = supabase.from('activities').select('*, registrations(id, status)');

    if (params?.category && params.category !== 'All') {
      query = query.eq('category', params.category);
    }

    if (params?.status) {
      query = query.eq('status', params.status);
    }

    if (params?.search) {
      const q = `%${params.search}%`;
      query = query.or(`title.ilike.${q},description.ilike.${q},location.ilike.${q}`);
    }

    const { data, error } = await query.order('id', { ascending: false });

    if (error) {
      console.error('[Supabase] getAllActivities error:', error);
      throw error;
    }

    return (data || []).map((row: any) => {
      const regs = row.registrations || [];
      const confirmed = regs.filter((r: any) => r.status === 'CONFIRMED').length;
      const waiting = regs.filter((r: any) => r.status === 'WAITING').length;

      let tags: string[] = [];
      if (Array.isArray(row.tags)) {
        tags = row.tags;
      } else if (typeof row.tags === 'string') {
        try {
          tags = JSON.parse(row.tags);
        } catch {
          tags = [];
        }
      }

      const { registrations, ...activityFields } = row;

      return {
        ...activityFields,
        tags,
        current_confirmed: confirmed,
        current_waiting: waiting,
        is_full: confirmed >= row.max_participants,
      };
    });
  },

  async getActivityById(id: number): Promise<Activity | null> {
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('activities')
      .select('*, registrations(id, status)')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('[Supabase] getActivityById error:', error);
      throw error;
    }

    if (!data) return null;

    const regs = data.registrations || [];
    const confirmed = regs.filter((r: any) => r.status === 'CONFIRMED').length;
    const waiting = regs.filter((r: any) => r.status === 'WAITING').length;

    let tags: string[] = [];
    if (Array.isArray(data.tags)) {
      tags = data.tags;
    } else if (typeof data.tags === 'string') {
      try {
        tags = JSON.parse(data.tags);
      } catch {
        tags = [];
      }
    }

    const { registrations, ...activityFields } = data;

    return {
      ...activityFields,
      tags,
      current_confirmed: confirmed,
      current_waiting: waiting,
      is_full: confirmed >= data.max_participants,
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
    if (!supabase) throw new Error('Supabase is not configured');

    const payload = {
      title: data.title,
      description: data.description || '',
      location: data.location,
      start_date: data.start_date,
      end_date: data.end_date,
      max_participants: data.max_participants,
      organizer_id: data.organizer_id,
      organizer_name: data.organizer_name,
      organizer_faculty: data.organizer_faculty || '',
      category: data.category,
      tags: JSON.stringify(data.tags || []),
      banner_image: data.banner_image || '',
      required_items: data.required_items || '',
      status: 'UPCOMING',
    };

    const { data: inserted, error } = await supabase
      .from('activities')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      console.error('[Supabase] createActivity error:', error);
      throw error;
    }

    return {
      ...inserted,
      tags: data.tags || [],
      current_confirmed: 0,
      current_waiting: 0,
      is_full: false,
    };
  },

  async updateActivity(id: number, data: Partial<Activity>): Promise<Activity | null> {
    if (!supabase) return null;
    const updatePayload: Record<string, any> = {};
    if (data.title !== undefined) updatePayload.title = data.title;
    if (data.description !== undefined) updatePayload.description = data.description;
    if (data.location !== undefined) updatePayload.location = data.location;
    if (data.start_date !== undefined) updatePayload.start_date = data.start_date;
    if (data.end_date !== undefined) updatePayload.end_date = data.end_date;
    if (data.max_participants !== undefined) updatePayload.max_participants = data.max_participants;
    if (data.category !== undefined) updatePayload.category = data.category;
    if (data.tags !== undefined) updatePayload.tags = JSON.stringify(data.tags);
    if (data.banner_image !== undefined) updatePayload.banner_image = data.banner_image;
    if (data.required_items !== undefined) updatePayload.required_items = data.required_items;
    if (data.status !== undefined) updatePayload.status = data.status;

    const { error } = await supabase
      .from('activities')
      .update(updatePayload)
      .eq('id', id);

    if (error) {
      console.error('[Supabase] updateActivity error:', error);
      throw error;
    }
    return this.getActivityById(id);
  },

  async deleteActivity(id: number): Promise<boolean> {
    if (!supabase) return false;
    try {
      await supabase.from('registrations').delete().eq('activity_id', id);
      await supabase.from('notifications').delete().eq('activity_id', id);
      const { error } = await supabase.from('activities').delete().eq('id', id);
      if (error) {
        console.error('[Supabase] deleteActivity error:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[Supabase] deleteActivity exception:', err);
      return false;
    }
  },

  async cleanupExpiredActivities(): Promise<number> {
    if (!supabase) return 0;
    try {
      const now = new Date();
      const { data, error } = await supabase.from('activities').select('id, end_date');
      if (error || !data) return 0;

      let deletedCount = 0;
      for (const act of data) {
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
      console.error('[Supabase] cleanupExpiredActivities exception:', err);
      return 0;
    }
  },

  // ================= REGISTRATIONS =================
  async getRegistrationsByActivity(activityId: number): Promise<Registration[]> {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('registrations')
      .select('*, users(*)')
      .eq('activity_id', activityId)
      .neq('status', 'CANCELLED')
      .order('id', { ascending: true });

    if (error) {
      console.error('[Supabase] getRegistrationsByActivity error:', error);
      throw error;
    }

    return (data || []).map((r: any) => ({
      ...r,
      user: r.users ? { ...r.users, university_verified: Boolean(r.users.university_verified) } : undefined,
    }));
  },

  async getRegistrationsByUser(userId: number): Promise<Registration[]> {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('registrations')
      .select('*, activities(*), users(*)')
      .eq('user_id', userId)
      .neq('status', 'CANCELLED')
      .order('id', { ascending: false });

    if (error) {
      console.error('[Supabase] getRegistrationsByUser error:', error);
      throw error;
    }

    return (data || []).map((r: any) => {
      let tags: string[] = [];
      if (r.activities?.tags) {
        try {
          tags = typeof r.activities.tags === 'string' ? JSON.parse(r.activities.tags) : r.activities.tags;
        } catch {
          tags = [];
        }
      }

      return {
        ...r,
        activity: r.activities ? { ...r.activities, tags } : undefined,
        user: r.users ? { ...r.users, university_verified: Boolean(r.users.university_verified) } : undefined,
      };
    });
  },

  async getRegistrationByToken(token: string): Promise<Registration | null> {
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('registrations')
      .select('*, activities(*), users(*)')
      .eq('qr_token', token)
      .neq('status', 'CANCELLED')
      .maybeSingle();

    if (error || !data) return null;

    return {
      ...data,
      activity: data.activities || undefined,
      user: data.users ? { ...data.users, university_verified: Boolean(data.users.university_verified) } : undefined,
    };
  },

  async getRegistrationById(id: number): Promise<Registration | null> {
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('registrations')
      .select('*, activities(*), users(*)')
      .eq('id', id)
      .neq('status', 'CANCELLED')
      .maybeSingle();

    if (error || !data) return null;

    return {
      ...data,
      activity: data.activities || undefined,
      user: data.users ? { ...data.users, university_verified: Boolean(data.users.university_verified) } : undefined,
    };
  },

  async findUserRegistration(activityId: number, userId: number): Promise<Registration | null> {
    if (!supabase) return null;

    const { data } = await supabase
      .from('registrations')
      .select('*')
      .eq('activity_id', activityId)
      .eq('user_id', userId)
      .neq('status', 'CANCELLED')
      .maybeSingle();

    return data || null;
  },

  async createRegistration(data: {
    user_id: number;
    activity_id: number;
    status: 'CONFIRMED' | 'WAITING';
    qr_token: string;
  }): Promise<Registration> {
    if (!supabase) throw new Error('Supabase is not configured');

    const payload = {
      user_id: data.user_id,
      activity_id: data.activity_id,
      status: data.status,
      qr_token: data.qr_token,
      checked_in_at: null,
      created_at: new Date().toISOString(),
    };

    const { data: inserted, error } = await supabase
      .from('registrations')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      console.error('[Supabase] createRegistration error:', error);
      throw error;
    }

    await this.recalculateUserStats(data.user_id);
    return inserted;
  },

  async cancelRegistration(activityId: number, userId: number): Promise<{
    cancelledReg: Registration | null;
    promotedReg: Registration | null;
  }> {
    if (!supabase) return { cancelledReg: null, promotedReg: null };

    const reg = await this.findUserRegistration(activityId, userId);
    if (!reg) return { cancelledReg: null, promotedReg: null };

    const wasConfirmed = reg.status === 'CONFIRMED';

    // Mark cancelled
    await supabase.from('registrations').update({ status: 'CANCELLED' }).eq('id', reg.id);

    let promotedReg: Registration | null = null;
    // Auto promote waiting list if confirmed user cancels
    if (wasConfirmed) {
      const { data: nextWaiting } = await supabase
        .from('registrations')
        .select('*')
        .eq('activity_id', activityId)
        .eq('status', 'WAITING')
        .order('id', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (nextWaiting) {
        const { data: updatedWaiting } = await supabase
          .from('registrations')
          .update({ status: 'CONFIRMED' })
          .eq('id', nextWaiting.id)
          .select('*')
          .single();

        promotedReg = updatedWaiting;
      }
    }

    await this.recalculateUserStats(userId);
    return { cancelledReg: reg, promotedReg };
  },

  async checkIn(id: number): Promise<Registration | null> {
    if (!supabase) return null;

    const now = new Date().toISOString();
    const { data: updated, error } = await supabase
      .from('registrations')
      .update({ checked_in_at: now })
      .eq('id', id)
      .select('*, users(*), activities(*)')
      .single();

    if (error || !updated) {
      console.error('[Supabase] checkIn error:', error);
      return null;
    }

    await this.recalculateUserStats(updated.user_id);

    return {
      ...updated,
      activity: updated.activities || undefined,
      user: updated.users ? { ...updated.users, university_verified: Boolean(updated.users.university_verified) } : undefined,
    };
  },

  async recalculateUserStats(userId: number) {
    if (!supabase) return;

    const { data: confirmed } = await supabase
      .from('registrations')
      .select('id, checked_in_at')
      .eq('user_id', userId)
      .eq('status', 'CONFIRMED');

    const confirmedCount = confirmed?.length || 0;
    const checkedInCount = confirmed?.filter((r) => r.checked_in_at).length || 0;
    const rate = confirmedCount > 0 ? Math.round((checkedInCount / confirmedCount) * 100) : 100;

    await supabase
      .from('users')
      .update({
        show_up_rate: rate,
        attended_count: checkedInCount,
        registered_count: confirmedCount,
      })
      .eq('id', userId);
  },

  // ================= NOTIFICATIONS =================
  async getUserNotifications(userId: number): Promise<AppNotification[]> {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Supabase] getUserNotifications error:', error);
      return [];
    }

    return (data || []).map((n) => ({
      ...n,
      read: Boolean(n.read),
    }));
  },

  async createNotification(notif: {
    id: string;
    user_id: number;
    title: string;
    message: string;
    type: string;
    activity_id?: number | null;
  }) {
    if (!supabase) return;

    await supabase.from('notifications').insert({
      id: notif.id,
      user_id: notif.user_id,
      title: notif.title,
      message: notif.message,
      type: notif.type,
      read: false,
      created_at: new Date().toISOString(),
      activity_id: notif.activity_id || null,
    });
  },

  async markNotificationRead(id: string) {
    if (!supabase) return;
    await supabase.from('notifications').update({ read: true }).eq('id', id);
  },

  async markAllNotificationsRead(userId: number) {
    if (!supabase) return;
    await supabase.from('notifications').update({ read: true }).eq('user_id', userId);
  },
};
