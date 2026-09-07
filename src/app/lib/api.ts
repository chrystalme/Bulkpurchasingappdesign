/**
 * Central API client — auto-injects JWT from localStorage and
 * normalizes error responses. All routes use this helper.
 */

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function token() {
  return localStorage.getItem('token');
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> || {}),
  };

  const t = token();
  if (t) headers['Authorization'] = `Bearer ${t}`;

  const res = await fetch(`${BASE}${path}`, { ...init, headers });

  let body: unknown;
  try { body = await res.json(); } catch { body = {}; }

  if (!res.ok) {
    const msg = (body as { error?: string })?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return body as T;
}

export const api = {
  get:    <T>(path: string)                         => request<T>(path),
  post:   <T>(path: string, data?: unknown)         => request<T>(path, { method: 'POST',  body: JSON.stringify(data) }),
  patch:  <T>(path: string, data?: unknown)         => request<T>(path, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: <T>(path: string)                         => request<T>(path, { method: 'DELETE' }),
};

// ── Auth endpoints ─────────────────────────────────────────────────
export interface ApiUser {
  id: string;
  email: string;
  name: string;
  role: 'superUser' | 'admin' | 'vendor' | 'member';
  avatar?: string;
  is_verified?: boolean;
  created_at?: string;
}

export interface AuthResponse {
  token: string;
  user: ApiUser;
}

export const authApi = {
  login:  (email: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { email, password }),

  signup: (name: string, email: string, password: string, role = 'member') =>
    api.post<AuthResponse>('/auth/signup', { name, email, password, role }),

  me: () => api.get<{ user: ApiUser }>('/auth/me'),
};

// ── Products ───────────────────────────────────────────────────────
export const productsApi = {
  list:       (params?: Record<string, string>) =>
    api.get<{ products: unknown[]; total: number }>(`/products${params ? `?${new URLSearchParams(params)}` : ''}`),
  get:        (id: string) => api.get<unknown>(`/products/${id}`),
  create:     (data: unknown) => api.post<unknown>('/products', data),
  update:     (id: string, data: unknown) => api.patch<unknown>(`/products/${id}`, data),
  categories: () => api.get<{ category: string; count: number }[]>('/products/categories'),
};

// ── Vendors ────────────────────────────────────────────────────────
export const vendorsApi = {
  list:   (params?: Record<string, string>) =>
    api.get<unknown[]>(`/vendors${params ? `?${new URLSearchParams(params)}` : ''}`),
  get:    (id: string) => api.get<unknown>(`/vendors/${id}`),
  myProfile: () => api.get<unknown>('/vendors/me/profile'),
  update: (id: string, data: unknown) => api.patch<unknown>(`/vendors/${id}`, data),
};

// ── Groups ─────────────────────────────────────────────────────────
export const groupsApi = {
  myGroups: () => api.get<unknown[]>('/groups'),
  public:   () => api.get<unknown[]>('/groups/public'),
  get:      (id: string) => api.get<unknown>(`/groups/${id}`),
  create:   (data: unknown) => api.post<unknown>('/groups', data),
  join:     (invite_code: string, qty?: number) => api.post<unknown>('/groups/join', { invite_code, qty }),
  leave:    (id: string) => api.delete<unknown>(`/groups/${id}/leave`),
  update:   (id: string, data: unknown) => api.patch<unknown>(`/groups/${id}`, data),
};

// ── Orders ─────────────────────────────────────────────────────────
export const ordersApi = {
  myOrders:     () => api.get<unknown[]>('/orders'),
  get:          (id: string) => api.get<unknown>(`/orders/${id}`),
  place:        (data: unknown) => api.post<unknown>('/orders', data),
  updateStatus: (id: string, status: string, tracking_ref?: string) =>
    api.patch<unknown>(`/orders/${id}/status`, { status, tracking_ref }),
};

// ── Escrow ─────────────────────────────────────────────────────────
export const escrowApi = {
  myEscrows:    () => api.get<unknown[]>('/escrow'),
  get:          (id: string) => api.get<unknown>(`/escrow/${id}`),
  pay:          (id: string) => api.post<unknown>(`/escrow/${id}/pay`),
  uploadProof:  (id: string, proof_url: string) => api.post<unknown>(`/escrow/${id}/upload-proof`, { proof_url }),
  release:      (id: string) => api.post<unknown>(`/escrow/${id}/release`),
  dispute:      (id: string, reason: string) => api.post<unknown>(`/escrow/${id}/dispute`, { reason }),
  allEscrows:   () => api.get<unknown[]>('/escrow/all'),
  disputes:     () => api.get<unknown[]>('/escrow/disputes'),
  resolveDispute: (id: string, winner: 'buyer' | 'seller', resolution_note: string) =>
    api.post<unknown>(`/escrow/disputes/${id}/resolve`, { winner, resolution_note }),
};

// ── Chat ───────────────────────────────────────────────────────────
export const chatApiV2 = {
  conversations: () => api.get<unknown[]>('/chat/conversations'),
  messages:      (convoId: string, limit?: number) =>
    api.get<unknown>(`/chat/conversations/${convoId}/messages${limit ? `?limit=${limit}` : ''}`),
  send:          (convoId: string, body: string, attachment_url?: string) =>
    api.post<unknown>(`/chat/conversations/${convoId}/messages`, { body, attachment_url }),
  createConvo:   (groupId: string, type: string, vendor_id?: string) =>
    api.post<unknown>(`/chat/groups/${groupId}/conversations`, { type, vendor_id }),
};

// ── Reviews ────────────────────────────────────────────────────────
export const reviewsApi = {
  list:   (vendor_id: string) => api.get<unknown[]>(`/reviews?vendor_id=${vendor_id}`),
  create: (data: unknown) => api.post<unknown>('/reviews', data),
};

export default api;
