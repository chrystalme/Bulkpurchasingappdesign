import { useState } from 'react';
import { MessageCircle, Users, Store, Search, ArrowLeft } from 'lucide-react';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { ScrollArea } from '../ui/scroll-area';
import { Screen } from '../../App';
import {
  getConversationById,
  formatTimestamp,
  type Conversation,
  type ConversationType,
} from '../../lib/chatMockData';
import { ChatWindow } from './ChatWindow';
import { useNotifications } from '../../contexts/NotificationsContext';

interface ChatDashboardProps {
  navigate: (screen: Screen, groupId?: string) => void;
}

export function ChatDashboard({ navigate }: ChatDashboardProps) {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'group' | 'vendor'>('all');
  const { conversations: allConversations, markConversationRead } = useNotifications();

  const handleSelectConversation = (id: string) => {
    markConversationRead(id);
    setSelectedConversation(id);
  };

  // Filter conversations based on search and active tab
  const filteredConversations = allConversations.filter((conv) => {
    const matchesSearch = conv.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab =
      activeTab === 'all' ||
      (activeTab === 'group' && conv.type === 'group') ||
      (activeTab === 'vendor' && conv.type === 'group-vendor');
    return matchesSearch && matchesTab;
  });

  // Count unread messages by type
  const unreadCounts = {
    all: allConversations.reduce((sum, c) => sum + c.unreadCount, 0),
    group: allConversations
      .filter((c) => c.type === 'group')
      .reduce((sum, c) => sum + c.unreadCount, 0),
    vendor: allConversations
      .filter((c) => c.type === 'group-vendor')
      .reduce((sum, c) => sum + c.unreadCount, 0),
  };

  const selectedConv = selectedConversation
    ? getConversationById(selectedConversation)
    : null;

  if (selectedConv) {
    return (
      <ChatWindow
        conversation={selectedConv}
        onBack={() => setSelectedConversation(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F4F5] pb-20">
      {/* Header */}
      <div className="bg-[#0047AB] text-white p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-6 h-6" />
            <h1 className="text-xl font-semibold">Messages</h1>
          </div>
          {unreadCounts.all > 0 && (
            <Badge className="bg-[#FB7185] text-white">
              {unreadCounts.all} new
            </Badge>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/60"
          />
        </div>
      </div>

      {/* Tabs */}
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

        <TabsContent value="all" className="mt-0">
          <ConversationList
            conversations={filteredConversations}
            onSelect={handleSelectConversation}
          />
        </TabsContent>

        <TabsContent value="group" className="mt-0">
          <ConversationList
            conversations={filteredConversations.filter((c) => c.type === 'group')}
            onSelect={handleSelectConversation}
          />
        </TabsContent>

        <TabsContent value="vendor" className="mt-0">
          <ConversationList
            conversations={filteredConversations.filter((c) => c.type === 'group-vendor')}
            onSelect={handleSelectConversation}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface ConversationListProps {
  conversations: Conversation[];
  onSelect: (id: string) => void;
}

function ConversationList({ conversations, onSelect }: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <MessageCircle className="w-12 h-12 mb-2 opacity-50" />
        <p>No conversations found</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-240px)]">
      <div className="divide-y">
        {conversations.map((conversation) => (
          <ConversationItem
            key={conversation.id}
            conversation={conversation}
            onClick={() => onSelect(conversation.id)}
          />
        ))}
      </div>
    </ScrollArea>
  );
}

interface ConversationItemProps {
  conversation: Conversation;
  onClick: () => void;
}

function ConversationItem({ conversation, onClick }: ConversationItemProps) {
  const isTyping = conversation.typingUsers && conversation.typingUsers.length > 0;
  const typingUser = isTyping
    ? conversation.participants.find((p) => p.userId === conversation.typingUsers![0])
    : null;

  return (
    <div
      onClick={onClick}
      className="flex items-start gap-3 p-4 hover:bg-gray-50 cursor-pointer transition-colors bg-white"
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <Avatar className="w-12 h-12 bg-[#0047AB] text-white">
          <AvatarFallback className="bg-[#0047AB] text-white text-lg">
            {conversation.avatar || conversation.title.charAt(0)}
          </AvatarFallback>
        </Avatar>
        {conversation.type === 'vendor' && conversation.isOnline && (
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#6EE7B7] border-2 border-white rounded-full"></div>
        )}
        {conversation.type === 'group' && (
          <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
            <Users className="w-3 h-3 text-[#0047AB]" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between mb-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 truncate">
              {conversation.title}
            </h3>
            {conversation.type === 'group' && (
              <Badge variant="outline" className="text-xs border-[#0047AB] text-[#0047AB]">
                {conversation.participants.length}
              </Badge>
            )}
          </div>
          {conversation.lastMessage && (
            <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
              {formatTimestamp(conversation.lastMessage.timestamp)}
            </span>
          )}
        </div>

        {/* Last Message or Typing Indicator */}
        <div className="flex items-center justify-between">
          <p
            className={`text-sm truncate ${
              conversation.unreadCount > 0 ? 'font-semibold text-gray-900' : 'text-gray-600'
            }`}
          >
            {isTyping ? (
              <span className="text-[#6EE7B7] flex items-center gap-1">
                <span className="animate-pulse">●</span>
                {typingUser?.name || 'Someone'} is typing...
              </span>
            ) : conversation.lastMessage ? (
              <>
                {conversation.type === 'group' && conversation.lastMessage.senderId !== 'user-001' && (
                  <span className="font-medium">{conversation.lastMessage.senderName}: </span>
                )}
                {conversation.lastMessage.content}
              </>
            ) : (
              <span className="text-gray-400">No messages yet</span>
            )}
          </p>

          {conversation.unreadCount > 0 && (
            <Badge className="bg-[#FB7185] text-white ml-2 flex-shrink-0">
              {conversation.unreadCount}
            </Badge>
          )}
        </div>

        {/* Type indicator */}
        <div className="flex items-center gap-1 mt-1">
          {conversation.type === 'group-vendor' ? (
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
      </div>
    </div>
  );
}