import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type {
  ChatMessage,
  Conversation,
  ConversationParticipant,
  TypingUser,
} from '../../lib/types/chat.types';
import {
  getUserConversations,
  getMessages,
  getConversationParticipants,
} from '../../lib/api/chatApi';

// ============================================
// STATE INTERFACE
// ============================================

interface ChatState {
  // Conversations List
  conversations: Conversation[];
  conversationsLoading: boolean;
  conversationsError: string | null;
  
  // Messages (keyed by conversationId)
  messagesByConversation: Record<string, ChatMessage[]>;
  messagesLoading: Record<string, boolean>;
  messagesError: Record<string, string | null>;
  
  // Participants (keyed by conversationId)
  participantsByConversation: Record<string, ConversationParticipant[]>;
  
  // Real-time State
  typingUsersByConversation: Record<string, TypingUser[]>;
  onlineUsers: Record<string, boolean>; // userId → isOnline
  
  // UI State
  selectedConversationId: string | null;
  
  // Optimistic Updates
  pendingMessages: Record<string, ChatMessage>; // tempId → message
}

const initialState: ChatState = {
  conversations: [],
  conversationsLoading: false,
  conversationsError: null,
  
  messagesByConversation: {},
  messagesLoading: {},
  messagesError: {},
  
  participantsByConversation: {},
  
  typingUsersByConversation: {},
  onlineUsers: {},
  
  selectedConversationId: null,
  
  pendingMessages: {},
};

// ============================================
// ASYNC THUNKS
// ============================================

