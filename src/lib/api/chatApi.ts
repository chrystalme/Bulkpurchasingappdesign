/**
 * Chat API Service
 * Handles all HTTP requests to the chat backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Helper to get auth token
const getAuthToken = (): string | null => {
  return localStorage.getItem('token');
};

// Helper to make authenticated requests
async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = getAuthToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// ============================================
// CONVERSATION API
// ============================================

export interface Conversation {
  id: string;
  type: 'group' | 'group-vendor';
  title: string;
  avatar?: string;
  groupId: string;
  groupName?: string;
  vendorId?: string;
  vendorName?: string;
  vendorAvatar?: string;
  productId?: string;
  isOnline?: boolean;
  lastMessage?: ChatMessage;
  unreadCount: number;
  typingUsers?: TypingUser[];
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: string;
  read: boolean;
  isOwn?: boolean;
}

export interface ConversationParticipant {
  userId: string;
  name: string;
  avatar?: string;
  role: 'admin' | 'member' | 'vendor';
  canSend: boolean;
  isOnline?: boolean;
}

export interface TypingUser {
  userId: string;
  userName: string;
}

/**
 * Get all conversations for the current user
 */
export async function getUserConversations(params?: {
  type?: 'group' | 'group-vendor';
  groupId?: string;
}): Promise<Conversation[]> {
  const queryParams = new URLSearchParams();
  
  if (params?.type) queryParams.append('type', params.type);
  if (params?.groupId) queryParams.append('groupId', params.groupId);

  const url = `${API_BASE_URL}/chat/conversations${queryParams.toString() ? `?${queryParams}` : ''}`;
  const response = await fetchWithAuth(url);
  
  return response.data;
}

/**
 * Get a specific conversation by ID
 */
export async function getConversationById(conversationId: string): Promise<Conversation> {
  const response = await fetchWithAuth(`${API_BASE_URL}/chat/conversations/${conversationId}`);
  return response.data;
}

/**
 * Create a new group-vendor conversation
 */
export async function createGroupVendorConversation(data: {
  groupId: string;
  vendorId: string;
  productId?: string;
}): Promise<{ id: string }> {
  const response = await fetchWithAuth(`${API_BASE_URL}/chat/conversations/group-vendor`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  
  return response.data;
}

/**
 * Get participants in a conversation
 */
export async function getConversationParticipants(conversationId: string): Promise<ConversationParticipant[]> {
  const response = await fetchWithAuth(`${API_BASE_URL}/chat/conversations/${conversationId}/participants`);
  return response.data;
}

// ============================================
// MESSAGE API
// ============================================

/**
 * Get messages for a conversation
 */
export async function getMessages(conversationId: string, params?: {
  limit?: number;
  before?: string;
}): Promise<ChatMessage[]> {
  const queryParams = new URLSearchParams();
  
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.before) queryParams.append('before', params.before);

  const url = `${API_BASE_URL}/chat/conversations/${conversationId}/messages${queryParams.toString() ? `?${queryParams}` : ''}`;
  const response = await fetchWithAuth(url);
  
  return response.data;
}

/**
 * Send a message (via HTTP, not Socket.IO)
 * Note: In production, prefer Socket.IO for real-time messaging
 */
export async function sendMessage(conversationId: string, content: string): Promise<ChatMessage> {
  const response = await fetchWithAuth(`${API_BASE_URL}/chat/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
  
  return response.data;
}

/**
 * Mark conversation as read
 */
export async function markConversationAsRead(conversationId: string): Promise<void> {
  await fetchWithAuth(`${API_BASE_URL}/chat/conversations/${conversationId}/read`, {
    method: 'PUT',
  });
}

/**
 * Delete a message
 */
export async function deleteMessage(messageId: string): Promise<void> {
  await fetchWithAuth(`${API_BASE_URL}/chat/messages/${messageId}`, {
    method: 'DELETE',
  });
}

// ============================================
// TYPING INDICATOR API
// ============================================

/**
 * Set typing indicator
 */
export async function setTypingIndicator(conversationId: string, isTyping: boolean): Promise<void> {
  await fetchWithAuth(`${API_BASE_URL}/chat/conversations/${conversationId}/typing`, {
    method: 'POST',
    body: JSON.stringify({ isTyping }),
  });
}

/**
 * Get typing users
 */
export async function getTypingUsers(conversationId: string): Promise<TypingUser[]> {
  const response = await fetchWithAuth(`${API_BASE_URL}/chat/conversations/${conversationId}/typing`);
  return response.data;
}

// ============================================
// STATS API
// ============================================

/**
 * Get total unread message count
 */
export async function getUnreadCount(): Promise<number> {
  const response = await fetchWithAuth(`${API_BASE_URL}/chat/unread-count`);
  return response.data.unreadCount;
}
