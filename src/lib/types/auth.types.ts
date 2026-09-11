export type UserRole = 'superUser' | 'admin' | 'vendor' | 'member';

export interface User {
  id: string;
  email: string;
  /** Only present on locally-created payloads — the API never returns it. */
  password?: string;
  name: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  vendor_id?: string | number | null; // For vendor users - matches backend field name
  trust_score?: number | null;
  created_at?: string;
  is_active?: boolean;
}
