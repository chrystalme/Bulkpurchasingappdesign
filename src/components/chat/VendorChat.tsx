import { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Label } from '../ui/label';
import { ArrowLeft, Send, Calculator, Star } from 'lucide-react';
import type { Screen } from '../../App';

interface VendorChatProps {
  navigate: (screen: Screen, groupId?: string) => void;
  groupId: string | null;
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  time: string;
  isVendor?: boolean;
}

export function VendorChat({ navigate, groupId }: VendorChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      senderId: '1',
      senderName: 'Afam',
      text: 'Hi! We\'re a group of 3 looking to buy rice in bulk. What discounts can you offer?',
      time: '10:30 AM',
    },
    {
      id: '2',
      senderId: 'vendor',
      senderName: 'Fresh Farm Collective',
      text: 'Hello! Great to hear from you. For orders of 10 bags or more, we can offer 30% off. For 20+, that goes up to 40%.',
      time: '10:32 AM',
      isVendor: true,
    },
    {
      id: '3',
      senderId: '2',
      senderName: 'Chioma',
      text: 'That sounds good! We might be able to get 15 bags together.',
      time: '10:35 AM',
    },
    {
      id: '4',
      senderId: 'vendor',
      senderName: 'Fresh Farm Collective',
      text: 'Perfect! For 15 bags, I can give you 35% off. That would be ₦45.99 per bag instead of ₦65.99.',
      time: '10:37 AM',
      isVendor: true,
    },
  ]);

  const [newMessage, setNewMessage] = useState('');
  const [calculatorQuantity, setCalculatorQuantity] = useState('10');

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const message: Message = {
      id: String(messages.length + 1),
      senderId: '1',
      senderName: 'Afam',
      text: newMessage,
      time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    };

    setMessages([...messages, message]);
    setNewMessage('');
  };

  const calculateDiscount = (quantity: number) => {
    if (quantity >= 20) return { discount: 40, price: 39.99 };
    if (quantity >= 10) return { discount: 30, price: 45.99 };
    if (quantity >= 5) return { discount: 20, price: 52.79 };
    return { discount: 0, price: 65.99 };
  };

  const currentDiscount = calculateDiscount(parseInt(calculatorQuantity) || 0);

  return (
    <div className="min-h-screen bg-[#F4F4F5] flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 lg:p-6 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('group-detail', groupId)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Avatar className="h-10 w-10">
            <AvatarImage src="https://api.dicebear.com/7.x/initials/svg?seed=FFC" />
            <AvatarFallback>FF</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h4>Fresh Farm Collective</h4>
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-[#FACC15] text-[#FACC15]" />
              <span className="text-sm text-gray-600">4.8</span>
              <Badge variant="secondary" className="ml-2 text-xs bg-[#6EE7B7]/20">
                Verified
              </Badge>
            </div>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Calculator className="w-4 h-4 mr-1" />
                Calculator
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Bulk Discount Calculator</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Enter Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={calculatorQuantity}
                    onChange={(e) => setCalculatorQuantity(e.target.value)}
                    placeholder="Enter quantity"
                  />
                </div>

                <Card className="bg-gradient-to-br from-[#0047AB]/5 to-[#6EE7B7]/5">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Discount</span>
                      <span className="text-[#0047AB]">{currentDiscount.discount}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Price per unit</span>
                      <span className="text-[#0047AB]">₦{currentDiscount.price}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Total</span>
                      <span className="text-[#0047AB]">
                        ₦{(currentDiscount.price * (parseInt(calculatorQuantity) || 0)).toFixed(2)}
                      </span>
                    </div>
                    <div className="bg-[#FACC15]/20 rounded-lg p-3 text-sm text-center text-[#0047AB]">
                      You save ₦{((65.99 - currentDiscount.price) * (parseInt(calculatorQuantity) || 0)).toFixed(2)}!
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-2">
                  <h5>Price Tiers</h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span>5-9 units</span>
                      <span className="text-[#0047AB]">20% off (₦52.79)</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span>10-19 units</span>
                      <span className="text-[#0047AB]">30% off (₦45.99)</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span>20+ units</span>
                      <span className="text-[#0047AB]">40% off (₦39.99)</span>
                    </div>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4 max-w-4xl lg:mx-auto w-full">
        {messages.map((message) => {
          const isCurrentUser = message.senderId === '1';
          const member = mockMembers.find(m => m.id === message.senderId);

          return (
            <div
              key={message.id}
              className={`flex gap-3 ${isCurrentUser ? 'flex-row-reverse' : ''}`}
            >
              {!isCurrentUser && (
                <Avatar className="h-8 w-8 flex-shrink-0">
                  {message.isVendor ? (
                    <>
                      <AvatarImage src="https://api.dicebear.com/7.x/initials/svg?seed=FFC" />
                      <AvatarFallback>FF</AvatarFallback>
                    </>
                  ) : (
                    <>
                      <AvatarImage src={member?.avatar} />
                      <AvatarFallback>{message.senderName[0]}</AvatarFallback>
                    </>
                  )}
                </Avatar>
              )}

              <div className={`flex-1 max-w-[75%] ${isCurrentUser ? 'items-end' : ''}`}>
                <div className={`flex items-center gap-2 mb-1 ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                  <span className="text-sm">{message.senderName}</span>
                  {message.isVendor && (
                    <Badge variant="secondary" className="text-xs bg-[#0047AB] text-white">
                      Vendor
                    </Badge>
                  )}
                  <span className="text-xs text-gray-400">{message.time}</span>
                </div>
                <div
                  className={`rounded-lg p-3 ${
                    isCurrentUser
                      ? 'bg-[#0047AB] text-white rounded-tr-none'
                      : message.isVendor
                      ? 'bg-[#6EE7B7]/20 rounded-tl-none'
                      : 'bg-gray-100 rounded-tl-none'
                  }`}
                >
                  <p className="text-sm">{message.text}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:p-6 flex-shrink-0">
        <div className="max-w-4xl lg:mx-auto">
        <div className="flex gap-2">
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            className="bg-[#0047AB] hover:bg-[#0047AB]/90"
            disabled={!newMessage.trim()}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        </div>
      </div>
    </div>
  );
}