export const fetchConversations = createAsyncThunk(
  'chat/fetchConversations',
  async (filters?: { type?: 'group' | 'group-vendor' | 'direct'; groupId?: string }, { rejectWithValue }) => {
    try {
      const conversations = await getUserConversations(filters);
      return conversations;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const fetchMessages = createAsyncThunk(
  'chat/fetchMessages',
  async (conversationId: string, { rejectWithValue }) => {
    try {
      const messages = await getMessages(conversationId);
      return { conversationId, messages };
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const fetchParticipants = createAsyncThunk(
  'chat/fetchParticipants',
  async (conversationId: string, { rejectWithValue }) => {
    try {
      const participants = await getConversationParticipants(conversationId);
      return { conversationId, participants };
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

// Optimistic message sending
export const sendMessage = createAsyncThunk(
  'chat/sendMessage',
  async (
    { conversationId, content, tempId }: { conversationId: string; content: string; tempId: string },
    { rejectWithValue, getState }
  ) => {
    try {
      // Actual sending happens via socket middleware
      // This thunk is mainly for tracking the async operation
      return { conversationId, tempId };
    } catch (error) {
      return rejectWithValue({ tempId, error: (error as Error).message });
    }
  }
);

// ============================================
// SLICE
// ============================================

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    // ============================================
    // SOCKET EVENT HANDLERS (called by middleware)
    // ============================================
    
    messageReceived: (state, action: PayloadAction<ChatMessage>) => {
      const message = action.payload;
      const { conversationId } = message;
      
      // Initialize array if needed
      if (!state.messagesByConversation[conversationId]) {
        state.messagesByConversation[conversationId] = [];
      }
      
      // Check if this is a pending optimistic message being confirmed
      if (message.tempId && state.pendingMessages[message.tempId]) {
        // Remove from pending
        delete state.pendingMessages[message.tempId];
        
        // Replace temp message with real one
        const messages = state.messagesByConversation[conversationId];
        const tempIndex = messages.findIndex(m => m.id === message.tempId);
        if (tempIndex !== -1) {
          messages[tempIndex] = message;
        } else {
          messages.push(message);
        }
      } else {
        // New message from another user (or our own echoed back)
        const messages = state.messagesByConversation[conversationId];
        
        // Dedup: don't add if already exists
        if (!messages.some(m => m.id === message.id)) {
          messages.push(message);
        }
      }
      
      // Update conversation's lastMessage
      const conversation = state.conversations.find(c => c.id === conversationId);
      if (conversation) {
        conversation.lastMessage = message;
        conversation.updatedAt = message.timestamp;
        
        // Increment unread count if not own message
        if (!message.isOwn) {
          conversation.unreadCount = (conversation.unreadCount || 0) + 1;
        }
      }
    },
    
    typingStatusChanged: (state, action: PayloadAction<{
      userId: string;
      userName: string;
      conversationId: string;
      isTyping: boolean;
    }>) => {
      const { conversationId, userId, userName, isTyping } = action.payload;
      
      if (!state.typingUsersByConversation[conversationId]) {
        state.typingUsersByConversation[conversationId] = [];
      }
      
      const typingUsers = state.typingUsersByConversation[conversationId];
      
      if (isTyping) {
        // Add user if not already typing
        if (!typingUsers.some(u => u.userId === userId)) {
          typingUsers.push({ userId, userName });
        }
      } else {
        // Remove user
        const index = typingUsers.findIndex(u => u.userId === userId);
        if (index !== -1) {
          typingUsers.splice(index, 1);
        }
      }
      
      // Also update conversation
      const conversation = state.conversations.find(c => c.id === conversationId);
      if (conversation) {
        conversation.typingUsers = typingUsers;
      }
    },
    
    userOnlineStatusChanged: (state, action: PayloadAction<{
      userId: string;
      isOnline: boolean;
    }>) => {
      const { userId, isOnline } = action.payload;
      state.onlineUsers[userId] = isOnline;
      
      // Update conversations that have this user as vendor
      state.conversations.forEach(conv => {
        if (conv.vendorId === userId) {
          conv.isOnline = isOnline;
        }
      });
      
      // Update participants
      Object.values(state.participantsByConversation).forEach(participants => {
        const participant = participants.find(p => p.userId === userId);
        if (participant) {
          participant.isOnline = isOnline;
        }
      });
    },
    
    messageDeleted: (state, action: PayloadAction<{
      messageId: string;
      conversationId: string;
    }>) => {
      const { messageId, conversationId } = action.payload;
      const messages = state.messagesByConversation[conversationId];
      if (messages) {
        const index = messages.findIndex(m => m.id === messageId);
        if (index !== -1) {
          messages.splice(index, 1);
        }
      }
    },
    
    conversationRead: (state, action: PayloadAction<string>) => {
      const conversationId = action.payload;
      const conversation = state.conversations.find(c => c.id === conversationId);
      if (conversation) {
        conversation.unreadCount = 0;
      }
    },
    
    // ============================================
    // UI ACTIONS
    // ============================================
    
    selectConversation: (state, action: PayloadAction<string | null>) => {
      state.selectedConversationId = action.payload;
    },
    
    addOptimisticMessage: (state, action: PayloadAction<{
      conversationId: string;
      message: ChatMessage;
    }>) => {
      const { conversationId, message } = action.payload;
      
      // Add to pending
      state.pendingMessages[message.id] = message;
      
      // Add to messages list
      if (!state.messagesByConversation[conversationId]) {
        state.messagesByConversation[conversationId] = [];
      }
      state.messagesByConversation[conversationId].push(message);
    },
    
    removeOptimisticMessage: (state, action: PayloadAction<{
      conversationId: string;
      tempId: string;
    }>) => {
      const { conversationId, tempId } = action.payload;
      
      // Remove from pending
      delete state.pendingMessages[tempId];
      
      // Remove from messages
      const messages = state.messagesByConversation[conversationId];
      if (messages) {
        const index = messages.findIndex(m => m.id === tempId);
        if (index !== -1) {
          messages.splice(index, 1);
        }
      }
    },
    
    clearChat: (state) => {
      return initialState;
    },
  },
  
  extraReducers: (builder) => {
    // Fetch Conversations
    builder
      .addCase(fetchConversations.pending, (state) => {
        state.conversationsLoading = true;
        state.conversationsError = null;
      })
      .addCase(fetchConversations.fulfilled, (state, action) => {
        state.conversationsLoading = false;
        state.conversations = action.payload;
      })
      .addCase(fetchConversations.rejected, (state, action) => {
        state.conversationsLoading = false;
        state.conversationsError = action.payload as string;
      });
    
    // Fetch Messages
    builder
      .addCase(fetchMessages.pending, (state, action) => {
        const conversationId = action.meta.arg;
        state.messagesLoading[conversationId] = true;
        state.messagesError[conversationId] = null;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        const { conversationId, messages } = action.payload;
        state.messagesLoading[conversationId] = false;
        state.messagesByConversation[conversationId] = messages;
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        const conversationId = action.meta.arg;
        state.messagesLoading[conversationId] = false;
        state.messagesError[conversationId] = action.payload as string;
      });
    
    // Fetch Participants
    builder
      .addCase(fetchParticipants.fulfilled, (state, action) => {
        const { conversationId, participants } = action.payload;
        state.participantsByConversation[conversationId] = participants;
      });
  },
});

export const {
  messageReceived,
  typingStatusChanged,
  userOnlineStatusChanged,
  messageDeleted,
  conversationRead,
  selectConversation,
  addOptimisticMessage,
  removeOptimisticMessage,
  clearChat,
} = chatSlice.actions;

export default chatSlice.reducer;
