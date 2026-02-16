/**
 * Socket.IO Client for Real-Time Chat
 * Handles WebSocket connections for chat features
 */

import { io, Socket } from 'socket.io-client';
import type { ChatMessage, TypingUser } from '../api/chatApi';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

class ChatSocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<Function>> = new Map();

  /**
   * Connect to Socket.IO server
   */
  connect(token: string): void {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return;
    }

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket.IO connected');
    });

    this.socket.on('disconnect', reason => {
      console.log('❌ Socket.IO disconnected:', reason);
    });

    this.socket.on('connect_error', error => {
      console.error('Socket connection error:', error);
    });

    this.socket.on('error', error => {
      console.error('Socket error:', error);
      this.emit('error', error);
    });

    // Listen for chat events
    this.setupChatListeners();
  }

  /**
   * Disconnect from Socket.IO server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
      console.log('Socket.IO disconnected');
    }
  }

  /**
   * Check if socket is connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Setup internal chat event listeners
   */
  private setupChatListeners(): void {
    if (!this.socket) return;

    // New message received
    this.socket.on('new-message', (message: ChatMessage) => {
      this.emit('new-message', message);
    });

    // User typing indicator
    this.socket.on(
      'user-typing',
      (data: {
        userId: string;
        userName: string;
        conversationId: string;
        isTyping: boolean;
      }) => {
        this.emit('user-typing', data);
      },
    );

    // Messages read
    this.socket.on(
      'messages-read',
      (data: { userId: string; conversationId: string; readAt: string }) => {
        this.emit('messages-read', data);
      },
    );

    // Message deleted
    this.socket.on(
      'message-deleted',
      (data: { messageId: string; conversationId: string }) => {
        this.emit('message-deleted', data);
      },
    );

    // User joined conversation
    this.socket.on(
      'user-joined',
      (data: { userId: string; conversationId: string }) => {
        this.emit('user-joined', data);
      },
    );

    // User left conversation
    this.socket.on(
      'user-left',
      (data: { userId: string; conversationId: string }) => {
        this.emit('user-left', data);
      },
    );

    // User online status changed
    this.socket.on(
      'user-online-status',
      (data: { userId: string; isOnline: boolean }) => {
        this.emit('user-online-status', data);
      },
    );

    // Joined conversation confirmation
    this.socket.on(
      'joined-conversation',
      (data: { conversationId: string }) => {
        this.emit('joined-conversation', data);
      },
    );
  }

  // ============================================
  // EMIT EVENTS TO SERVER
  // ============================================

  /**
   * Join a conversation room
   */
  joinConversation(conversationId: string): void {
    this.socket?.emit('join-conversation', { conversationId });
  }

  /**
   * Leave a conversation room
   */
  leaveConversation(conversationId: string): void {
    this.socket?.emit('leave-conversation', { conversationId });
  }

  /**
   * Send a message via Socket.IO
   */
  sendMessage(conversationId: string, content: string): void {
    this.socket?.emit('send-message', { conversationId, content });
  }

  /**
   * Send typing indicator
   */
  sendTypingIndicator(conversationId: string, isTyping: boolean): void {
    this.socket?.emit('typing', { conversationId, isTyping });
  }

  /**
   * Mark messages as read
   */
  markAsRead(conversationId: string): void {
    this.socket?.emit('mark-read', { conversationId });
  }

  /**
   * Delete a message
   */
  deleteMessageSocket(messageId: string): void {
    this.socket?.emit('delete-message', { messageId });
  }

  // ============================================
  // EVENT LISTENER MANAGEMENT
  // ============================================

  /**
   * Subscribe to an event
   */
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  /**
   * Unsubscribe from an event
   */
  off(event: string, callback: Function): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
    }
  }

  /**
   * Emit event to local listeners
   */
  private emit(event: string, data: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  /**
   * Remove all listeners for an event
   */
  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}

// Export singleton instance
export const chatSocket = new ChatSocketService();

// Auto-connect when token is available
if (typeof window !== 'undefined') {
  const token = localStorage.getItem('auth_token');
  if (token) {
    chatSocket.connect(token);
  }

  // Listen for auth changes
  window.addEventListener('storage', e => {
    if (e.key === 'auth_token') {
      if (e.newValue) {
        chatSocket.connect(e.newValue);
      } else {
        chatSocket.disconnect();
      }
    }
  });
}

export default chatSocket;
