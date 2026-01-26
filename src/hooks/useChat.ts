/**
 * useChat Hook
 * Custom React hook for chat functionality with real-time updates
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  getUserConversations, 
  getMessages, 
  getConversationParticipants,
  type Conversation,
  type ChatMessage,
  type ConversationParticipant,
} from '../lib/api/chatApi';
import { chatSocket } from '../lib/socket/chatSocket';

export function useChat() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load conversations
  const loadConversations = useCallback(async (filters?: {
    type?: 'group' | 'group-vendor';
    groupId?: string;
  }) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getUserConversations(filters);
      setConversations(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load conversations');
      console.error('Error loading conversations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Listen for real-time updates
  useEffect(() => {
    const handleNewMessage = (message: ChatMessage) => {
      setConversations(prev => 
        prev.map(conv => {
          if (conv.id === message.conversationId) {
            return {
              ...conv,
              lastMessage: message,
              unreadCount: message.isOwn ? conv.unreadCount : conv.unreadCount + 1,
              updatedAt: message.timestamp,
            };
          }
          return conv;
        })
      );
    };

    const handleUserTyping = (data: { userId: string; userName: string; conversationId: string; isTyping: boolean }) => {
      setConversations(prev =>
        prev.map(conv => {
          if (conv.id === data.conversationId) {
            const typingUsers = conv.typingUsers || [];
            
            if (data.isTyping) {
              // Add user to typing list if not already there
              if (!typingUsers.find(u => u.userId === data.userId)) {
                return {
                  ...conv,
                  typingUsers: [...typingUsers, { userId: data.userId, userName: data.userName }],
                };
              }
            } else {
              // Remove user from typing list
              return {
                ...conv,
                typingUsers: typingUsers.filter(u => u.userId !== data.userId),
              };
            }
          }
          return conv;
        })
      );
    };

    chatSocket.on('new-message', handleNewMessage);
    chatSocket.on('user-typing', handleUserTyping);

    return () => {
      chatSocket.off('new-message', handleNewMessage);
      chatSocket.off('user-typing', handleUserTyping);
    };
  }, []);

  return {
    conversations,
    loading,
    error,
    refetch: loadConversations,
  };
}

export function useConversation(conversationId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [participants, setParticipants] = useState<ConversationParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load messages
  const loadMessages = useCallback(async () => {
    if (!conversationId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await getMessages(conversationId);
      setMessages(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load messages');
      console.error('Error loading messages:', err);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  // Load participants
  const loadParticipants = useCallback(async () => {
    if (!conversationId) return;

    try {
      const data = await getConversationParticipants(conversationId);
      setParticipants(data);
    } catch (err: any) {
      console.error('Error loading participants:', err);
    }
  }, [conversationId]);

  // Send message via Socket.IO
  const sendMessage = useCallback((content: string) => {
    if (!conversationId || !content.trim()) return;
    chatSocket.sendMessage(conversationId, content.trim());
  }, [conversationId]);

  // Send typing indicator
  const sendTypingIndicator = useCallback((isTyping: boolean) => {
    if (!conversationId) return;
    chatSocket.sendTypingIndicator(conversationId, isTyping);
  }, [conversationId]);

  // Mark as read
  const markAsRead = useCallback(() => {
    if (!conversationId) return;
    chatSocket.markAsRead(conversationId);
  }, [conversationId]);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Initialize
  useEffect(() => {
    if (!conversationId) return;

    loadMessages();
    loadParticipants();

    // Join conversation room
    chatSocket.joinConversation(conversationId);

    // Cleanup
    return () => {
      chatSocket.leaveConversation(conversationId);
    };
  }, [conversationId, loadMessages, loadParticipants]);

  // Listen for real-time events
  useEffect(() => {
    const handleNewMessage = (message: ChatMessage) => {
      if (message.conversationId === conversationId) {
        setMessages(prev => [...prev, message]);
        scrollToBottom();
        
        // Mark as read if not own message
        if (!message.isOwn) {
          setTimeout(() => markAsRead(), 500);
        }
      }
    };

    const handleUserTyping = (data: { userId: string; userName: string; conversationId: string; isTyping: boolean }) => {
      if (data.conversationId === conversationId) {
        setTypingUsers(prev => {
          if (data.isTyping) {
            return prev.includes(data.userName) ? prev : [...prev, data.userName];
          } else {
            return prev.filter(name => name !== data.userName);
          }
        });
      }
    };

    const handleMessageDeleted = (data: { messageId: string; conversationId: string }) => {
      if (data.conversationId === conversationId) {
        setMessages(prev => prev.filter(m => m.id !== data.messageId));
      }
    };

    chatSocket.on('new-message', handleNewMessage);
    chatSocket.on('user-typing', handleUserTyping);
    chatSocket.on('message-deleted', handleMessageDeleted);

    return () => {
      chatSocket.off('new-message', handleNewMessage);
      chatSocket.off('user-typing', handleUserTyping);
      chatSocket.off('message-deleted', handleMessageDeleted);
    };
  }, [conversationId, scrollToBottom, markAsRead]);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  return {
    messages,
    participants,
    loading,
    error,
    typingUsers,
    messagesEndRef,
    sendMessage,
    sendTypingIndicator,
    markAsRead,
    refetch: loadMessages,
  };
}
