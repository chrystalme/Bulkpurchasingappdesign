import { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ArrowLeft, Copy, Share2, Users, ShoppingCart, MessageCircle, Package } from 'lucide-react';
import type { Screen } from '../../App';
import { mockGroups } from '../../lib/mockData';

interface GroupDetailProps {
  navigate: (screen: Screen, groupId?: string) => void;
  groupId: string | null;
}

export function GroupDetail({ navigate, groupId }: GroupDetailProps) {
  const group = mockGroups.find(g => g.id === (groupId || '1')) || mockGroups[0];
  const [activeTab, setActiveTab] = useState('chat');

  const messages = [
    { id: '1', memberId: '2', text: "Hey everyone! I found a great deal on rice!", time: '10:30 AM' },
    { id: '2', memberId: '1', text: "That sounds good! How much?", time: '10:32 AM' },
    { id: '3', memberId: '3', text: "I'm interested too!", time: '10:35 AM' },
  ];

  const orders = [
    { id: '1', product: 'Premium Organic Rice (25kg)', status: 'In Progress', amount: 45.99 },
    { id: '2', product: 'Olive Oil Extra Virgin (5L)', status: 'Pending', amount: 38.99 },
  ];

  return (
    <div className="min-h-screen bg-[#F4F4F5]">
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
                {group.members.map((member) => (
                  <Avatar key={member.id} className="h-8 w-8 border-2 border-white">
                    <AvatarImage src={member.avatar} />
                    <AvatarFallback>{member.name[0]}</AvatarFallback>
                  </Avatar>
                ))}
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
      <div className="grid grid-cols-3 md:grid-cols-3 lg:max-w-2xl lg:mx-auto gap-3 p-4 lg:p-6">
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
          onClick={() => navigate('chat', group.id)}
        >
          <MessageCircle className="w-5 h-5 text-[#0047AB]" />
          <span className="text-xs">Chat</span>
        </Button>
      </div>

      {/* Tabs */}
      <div className="px-4 lg:px-6 max-w-4xl lg:mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="mt-4 space-y-3">
            {messages.map((message) => {
              const member = group.members.find(m => m.id === message.memberId);
              if (!member) return null;

              return (
                <div key={message.id} className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.avatar} />
                    <AvatarFallback>{member.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm">{member.name}</span>
                      <span className="text-xs text-gray-400">{message.time}</span>
                    </div>
                    <div className="bg-gray-100 rounded-lg rounded-tl-none p-3">
                      <p className="text-sm">{message.text}</p>
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="pt-4">
              <Button
                className="w-full bg-[#0047AB]"
                onClick={() => navigate('chat', group.id)}
              >
                Open Full Chat
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="orders" className="mt-4 space-y-3">
            {orders.map((order) => (
              <Card key={order.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h5 className="mb-1">{order.product}</h5>
                      <Badge
                        variant={order.status === 'In Progress' ? 'default' : 'secondary'}
                        className={order.status === 'In Progress' ? 'bg-[#6EE7B7]' : ''}
                      >
                        {order.status}
                      </Badge>
                    </div>
                    <span className="text-[#0047AB]">₦{order.amount}</span>
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
          </TabsContent>

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
                      <p className="text-sm text-gray-500">Active member</p>
                    </div>
                    <Badge variant="secondary" className="bg-[#6EE7B7]/20">
                      <Users className="w-3 h-3 mr-1" />
                      Member
                    </Badge>
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