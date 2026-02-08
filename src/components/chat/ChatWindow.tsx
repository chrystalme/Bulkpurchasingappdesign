import { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Send,
  Users,
  Store,
  MoreVertical,
  Phone,
  Video,
  Info,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Alert, AlertDescription } from '../ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  getMessagesForConversation,
  formatMessageTime,
  currentUserId,
  isGroupAdmin,
  type Conversation,
  type ChatMessage,
} from '../../lib/chatMockData';

interface ChatWindowProps {
  conversation: Conversation;
  onBack: () => void;
}

export function ChatWindow({ conversation, onBack }: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    getMessagesForConversation(conversation.id),
  );
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check if current user can send messages
  const canSendMessages =
    conversation.type === 'group' ||
    (conversation.type === 'group-vendor' && isGroupAdmin(conversation));

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Simulate typing indicator
  useEffect(() => {
    if (conversation.typingUsers && conversation.typingUsers.length > 0) {
      setIsTyping(true);
    } else {
      setIsTyping(false);
    }
  }, [conversation.typingUsers]);

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      conversationId: conversation.id,
      senderId: currentUserId,
      senderName: 'You',
      content: inputValue,
      timestamp: new Date().toISOString(),
      read: true,
      isOwn: true,
    };

    setMessages(prev => [...prev, newMessage]);
    setInputValue('');

    // Simulate vendor/member response after 2-3 seconds
    if (conversation.type === 'vendor') {
      setTimeout(() => {
        const vendorResponse: ChatMessage = {
          id: `msg-${Date.now()}-response`,
          conversationId: conversation.id,
          senderId: conversation.vendorId || 'vendor',
          senderName: conversation.title,
          senderAvatar: conversation.avatar,
          content: getAutoResponse(inputValue, 'vendor'),
          timestamp: new Date().toISOString(),
          read: false,
        };
        setMessages(prev => [...prev, vendorResponse]);
      }, 2500);
    } else {
      // Simulate group member response
      setTimeout(() => {
        const randomMember =
          conversation.participants[
            Math.floor(Math.random() * (conversation.participants.length - 1)) +
              1
          ];
        const memberResponse: ChatMessage = {
          id: `msg-${Date.now()}-response`,
          conversationId: conversation.id,
          senderId: randomMember.userId,
          senderName: randomMember.name,
          senderAvatar: randomMember.avatar,
          content: getAutoResponse(inputValue, 'group'),
          timestamp: new Date().toISOString(),
          read: false,
        };
        setMessages(prev => [...prev, memberResponse]);
      }, 3000);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Get online members count for group chats
  const onlineCount = conversation.participants.filter(p => p.isOnline).length;

  return (
    <div className='flex flex-col h-screen bg-white'>
      {/* Header */}
      <div className='bg-[#0047AB] text-white p-4 flex items-center justify-between sticky top-0 z-10'>
        <div className='flex items-center gap-3 flex-1 min-w-0'>
          <Button
            variant='ghost'
            size='icon'
            onClick={onBack}
            className='text-white hover:bg-white/10 flex-shrink-0'
          >
            <ArrowLeft className='w-5 h-5' />
          </Button>

          <div className='relative flex-shrink-0'>
            <Avatar className='w-10 h-10 bg-white/20 text-white'>
              <AvatarFallback className='bg-white/20 text-white'>
                {conversation.avatar || conversation.title.charAt(0)}
              </AvatarFallback>
            </Avatar>
            {conversation.type === 'vendor' && conversation.isOnline && (
              <div className='absolute bottom-0 right-0 w-3 h-3 bg-[#6EE7B7] border-2 border-[#0047AB] rounded-full'></div>
            )}
          </div>

          <div className='flex-1 min-w-0'>
            <h2 className='font-semibold truncate'>{conversation.title}</h2>
            <div className='flex items-center gap-1 text-xs text-white/80'>
              {conversation.type === 'vendor' ? (
                <>
                  <Store className='w-3 h-3' />
                  <span>{conversation.isOnline ? 'Online' : 'Offline'}</span>
                </>
              ) : (
                <>
                  <Users className='w-3 h-3' />
                  <span>
                    {conversation.participants.length} members • {onlineCount}{' '}
                    online
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className='flex items-center gap-2 flex-shrink-0'>
          {conversation.type === 'vendor' && (
            <>
              <Button
                variant='ghost'
                size='icon'
                className='text-white hover:bg-white/10'
              >
                <Phone className='w-5 h-5' />
              </Button>
              <Button
                variant='ghost'
                size='icon'
                className='text-white hover:bg-white/10'
              >
                <Video className='w-5 h-5' />
              </Button>
            </>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                className='text-white hover:bg-white/10'
              >
                <MoreVertical className='w-5 h-5' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuItem>
                <Info className='w-4 h-4 mr-2' />
                View Details
              </DropdownMenuItem>
              {conversation.type === 'group' && (
                <DropdownMenuItem>
                  <Users className='w-4 h-4 mr-2' />
                  View Members
                </DropdownMenuItem>
              )}
              <DropdownMenuItem className='text-red-600'>
                Mute Conversation
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className='flex-1 p-4 bg-[#F4F4F5]'>
        <div className='space-y-4'>
          {/* Group member info banner */}
          {conversation.type === 'group' && (
            <div className='bg-white rounded-lg p-3 border border-gray-200 mb-4'>
              <div className='flex items-center gap-2 mb-2'>
                <Users className='w-4 h-4 text-[#0047AB]' />
                <span className='text-sm font-semibold text-gray-900'>
                  Group Members
                </span>
              </div>
              <div className='flex flex-wrap gap-2'>
                {conversation.participants.map(participant => (
                  <div
                    key={participant.userId}
                    className='flex items-center gap-1 bg-gray-100 rounded-full px-2 py-1'
                  >
                    <span className='text-xs'>
                      {participant.avatar || '👤'}
                    </span>
                    <span className='text-xs text-gray-700'>
                      {participant.name}
                    </span>
                    {participant.isOnline && (
                      <div className='w-2 h-2 bg-[#6EE7B7] rounded-full'></div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {messages.map((message, index) => {
            const showSenderName =
              conversation.type === 'group' &&
              !message.isOwn &&
              (index === 0 ||
                messages[index - 1].senderId !== message.senderId);

            const showTimestamp =
              index === messages.length - 1 ||
              new Date(messages[index + 1].timestamp).getTime() -
                new Date(message.timestamp).getTime() >
                5 * 60 * 1000;

            return (
              <MessageBubble
                key={message.id}
                message={message}
                showSenderName={showSenderName}
                showTimestamp={showTimestamp}
                isGroup={conversation.type === 'group'}
              />
            );
          })}

          {/* Typing Indicator */}
          {isTyping && (
            <div className='flex items-end gap-2'>
              <Avatar className='w-8 h-8 bg-gray-300 text-white'>
                <AvatarFallback className='bg-gray-300 text-white text-xs'>
                  {conversation.avatar || '?'}
                </AvatarFallback>
              </Avatar>
              <div className='bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm'>
                <div className='flex gap-1'>
                  <div className='w-2 h-2 bg-gray-400 rounded-full animate-bounce'></div>
                  <div
                    className='w-2 h-2 bg-gray-400 rounded-full animate-bounce'
                    style={{ animationDelay: '0.2s' }}
                  ></div>
                  <div
                    className='w-2 h-2 bg-gray-400 rounded-full animate-bounce'
                    style={{ animationDelay: '0.4s' }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className='bg-white border-t p-4'>
        <div className='flex items-end gap-2'>
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              conversation.type === 'group'
                ? 'Message the group...'
                : 'Message vendor...'
            }
            className='flex-1 rounded-full border-gray-300 focus:border-[#0047AB] focus:ring-[#0047AB]'
          />
          <Button
            onClick={handleSend}
            disabled={!inputValue.trim() || !canSendMessages}
            className='bg-[#0047AB] hover:bg-[#003380] text-white rounded-full h-10 w-10 p-0'
          >
            <Send className='w-4 h-4' />
          </Button>
        </div>
      </div>
    </div>
  );
}

interface MessageBubbleProps {
  message: ChatMessage;
  showSenderName: boolean;
  showTimestamp: boolean;
  isGroup: boolean;
}

function MessageBubble({
  message,
  showSenderName,
  showTimestamp,
  isGroup,
}: MessageBubbleProps) {
  const isOwn = message.isOwn || message.senderId === currentUserId;

  return (
    <div
      className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar for group chats (others only) */}
      {!isOwn && isGroup && (
        <Avatar className='w-8 h-8 bg-[#0047AB] text-white flex-shrink-0'>
          <AvatarFallback className='bg-[#0047AB] text-white text-xs'>
            {message.senderAvatar || message.senderName.charAt(0)}
          </AvatarFallback>
        </Avatar>
      )}

      {/* Spacer for alignment when no avatar */}
      {!isOwn && !isGroup && <div className='w-8 flex-shrink-0' />}

      <div
        className={`flex flex-col max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}
      >
        {/* Sender name for group chats */}
        {showSenderName && isGroup && (
          <span className='text-xs text-gray-600 mb-1 px-2'>
            {message.senderName}
          </span>
        )}

        {/* Message bubble */}
        <div
          className={`rounded-2xl px-4 py-2 shadow-sm ${
            isOwn
              ? 'bg-[#0047AB] text-white rounded-br-sm'
              : 'bg-white text-gray-900 rounded-bl-sm'
          }`}
        >
          <p className='break-words whitespace-pre-wrap'>{message.content}</p>
        </div>

        {/* Timestamp and read status */}
        {showTimestamp && (
          <div
            className={`flex items-center gap-1 mt-1 px-2 ${
              isOwn ? 'flex-row-reverse' : 'flex-row'
            }`}
          >
            <span className='text-xs text-gray-500'>
              {formatMessageTime(message.timestamp)}
            </span>
            {isOwn && (
              <span className='text-xs text-gray-500'>
                {message.read ? '✓✓' : '✓'}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Auto-response generator for demo purposes
function getAutoResponse(
  userMessage: string,
  type: 'vendor' | 'group',
): string {
  const lowerMsg = userMessage.toLowerCase();

  if (type === 'vendor') {
    if (
      lowerMsg.includes('price') ||
      lowerMsg.includes('cost') ||
      lowerMsg.includes('discount')
    ) {
      return 'Let me check our current pricing for you. We have competitive rates for bulk orders!';
    }
    if (lowerMsg.includes('delivery') || lowerMsg.includes('shipping')) {
      return 'Standard delivery takes 2-3 weeks. We offer express shipping for urgent orders.';
    }
    if (lowerMsg.includes('thank') || lowerMsg.includes('thanks')) {
      return "You're welcome! Feel free to reach out if you have any other questions.";
    }
    return 'Thank you for your message. How can I assist you further?';
  } else {
    // Group responses
    if (lowerMsg.includes('order') || lowerMsg.includes('buy')) {
      return "I'm interested too! Count me in.";
    }
    if (lowerMsg.includes('when') || lowerMsg.includes('deadline')) {
      return "Let's coordinate on a timeline that works for everyone.";
    }
    if (lowerMsg.includes('price') || lowerMsg.includes('cost')) {
      return 'That sounds reasonable. What does everyone else think?';
    }
    return 'Sounds good! 👍';
  }
}
