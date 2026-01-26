import { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ArrowLeft, Copy, Share2, Users, ShoppingCart, MessageCircle, Package, Store, Info } from 'lucide-react';
import type { Screen } from '../../App';
import { mockGroups } from '../../lib/mockData';
import { 
  getConversationById, 
  groupConversations, 
  vendorConversations,
  type Conversation 
} from '../../lib/chatMockData';
import { ChatWindow } from '../chat/ChatWindow';

interface GroupDetailProps {
  navigate: (screen: Screen, groupId?: string) => void;
  groupId: string | null;
}

export function GroupDetailNew({ navigate, groupId }: GroupDetailProps) {
  const group = mockGroups.find(g => g.id === (groupId || '1')) || mockGroups[0];
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedChat, setSelectedChat] = useState<Conversation | null>(null);

  // Find conversations for this group
  const groupInternalChat = groupConversations.find(c => c.groupId === group.id);
  const groupVendorChats = vendorConversations.filter(c => c.groupId === group.id);

  // Mock orders for this group
  const orders = [
    { id: '1', product: 'Premium Organic Rice (25kg)', status: 'In Progress', amount: 45.99 },
    { id: '2', product: 'Olive Oil Extra Virgin (5L)', status: 'Pending', amount: 38.99 },
  ];

  // If a chat is selected, show full chat window
  if (selectedChat) {
    return (
      <ChatWindow
        conversation={selectedChat}
        onBack={() => setSelectedChat(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F4F5] pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0047AB] to-[#6EE7B7] p-4 lg:p-6">
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('home')}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h3 className="text-white flex-1">{group.name}</h3>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10"
          >
            <Share2 className="w-5 h-5" />
          </Button>
        </div>

        <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex -space-x-2">
                {group.members.slice(0, 5).map((member) => (
                  <Avatar key={member.id} className="h-8 w-8 border-2 border-white">
                    <AvatarImage src={member.avatar} />
                    <AvatarFallback>{member.name[0]}</AvatarFallback>
                  </Avatar>
                ))}
                {group.members.length > 5 && (
                  <div className="h-8 w-8 rounded-full bg-white/20 border-2 border-white flex items-center justify-center">
                    <span className="text-xs text-white">+{group.members.length - 5}</span>
                  </div>
                )}
              </div>
              <Badge className="bg-white/20 text-white border-white/30">
                {group.members.length} members
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-white">
                <span>MOQ Progress</span>
                <span>{group.currentQuantity}/{group.moqTarget} units</span>
              </div>
              <Progress value={group.progress} className="h-2 bg-white/20" />
            </div>

            <div className="flex items-center gap-2 mt-3">
              <div className="flex-1 bg-white/10 rounded-lg p-2 flex items-center gap-2">
                <Copy className="w-4 h-4 text-white" />
                <span className="text-white text-sm">{group.joinCode}</span>
              </div>
              <Button size="sm" className="bg-[#FACC15] text-[#0047AB] hover:bg-[#FACC15]/90">
                Invite
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-3 p-4 lg:p-6">
        <Button
          variant="outline"
          className="flex flex-col items-center gap-2 h-auto py-3"
          onClick={() => navigate('products', group.id)}
        >
          <ShoppingCart className="w-5 h-5 text-[#0047AB]" />
          <span className="text-xs">Add Items</span>
        </Button>
        <Button
          variant="outline"
          className="flex flex-col items-center gap-2 h-auto py-3"
          onClick={() => navigate('cart', group.id)}
        >
          <Package className="w-5 h-5 text-[#0047AB]" />
          <span className="text-xs">View Cart</span>
        </Button>
        <Button
          variant="outline"
          className="flex flex-col items-center gap-2 h-auto py-3"
          onClick={() => setActiveTab('chat')}
        >
          <MessageCircle className="w-5 h-5 text-[#0047AB]" />
          <span className="text-xs">Chats</span>
          {groupInternalChat && groupInternalChat.unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 bg-[#FB7185] text-white h-5 min-w-5 text-xs">
              {groupInternalChat.unreadCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Tabs */}
      <div className="px-4 lg:px-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">
              <Info className="w-4 h-4 mr-1" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="chat">
              <MessageCircle className="w-4 h-4 mr-1" />
              Chat
              {groupInternalChat && groupInternalChat.unreadCount > 0 && (
                <Badge className="ml-1 bg-[#FB7185] text-white h-4 min-w-4 text-[10px] p-0 flex items-center justify-center">
                  {groupInternalChat.unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="vendors">
              <Store className="w-4 h-4 mr-1" />
              Vendors
              {groupVendorChats.reduce((sum, c) => sum + c.unreadCount, 0) > 0 && (
                <Badge className="ml-1 bg-[#FB7185] text-white h-4 min-w-4 text-[10px] p-0 flex items-center justify-center">
                  {groupVendorChats.reduce((sum, c) => sum + c.unreadCount, 0)}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="members">
              <Users className="w-4 h-4 mr-1" />
              Members
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-4 space-y-4">
            <Card>
              <CardContent className="p-4">
                <h4 className="font-semibold mb-2">About This Group</h4>
                <p className="text-sm text-gray-600 mb-4">
                  {group.description}
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Status</span>
                    <Badge className="bg-[#6EE7B7] text-gray-900">
                      {group.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Created</span>
                    <span>2 weeks ago</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Your Role</span>
                    <Badge variant="outline">Member</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Orders */}
            <div>
              <h4 className="font-semibold mb-3">Recent Orders</h4>
              <div className="space-y-2">
                {orders.map((order) => (
                  <Card key={order.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h5 className="text-sm mb-1">{order.product}</h5>
                          <Badge
                            variant={order.status === 'In Progress' ? 'default' : 'secondary'}
                            className={order.status === 'In Progress' ? 'bg-[#6EE7B7] text-gray-900' : ''}
                          >
                            {order.status}
                          </Badge>
                        </div>
                        <span className="text-[#0047AB] font-semibold">₦{order.amount}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate('tracking')}
                >
                  View All Orders
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Chat Tab - Internal Group Chat */}
          <TabsContent value="chat" className="mt-4">
            {groupInternalChat ? (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="w-5 h-5 text-[#0047AB]" />
                      <div>
                        <h4 className="font-semibold">Group Chat</h4>
                        <p className="text-xs text-gray-500">
                          {group.members.length} members
                        </p>
                      </div>
                    </div>
                    {groupInternalChat.unreadCount > 0 && (
                      <Badge className="bg-[#FB7185] text-white">
                        {groupInternalChat.unreadCount} new
                      </Badge>
                    )}
                  </div>

                  {/* Last message preview */}
                  {groupInternalChat.lastMessage && (
                    <div className="bg-gray-50 rounded-lg p-3 mb-4">
                      <div className="flex items-start gap-2">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="bg-[#0047AB] text-white text-xs">
                            {groupInternalChat.lastMessage.senderAvatar || 
                             groupInternalChat.lastMessage.senderName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">
                              {groupInternalChat.lastMessage.senderName}
                            </span>
                            <span className="text-xs text-gray-400">
                              {new Date(groupInternalChat.lastMessage.timestamp).toLocaleTimeString([], {
                                hour: 'numeric',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 truncate">
                            {groupInternalChat.lastMessage.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <Button
                    className="w-full bg-[#0047AB]"
                    onClick={() => setSelectedChat(groupInternalChat)}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Open Group Chat
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No group chat available</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Vendors Tab - Group-Vendor Chats */}
          <TabsContent value="vendors" className="mt-4">
            <div className="space-y-3">
              {groupVendorChats.length > 0 ? (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-blue-800">
                        All members can see vendor conversations for transparency. 
                        Only group admin can send messages.
                      </p>
                    </div>
                  </div>

                  {groupVendorChats.map((vendorChat) => (
                    <Card key={vendorChat.id} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="p-4" onClick={() => setSelectedChat(vendorChat)}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-10 h-10 bg-[#0047AB] text-white">
                              <AvatarFallback className="bg-[#0047AB] text-white">
                                {vendorChat.avatar || vendorChat.title.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h4 className="font-semibold">{vendorChat.title}</h4>
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <Store className="w-3 h-3" />
                                <span>
                                  {vendorChat.isOnline ? 'Online' : 'Offline'}
                                </span>
                              </div>
                            </div>
                          </div>
                          {vendorChat.unreadCount > 0 && (
                            <Badge className="bg-[#FB7185] text-white">
                              {vendorChat.unreadCount}
                            </Badge>
                          )}
                        </div>

                        {/* Last message */}
                        {vendorChat.lastMessage && (
                          <div className="bg-gray-50 rounded-lg p-2">
                            <p className="text-sm text-gray-600 truncate">
                              {vendorChat.lastMessage.content}
                            </p>
                            <span className="text-xs text-gray-400">
                              {new Date(vendorChat.lastMessage.timestamp).toLocaleTimeString([], {
                                hour: 'numeric',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Store className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 mb-2">No vendor conversations yet</p>
                    <p className="text-sm text-gray-400">
                      Start browsing products to connect with vendors
                    </p>
                    <Button
                      className="mt-4"
                      onClick={() => navigate('products', group.id)}
                    >
                      Browse Products
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Members Tab */}
          <TabsContent value="members" className="mt-4 space-y-3">
            {group.members.map((member) => (
              <Card key={member.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={member.avatar} />
                      <AvatarFallback>{member.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h5>{member.name}</h5>
                      <p className="text-sm text-gray-500">Member</p>
                    </div>
                    <Button variant="ghost" size="sm">
                      <MessageCircle className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
