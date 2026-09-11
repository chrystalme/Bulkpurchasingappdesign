import { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, Search, MessageCircle, Users, Store } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Card, CardContent } from '../ui/card';
import { ChatWindowReal } from './ChatWindowReal';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { fetchConversations, selectConversation } from '../../store/slices/chatSlice';
import { useAuth } from '../../contexts/AuthContext';
import type { Screen } from '../../App';
import { parseDate } from '../../lib/formatters';

interface ChatDashboardRealProps {
  navigate: (screen: Screen) => void;
}

export function ChatDashboardReal({ navigate }: ChatDashboardRealProps) {
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const isVendor = user?.role === 'vendor';

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'group' | 'vendor'>('all');

  const conversations = useAppSelector(state => state.chat.conversations);
  const loading = useAppSelector(state => state.chat.conversationsLoading);
  const error = useAppSelector(state => state.chat.conversationsError);
  const selectedConversationId = useAppSelector(state => state.chat.selectedConversationId);

  // Fetch conversations on mount
  useEffect(() => {
    dispatch(fetchConversations());
  }, [dispatch]);

  const selectedConversation = useMemo(
    () => selectedConversationId
      ? conversations.find(conversation => conversation.id === selectedConversationId) || null
      : null,
    [selectedConversationId, conversations],
  );

  // Filter conversations
  const filteredConversations = useMemo(() => {
    return conversations.filter((conv) => {
      const searchTarget = isVendor
        ? `${conv.groupName || ''} ${conv.title} ${conv.lastMessage?.content || ''}`
        : `${conv.title} ${conv.groupName || ''} ${conv.lastMessage?.content || ''}`;
      const matchesSearch = searchTarget.toLowerCase().includes(searchQuery.toLowerCase());

      // Vendors only participate in group-vendor chats; no internal tab needed
      if (isVendor) {
        return matchesSearch;
      }

      const matchesTab =
        activeTab === 'all' ||
        (activeTab === 'group' && conv.type === 'group') ||
        (activeTab === 'vendor' && conv.type === 'group-vendor');
      return matchesSearch && matchesTab;
    });
  }, [conversations, searchQuery, activeTab, isVendor]);

  // Count unread messages by type
  const unreadCounts = useMemo(() => ({
    all: conversations.reduce((sum, c) => sum + c.unreadCount, 0),
    group: conversations
      .filter((c) => c.type === 'group')
      .reduce((sum, c) => sum + c.unreadCount, 0),
    vendor: conversations
      .filter((c) => c.type === 'group-vendor')
      .reduce((sum, c) => sum + c.unreadCount, 0),
  }), [conversations]);

  // Format timestamp
  const formatTime = (timestamp: string) => {
    const date = parseDate(timestamp);
    if (!date) return '';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  // If a conversation is selected, show the chat window
  if (selectedConversation) {
    return (
      <ChatWindowReal
        conversation={selectedConversation}
        onBack={() => dispatch(selectConversation(null))}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F4F5] pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0047AB] to-[#6EE7B7] p-4 sticky top-0 z-20">
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(isVendor ? 'vendor-dashboard' : 'home')}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h2 className="text-white text-xl font-semibold">
              {isVendor ? 'Group Messages' : 'Messages'}
            </h2>
            {unreadCounts.all > 0 ? (
              <p className="text-white/80 text-sm">{unreadCounts.all} unread</p>
            ) : isVendor ? (
              <p className="text-white/80 text-sm">Chats with purchasing groups</p>
            ) : null}
          </div>
          <MessageCircle className="w-6 h-6 text-white" />
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder={isVendor ? 'Search group chats or messages...' : 'Search conversations...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/90 border-0"
          />
        </div>
      </div>

      {/* Tabs - only for regular members who navigate both internal and vendor chats */}
      {!isVendor && (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <div className="bg-white border-b sticky top-[136px] z-10">
            <TabsList className="w-full grid grid-cols-3 h-12 bg-transparent rounded-none">
              <TabsTrigger
                value="all"
                className="data-[state=active]:border-b-2 data-[state=active]:border-[#0047AB] rounded-none"
              >
                All
                {unreadCounts.all > 0 && (
                  <Badge className="ml-2 bg-[#FB7185] text-white text-xs">
                    {unreadCounts.all}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="group"
                className="data-[state=active]:border-b-2 data-[state=active]:border-[#0047AB] rounded-none"
              >
                <Users className="w-4 h-4 mr-1" />
                Internal
                {unreadCounts.group > 0 && (
                  <Badge className="ml-2 bg-[#FB7185] text-white text-xs">
                    {unreadCounts.group}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="vendor"
                className="data-[state=active]:border-b-2 data-[state=active]:border-[#0047AB] rounded-none"
              >
                <Store className="w-4 h-4 mr-1" />
                Vendors
                {unreadCounts.vendor > 0 && (
                  <Badge className="ml-2 bg-[#FB7185] text-white text-xs">
                    {unreadCounts.vendor}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </div>
        </Tabs>
      )}

      {/* Conversation List */}
      <div className="p-4 space-y-2">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-[#0047AB] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-red-500">{error}</p>
              <Button className="mt-4" onClick={() => dispatch(fetchConversations())}>
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : filteredConversations.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              {isVendor ? (
                <>
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="font-medium text-gray-700">No group messages found</p>
                  <p className="text-sm text-gray-400 mt-2">
                    {searchQuery
                      ? 'Try a different search term'
                      : 'Purchasing groups will appear here when they reach out to negotiate orders.'}
                  </p>
                </>
              ) : (
                <>
                  <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No conversations found</p>
                  {searchQuery && (
                    <p className="text-sm text-gray-400 mt-2">Try a different search term</p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredConversations.map((conversation) => {
            const displayName = isVendor
              ? (conversation.groupName || conversation.title)
              : conversation.title;

            return (
              <Card
                key={conversation.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => dispatch(selectConversation(conversation.id))}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="relative">
                      <Avatar className="w-12 h-12 bg-[#0047AB] text-white">
                        <AvatarFallback className="bg-[#0047AB] text-white font-medium">
                          {displayName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {!isVendor && conversation.isOnline && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#6EE7B7] rounded-full border-2 border-white" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <h4 className="font-semibold truncate">{displayName}</h4>
                        {conversation.lastMessage && (
                          <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                            {formatTime(conversation.lastMessage.timestamp)}
                          </span>
                        )}
                      </div>

                      {/* Type indicator */}
                      <div className="flex items-center gap-1 mt-1">
                        {isVendor ? (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Users className="w-3.5 h-3.5 text-[#0047AB]" />
                            <span className="font-medium text-[#0047AB]">Purchasing Group</span>
                            {conversation.lastMessage?.senderName && (
                              <span className="text-gray-400 truncate">
                                · From {conversation.lastMessage.senderName}
                              </span>
                            )}
                          </div>
                        ) : conversation.type === 'group-vendor' ? (
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Store className="w-3 h-3" />
                              <span>Group ⟷ Vendor</span>
                            </div>
                            {conversation.groupName && (
                              <span className="text-xs text-gray-400">for {conversation.groupName}</span>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Users className="w-3 h-3" />
                            <span>Internal Chat</span>
                          </div>
                        )}
                      </div>

                      {/* Last message */}
                      {conversation.lastMessage && (
                        <p className="text-sm text-gray-600 truncate mt-1">
                          {conversation.lastMessage.senderName}: {conversation.lastMessage.content}
                        </p>
                      )}

                      {/* Typing indicator */}
                      {conversation.typingUsers && conversation.typingUsers.length > 0 && (
                        <p className="text-sm text-[#0047AB] italic mt-1">
                          {conversation.typingUsers[0].userName} is typing...
                        </p>
                      )}
                    </div>

                    {/* Unread badge */}
                    {conversation.unreadCount > 0 && (
                      <Badge className="bg-[#FB7185] text-white ml-2 flex-shrink-0">
                        {conversation.unreadCount}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
