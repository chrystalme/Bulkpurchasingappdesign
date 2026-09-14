/**
 * Chat API Service
 * Handles all HTTP requests to the chat backend
 * 
 * NOTE: This file is kept for backward compatibility during migration.
 * New code should use apiClient.chat.* from ../api.ts instead.
 */

import type {
  Conversation,
  ChatMessage,
  ConversationParticipant,
  TypingUser,
} from '../types/chat.types';
import { apiClient } from '../api';

// Re-export types for backward compatibility
export type {
  Conversation,
  ChatMessage,
  ConversationParticipant,
  TypingUser,
};

// Legacy functions - now wrap apiClient.chat
// These are kept for components that haven't been migrated yet

// ============================================
// CONVERSATION API
// ============================================

/**
 * Get all conversations for the current user
 * @deprecated Use apiClient.chat.getConversations() instead
 */
export async function getUserConversations(params?: {
  type?: 'group' | 'group-vendor' | 'direct';
  groupId?: string;
}): Promise<Conversation[]> {
  const response = await apiClient.chat.getConversations(params);
  if (!response.success) {
    throw new Error(response.error || 'Failed to fetch conversations');
  }
  return response.data || [];
}

/**
 * Get a specific conversation by ID
 */
export async function getConversationById(
  conversationId: string,
): Promise<Conversation> {
  const response = await fetchWithAuth(
    `${API_BASE_URL}/chat/conversations/${conversationId}`,
  );
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
  const response = await fetchWithAuth(
    `${API_BASE_URL}/chat/conversations/group-vendor`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
  );

  return response.data;
}

/**
 * Get participants in a conversation
 * @deprecated Use apiClient.chat.getParticipants() instead
 */
export async function getConversationParticipants(
  conversationId: string,
): Promise<ConversationParticipant[]> {
  const response = await apiClient.chat.getParticipants(conversationId);
  if (!response.success) {
    throw new Error(response.error || 'Failed to fetch participants');
  }
  return response.data || [];
}

// ============================================
// MESSAGE API
// ============================================

/**
 * Get messages for a conversation
 * @deprecated Use apiClient.chat.getMessages() instead
 */
export async function getMessages(
  conversationId: string,
  params?: {
    limit?: number;
    before?: string;
  },
): Promise<ChatMessage[]> {
  const response = await apiClient.chat.getMessages(conversationId, params);
  if (!response.success) {
    throw new Error(response.error || 'Failed to fetch messages');
  }
  return response.data || [];
}

/**
 * Send a message (via HTTP, not Socket.IO)
 * Note: In production, prefer Socket.IO for real-time messaging
 */
export async function sendMessage(
  conversationId: string,
  content: string,
): Promise<ChatMessage> {
  const response = await fetchWithAuth(
    `${API_BASE_URL}/chat/conversations/${conversationId}/messages`,
    {
      method: 'POST',
      body: JSON.stringify({ content }),
    },
  );

  return response.data;
}

/**
 * Mark conversation as read
 */
export async function markConversationAsRead(
  conversationId: string,
): Promise<void> {
  await fetchWithAuth(
    `${API_BASE_URL}/chat/conversations/${conversationId}/read`,
    {
      method: 'PUT',
    },
  );
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
export async function setTypingIndicator(
  conversationId: string,
  isTyping: boolean,
): Promise<void> {
  await fetchWithAuth(
    `${API_BASE_URL}/chat/conversations/${conversationId}/typing`,
    {
      method: 'POST',
      body: JSON.stringify({ isTyping }),
    },
  );
}

/**
 * Get typing users
 */
export async function getTypingUsers(
  conversationId: string,
): Promise<TypingUser[]> {
  const response = await fetchWithAuth(
    `${API_BASE_URL}/chat/conversations/${conversationId}/typing`,
  );
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
