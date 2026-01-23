export type UserRole = 'superUser' | 'admin' | 'vendor' | 'member';

export interface User {
  id: string;
  email: string;
  password: string; // In production, this would be hashed
  name: string;
  role: UserRole;
  avatar?: string;
  vendorId?: string; // For vendor users
  createdAt: string;
  isActive: boolean;
  trustScore?: number;
}