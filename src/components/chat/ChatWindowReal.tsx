import { useState, useEffect } from 'react';
import { ArrowLeft, Send, Users, Store, Info, ShieldAlert } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Alert, AlertDescription } from '../ui/alert';
import { useConversation } from '../../hooks/useChat';
import { sanitizeChatMessage, validateChatMessage } from '../../lib/sanitizer';
import type { Conversation } from '../../lib/api/chatApi';

interface ChatWindowRealProps {
  conversation: Conversation;
  onBack: () => void;
}

export function ChatWindowReal({ conversation, onBack }: ChatWindowRealProps) {
  const [inputValue, setInputValue] = useState('');
  const [isTypingTimeout, setIsTypingTimeout] = useState<NodeJS.Timeout | null>(null);

  const {
    messages,
    participants,
    loading,
    typingUsers,
    messagesEndRef,
    sendMessage,
    sendTypingIndicator,
    markAsRead,
  } = useConversation(conversation.id);

  // Check if current user can send messages
  const currentUserId = localStorage.getItem('userId'); // Assuming userId is stored
  const currentParticipant = participants.find(p => p.userId === currentUserId);
  const canSendMessages = currentParticipant?.canSend ?? true;

  // Handle input change with typing indicator
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);

    // Send typing indicator
    if (!isTypingTimeout) {
      sendTypingIndicator(true);
    }

    // Clear previous timeout
    if (isTypingTimeout) {
      clearTimeout(isTypingTimeout);
    }

    // Set new timeout to stop typing indicator
    const timeout = setTimeout(() => {
      sendTypingIndicator(false);
      setIsTypingTimeout(null);
    }, 3000);

    setIsTypingTimeout(timeout);
  };

  // Handle send message
  const handleSendMessage = () => {
    if (!inputValue.trim() || !canSendMessages) return;

    if (!validateChatMessage(inputValue)) {
      alert('Message contains invalid characters or is too long (max 5000 characters)');
      return;
    }

    const sanitizedMessage = sanitizeChatMessage(inputValue);
    console.log('Sending message:', sanitizedMessage);
    sendMessage(sanitizedMessage);
    setInputValue('');

    // Clear typing indicator
    if (isTypingTimeout) {
      clearTimeout(isTypingTimeout);
      setIsTypingTimeout(null);
    }
    sendTypingIndicator(false);
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Mark as read when messages change
  useEffect(() => {
    markAsRead();
  }, [messages, markAsRead]);

  // Format message time
  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0047AB] to-[#6EE7B7] p-4 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="text-white hover:bg-white/10"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Avatar className="w-10 h-10 bg-white/20">
              <AvatarFallback className="bg-white/20 text-white">
                {conversation.avatar || conversation.title.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-white font-semibold">{conversation.title}</h3>
              <div className="flex items-center gap-2 text-xs text-white/80">
                {conversation.type === 'group-vendor' ? (
                  <>
                    <Store className="w-3 h-3" />
                    <span>{conversation.isOnline ? 'Online' : 'Offline'}</span>
                  </>
                ) : (
                  <>
                    <Users className="w-3 h-3" />
                    <span>{participants.length} members</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10"
        >
          <Info className="w-5 h-5" />
        </Button>
      </div>

      {/* Read-only notice for group-vendor chats */}
      {conversation.type === 'group-vendor' && !canSendMessages && (
        <Alert className="m-4 border-blue-200 bg-blue-50">
          <ShieldAlert className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-sm text-blue-800">
            You're viewing this conversation (read-only). Only the group admin can send messages to the vendor.
          </AlertDescription>
        </Alert>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-[#0047AB] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No messages yet</p>
            <p className="text-sm text-gray-400 mt-2">Start the conversation!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex gap-2 max-w-[75%] ${message.isOwn ? 'flex-row-reverse' : ''}`}>
                  {!message.isOwn && (
                    <Avatar className="w-8 h-8 flex-shrink-0 bg-[#0047AB] text-white">
                      <AvatarFallback className="bg-[#0047AB] text-white text-xs">
                        {message.senderAvatar || message.senderName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  )}

                  <div>
                    {!message.isOwn && (
                      <p className="text-xs text-gray-500 mb-1 px-3">
                        {message.senderName}
                      </p>
                    )}
                    <div
                      className={`rounded-lg px-4 py-2 ${
                        message.isOwn
                          ? 'bg-[#0047AB] text-white rounded-tr-none'
                          : 'bg-gray-100 text-gray-900 rounded-tl-none'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {message.content}
                      </p>
                    </div>
                    <p
                      className={`text-xs text-gray-400 mt-1 px-3 ${
                        message.isOwn ? 'text-right' : ''
                      }`}
                    >
                      {formatMessageTime(message.timestamp)}
                      {message.isOwn && message.read && ' · Read'}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {typingUsers.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-500 italic">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span>{typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="border-t p-4 bg-white">
        {canSendMessages ? (
          <div className="flex items-center gap-2">
            <Input
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1"
              disabled={!canSendMessages}
            />
            <Button
              size="icon"
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || !canSendMessages}
              className="bg-[#0047AB] hover:bg-[#0047AB]/90"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500 py-2">
            <ShieldAlert className="w-4 h-4" />
            <span>Only group admin can send messages</span>
          </div>
        )}
      </div>
    </div>
  );
}
