export type Faculty = 
  | 'คณะเทคโนโลยีสารสนเทศและการสื่อสาร (ICT)'
  | 'คณะวิศวกรรมศาสตร์'
  | 'คณะบริหารธุรกิจและนิเทศศาสตร์'
  | 'คณะวิทยาศาสตร์'
  | 'คณะแพทยศาสตร์และวิทยาศาสตร์สุขภาพ'
  | 'คณะสถาปัตยกรรมศาสตร์และศิลปกรรมศาสตร์'
  | 'คณะมนุษยศาสตร์และสังคมศาสตร์';

export type ActivityCategory = 
  | 'Sports & Fitness'
  | 'Technology & Academic'
  | 'Arts & Culture'
  | 'Volunteer & Social'
  | 'Career & Workshop';

export interface User {
  id: number;
  name: string;
  email: string;
  faculty: string;
  student_id?: string;
  profile_image?: string;
  university_verified: boolean;
  show_up_rate?: number;
  attended_count?: number;
  registered_count?: number;
  role?: 'student' | 'organizer';
  password?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  message?: string;
}


export interface Activity {
  id: number;
  title: string;
  description: string;
  location: string;
  start_date: string;
  end_date: string;
  max_participants: number;
  organizer_id: number;
  organizer_name: string;
  organizer_faculty?: string;
  category: ActivityCategory;
  tags?: string[];
  banner_image?: string;
  required_items?: string;
  status: 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
  current_confirmed: number;
  current_waiting: number;
  is_full: boolean;
}

export type RegistrationStatus = 'CONFIRMED' | 'WAITING' | 'CANCELLED';

export interface Registration {
  id: number;
  user_id: number;
  activity_id: number;
  status: RegistrationStatus;
  qr_token: string;
  checked_in_at: string | null;
  created_at: string;
  user?: User;
  activity?: Activity;
}

export interface ActivityDashboard {
  activity: Activity;
  total_registered: number;
  confirmed_count: number;
  checked_in_count: number;
  waiting_count: number;
  show_up_rate: number;
  participants: Registration[];
}

export type NotificationType = 
  | 'registration_confirmed'
  | 'waitlist_promoted'
  | 'checked_in'
  | 'event_reminder'
  | 'general';

export interface AppNotification {
  id: string;
  user_id: number;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  created_at: string;
  activity_id?: number;
}

