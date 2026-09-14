/**
 * Chat Socket Middleware
 * Manages Socket.IO connection lifecycle and translates socket events to Redux actions
 */

import { Middleware } from '@reduxjs/toolkit';
import type { RootState, AppDispatch } from '../store';
import { chatSocket } from '../../lib/socket/chatSocket';
import type { ChatMessage } from '../../lib/types/chat.types';
import {
  messageReceived,
  typingStatusChanged,
  userOnlineStatusChanged,
  messageDeleted,
  conversationRead,
  selectConversation,
  fetchConversations,
  clearChat,
} from '../slices/chatSlice';
import { cartUpdated, cartCleared } from '../slices/cartSlice';

// Track which conversations and carts we've joined to avoid duplicate joins
const joinedConversations = new Set<string>();
const joinedCarts = new Set<string>();

export const chatSocketMiddleware: Middleware<
  {},
  RootState,
  AppDispatch
> = (store) => {
  // Setup socket event listeners once
  let listenersSetup = false;

  const setupSocketListeners = () => {
    if (listenersSetup) return;
    listenersSetup = true;

    // Listen for new messages
    chatSocket.on('new-message', (message: ChatMessage) => {
      const state = store.getState();
      // Get userId from Redux auth state
      const currentUserId = state.auth?.user?.id || localStorage.getItem('userId');
      
      // Compute isOwn from Redux state
      const messageWithOwnership: ChatMessage = {
        ...message,
        isOwn: message.senderId === currentUserId,
      };
      
      store.dispatch(messageReceived(messageWithOwnership));
    });

    // Listen for typing indicators
    chatSocket.on('user-typing', (data: {
      userId: string;
      userName: string;
      conversationId: string;
      isTyping: boolean;
    }) => {
      store.dispatch(typingStatusChanged(data));
    });

    // Listen for online status changes
    chatSocket.on('user-online-status', (data: {
      userId: string;
      isOnline: boolean;
    }) => {
      store.dispatch(userOnlineStatusChanged(data));
    });

    // Listen for message deletions
    chatSocket.on('message-deleted', (data: {
      messageId: string;
      conversationId: string;
    }) => {
      store.dispatch(messageDeleted(data));
    });

    // Listen for messages read
    chatSocket.on('messages-read', (data: {
      userId: string;
      conversationId: string;
      readAt: string;
    }) => {
      store.dispatch(conversationRead(data.conversationId));
    });

    // Listen for conversation join confirmation
    chatSocket.on('joined-conversation', (data: { conversationId: string }) => {
      // Conversation joined successfully
      console.log('Joined conversation:', data.conversationId);
    });

    // Listen for group cart updates
    chatSocket.on('cart-updated', (data: { groupId: string; items: any[]; updatedBy: string }) => {
      store.dispatch(cartUpdated(data));
    });

    // Listen for group cart cleared
    chatSocket.on('cart-cleared', (data: { groupId: string; clearedBy: string }) => {
      store.dispatch(cartCleared(data));
    });
  };

  return (next) => (action) => {
    const result = next(action);
    const state = store.getState();

    // Handle auth login/signup/bootstrap - connect socket
    if (
      action.type === 'auth/login/fulfilled' ||
      action.type === 'auth/signup/fulfilled' ||
      action.type === 'auth/bootstrapAuth/fulfilled'
    ) {
      const token = state.auth?.accessToken || localStorage.getItem('auth_token');
      if (token) {
        setupSocketListeners();
        chatSocket.connect(token);
      }
    }

    // Handle auth logout - disconnect socket and clear chat
    if (action.type === 'auth/logout') {
      chatSocket.disconnect();
      joinedConversations.clear();
      joinedCarts.clear();
      store.dispatch(clearChat());
    }

    // Handle cart group changes - join cart room
    if (action.type === 'cart/setCartGroup') {
      const groupId = action.payload;
      if (groupId && !joinedCarts.has(groupId)) {
        chatSocket.joinCart(groupId);
        joinedCarts.add(groupId);
      }
    }

    if (action.type === 'cart/fetchGroupCart/fulfilled') {
      const groupId = action.payload?.groupId;
      if (groupId && !joinedCarts.has(groupId)) {
        chatSocket.joinCart(groupId);
        joinedCarts.add(groupId);
      }
    }

    // Handle conversation selection - join room
    if (action.type === 'chat/selectConversation') {
      const conversationId = action.payload;
      if (conversationId && !joinedConversations.has(conversationId)) {
        chatSocket.joinConversation(conversationId);
        joinedConversations.add(conversationId);
      }
    }

    // Handle conversations fetched - join all rooms
    if (action.type === 'chat/fetchConversations/fulfilled') {
      const conversations = action.payload;
      conversations.forEach((conv: { id: string }) => {
        if (!joinedConversations.has(conv.id)) {
          chatSocket.joinConversation(conv.id);
          joinedConversations.add(conv.id);
        }
      });
    }

    // Handle send message - emit via socket
    if (action.type === 'chat/sendMessage/pending') {
      const { conversationId, content } = action.meta.arg;
      chatSocket.sendMessage(conversationId, content);
    }

    return result;
  };
};
