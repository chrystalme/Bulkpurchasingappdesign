export type UserRole = 'superUser' | 'admin' | 'vendor' | 'member';

export interface User {
  id: string;
  email: string;
  password: string; // In production, this would be hashed
  name: string;
  role: UserRole;
  avatar?: string;
  vendor_id?: string | number; // For vendor users - matches backend field name
  trust_score?: number;
  created_at?: string;
  is_active?: boolean;
}