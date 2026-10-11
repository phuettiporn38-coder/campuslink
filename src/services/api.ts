import type { Activity, Registration, User, ActivityDashboard, AppNotification, AuthResponse } from '../types';

const TOKEN_KEY = 'campus_activity_auth_token';

export const authStorage = {
  getToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  setToken(token: string) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {}
  },
  removeToken() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {}
  },
};

async function parseJsonSafe<T = any>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Server returned non-JSON response (${res.status})`);
  }
}

export const api = {
  async getHealth() {
    const res = await fetch('/api/health');
    return parseJsonSafe(res);
  },

  // Auth Methods
  async login(identifier: string, password: string): Promise<AuthResponse> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    });
    const data = await parseJsonSafe<any>(res);
    if (!res.ok) {
      throw new Error(data.error || 'เข้าสู่ระบบไม่สำเร็จ');
    }
    authStorage.setToken(data.token);
    return data;
  },

  async demoLogin(userId: number): Promise<AuthResponse> {
    const res = await fetch('/api/auth/demo-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    const data = await parseJsonSafe<any>(res);
    if (!res.ok) {
      throw new Error(data.error || 'เข้าสู่ระบบไม่สำเร็จ');
    }
    authStorage.setToken(data.token);
    return data;
  },

  async register(userData: {
    name: string;
    email: string;
    password: string;
    faculty: string;
    student_id?: string;
    role?: 'student' | 'organizer';
  }): Promise<AuthResponse> {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    const data = await parseJsonSafe<any>(res);
    if (!res.ok) {
      throw new Error(data.error || 'ลงทะเบียนบัญชีไม่สำเร็จ');
    }
    authStorage.setToken(data.token);
    return data;
  },

  async getMe(): Promise<User | null> {
    const token = authStorage.getToken();
    if (!token) return null;
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        authStorage.removeToken();
        return null;
      }
      const data = await parseJsonSafe<any>(res);
      return data.user || null;
    } catch {
      return null;
    }
  },

  async logout(): Promise<void> {
    const token = authStorage.getToken();
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {}
    }
    authStorage.removeToken();
  },

  async getUsers(): Promise<User[]> {
    try {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      return await parseJsonSafe(res);
    } catch (err) {
      console.warn('[API] getUsers failed:', err);
      return [];
    }
  },

  async getUser(id: number): Promise<User> {
    const res = await fetch(`/api/users/${id}`);
    if (!res.ok) throw new Error('Failed to fetch user');
    return parseJsonSafe(res);
  },

  async updateUser(id: number, data: Partial<User>): Promise<User> {
    const res = await fetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await parseJsonSafe<any>(res);
      throw new Error(err.error || 'Failed to update user');
    }
    return parseJsonSafe(res);
  },

  async createUser(data: Partial<User>): Promise<User> {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await parseJsonSafe<any>(res);
      throw new Error(err.error || 'Failed to save user');
    }
    return parseJsonSafe(res);
  },

  async getActivities(params?: { search?: string; category?: string }): Promise<Activity[]> {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.category) query.set('category', params.category);

    try {
      const res = await fetch(`/api/activities?${query.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch activities');
      return await parseJsonSafe(res);
    } catch (err) {
      console.warn('[API] getActivities failed:', err);
      return [];
    }
  },

  async getActivity(id: number): Promise<Activity> {
    const res = await fetch(`/api/activities/${id}`);
    if (!res.ok) throw new Error('Failed to fetch activity');
    return parseJsonSafe(res);
  },

  async createActivity(data: Partial<Activity>): Promise<Activity> {
    const res = await fetch('/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await parseJsonSafe<any>(res);
      throw new Error(err.error || 'Failed to create activity');
    }
    return parseJsonSafe(res);
  },

  async updateActivity(id: number, data: Partial<Activity>): Promise<Activity> {
    const res = await fetch(`/api/activities/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await parseJsonSafe<any>(res);
      throw new Error(err.error || 'Failed to update activity');
    }
    return parseJsonSafe(res);
  },

  async deleteActivity(id: number): Promise<{ success: boolean; message: string }> {
    const token = authStorage.getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`/api/activities/${id}`, {
      method: 'DELETE',
      headers,
    });
    if (!res.ok) {
      const err = await parseJsonSafe<any>(res);
      throw new Error(err.error || 'Failed to delete activity');
    }
    return parseJsonSafe(res);
  },

  async registerActivity(activityId: number, userId: number): Promise<{
    message: string;
    registration: Registration;
    status: 'CONFIRMED' | 'WAITING';
  }> {
    const res = await fetch(`/api/activities/${activityId}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    });
    const data = await parseJsonSafe<any>(res);
    if (!res.ok) {
      throw new Error(data.error || 'Failed to register');
    }
    return data;
  },

  async cancelRegistration(activityId: number, userId: number): Promise<{ message: string; promoted_user_id: number | null }> {
    const res = await fetch(`/api/activities/${activityId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    });
    const data = await parseJsonSafe<any>(res);
    if (!res.ok) {
      throw new Error(data.error || 'Failed to cancel registration');
    }
    return data;
  },

  async getUserRegistrations(userId: number): Promise<Registration[]> {
    try {
      const res = await fetch(`/api/users/${userId}/registrations`);
      if (!res.ok) throw new Error('Failed to fetch user registrations');
      return await parseJsonSafe(res);
    } catch (err) {
      console.warn('[API] getUserRegistrations failed:', err);
      return [];
    }
  },

  async checkIn(payload: { qr_token?: string; registration_id?: number }): Promise<{
    message: string;
    valid: boolean;
    already_checked_in?: boolean;
    registration?: Registration;
    user?: User;
    activity?: Activity;
    checked_in_at?: string;
    user_show_up_rate?: number;
  }> {
    const res = await fetch('/api/registrations/check-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await parseJsonSafe<any>(res);
    if (!res.ok && !data.valid) {
      throw new Error(data.error || 'Check-in failed');
    }
    return data;
  },

  async getActivityDashboard(activityId: number): Promise<ActivityDashboard> {
    const res = await fetch(`/api/activities/${activityId}/dashboard`);
    if (!res.ok) throw new Error('Failed to fetch dashboard data');
    return parseJsonSafe(res);
  },

  async getActivityParticipants(activityId: number): Promise<Registration[]> {
    try {
      const res = await fetch(`/api/activities/${activityId}/participants`);
      if (!res.ok) throw new Error('Failed to fetch participants');
      return await parseJsonSafe(res);
    } catch (err) {
      console.warn('[API] getActivityParticipants failed:', err);
      return [];
    }
  },

  async askAI(question: string, userId?: number, activityId?: number): Promise<{ answer: string }> {
    const res = await fetch('/api/ai/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        user_id: userId,
        current_activity_id: activityId,
      }),
    });
    if (!res.ok) throw new Error('Failed to consult AI');
    return parseJsonSafe(res);
  },

  // Notifications API
  async getNotifications(userId: number): Promise<AppNotification[]> {
    try {
      const res = await fetch(`/api/notifications?user_id=${userId}`);
      if (!res.ok) throw new Error('Failed to fetch notifications');
      return await parseJsonSafe(res);
    } catch (err) {
      console.warn('[API] getNotifications failed:', err);
      return [];
    }
  },

  async markNotificationRead(id: string): Promise<void> {
    await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
  },

  async markAllNotificationsRead(userId: number): Promise<void> {
    await fetch('/api/notifications/read-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    });
  },

  // Database Management API
  async getDatabaseStats(): Promise<{
    db_type: string;
    db_file: string;
    db_path: string;
    total_tables: number;
    tables: {
      table_name: string;
      row_count: number;
      columns: { name: string; type: string; pk: boolean; notnull: boolean }[];
    }[];
  }> {
    const res = await fetch('/api/db/stats');
    if (!res.ok) throw new Error('Failed to fetch database statistics');
    return parseJsonSafe(res);
  },

  async getTableRows(table: string): Promise<any[]> {
    const res = await fetch(`/api/db/tables/${table}`);
    if (!res.ok) throw new Error(`Failed to fetch rows from ${table}`);
    return parseJsonSafe(res);
  },

  async executeDbQuery(query: string): Promise<{ results: any[]; count: number }> {
    const res = await fetch('/api/db/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    const data = await parseJsonSafe<any>(res);
    if (!res.ok) throw new Error(data.error || 'Query failed');
    return data;
  },

  async resetDatabase(): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/db/reset', { method: 'POST' });
    if (!res.ok) throw new Error('Failed to reset database');
    return parseJsonSafe(res);
  },
};
