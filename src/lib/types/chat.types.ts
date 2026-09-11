/**
 * Chat Types
 * Shared type definitions for chat functionality
 */

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
  canSend?: boolean;
  userRole?: string;
  groupRole?: string;
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
  tempId?: string; // For optimistic updates
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
