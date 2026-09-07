import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getAllConversations, type Conversation } from '../lib/chatMockData';
import { chatSocket } from '../lib/socket/chatSocket';

interface NotificationsContextType {
  conversations: Conversation[];
  totalUnread: number;
  markConversationRead: (conversationId: string) => void;
  markAllRead: () => void;
  addIncoming: (conversationId: string) => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children, currentScreen }: { children: ReactNode; currentScreen: string }) {
  const [conversations, setConversations] = useState<Conversation[]>(() => getAllConversations());

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  const markConversationRead = useCallback((conversationId: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c))
    );
  }, []);

  const markAllRead = useCallback(() => {
    setConversations((prev) => prev.map((c) => ({ ...c, unreadCount: 0 })));
  }, []);

  const addIncoming = useCallback((conversationId: string) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId ? { ...c, unreadCount: c.unreadCount + 1 } : c
      )
    );
  }, []);

  // Mark all chat notifications read when user enters chat screens
  useEffect(() => {
    if (currentScreen === 'chat-dashboard' || currentScreen === 'chat') {
      markAllRead();
    }
  }, [currentScreen, markAllRead]);

  // Listen for real-time new messages and increment unread if not on chat screens
  useEffect(() => {
    const isChatScreen = currentScreen === 'chat-dashboard' || currentScreen === 'chat';

    function handleNewMessage(message: { conversationId: string; senderId: string }) {
      if (!isChatScreen) {
        addIncoming(message.conversationId);
      }
    }

    chatSocket.on('new-message', handleNewMessage);
    return () => {
      chatSocket.off('new-message', handleNewMessage);
    };
  }, [currentScreen, addIncoming]);

  return (
    <NotificationsContext.Provider value={{ conversations, totalUnread, markConversationRead, markAllRead, addIncoming }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
}
