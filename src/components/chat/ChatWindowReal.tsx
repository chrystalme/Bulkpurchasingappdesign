import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, Users, Store, Info, ShieldAlert, MessageCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Alert, AlertDescription } from '../ui/alert';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import {
  fetchMessages,
  fetchParticipants,
  addOptimisticMessage,
  conversationRead,
  selectConversation,
} from '../../store/slices/chatSlice';
import { fetchGroups, fetchGroupById } from '../../store/slices/groupsSlice';
import { chatSocket } from '../../lib/socket/chatSocket';
import { sanitizeChatMessage, validateChatMessage } from '../../lib/sanitizer';
import type { Conversation } from '../../lib/types/chat.types';
import { useAuth } from '../../contexts/AuthContext';
import { parseDate } from '../../lib/formatters';

interface ChatWindowRealProps {
  conversation: Conversation;
  onBack: () => void;
}

export function ChatWindowReal({ conversation, onBack }: ChatWindowRealProps) {
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const [inputValue, setInputValue] = useState('');
  const [isTypingTimeout, setIsTypingTimeout] = useState<NodeJS.Timeout | null>(
    null,
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const groups = useAppSelector(state => state.groups.groups) || [];
  const currentGroup = useAppSelector(state => state.groups.currentGroup);
  const messages = useAppSelector(
    state => state.chat.messagesByConversation[conversation.id] || [],
  );
  const participants = useAppSelector(
    state => state.chat.participantsByConversation[conversation.id] || [],
  );
  const typingUsers = useAppSelector(
    state => state.chat.typingUsersByConversation[conversation.id] || [],
  );
  const loading = useAppSelector(
    state => state.chat.messagesLoading[conversation.id] || false,
  );

  // Fetch messages and participants on mount
  useEffect(() => {
    dispatch(fetchMessages(conversation.id));
    dispatch(fetchParticipants(conversation.id));
  }, [dispatch, conversation.id]);

  // Ensure group information is available for group-vendor conversations
  useEffect(() => {
    if (conversation.groupId) {
      if (!groups || groups.length === 0) {
        dispatch(fetchGroups());
      }
      if (!currentGroup || currentGroup.id !== conversation.groupId) {
        dispatch(fetchGroupById(conversation.groupId));
      }
    }
  }, [dispatch, conversation.groupId, groups?.length, currentGroup?.id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark as read when messages change
  useEffect(() => {
    dispatch(conversationRead(conversation.id));
  }, [dispatch, conversation.id, messages.length]);

  // Set selected conversation in Redux while ChatWindowReal is mounted
  useEffect(() => {
    dispatch(selectConversation(conversation.id));
    return () => {
      dispatch(selectConversation(null));
    };
  }, [dispatch, conversation.id]);

  // Find current user participant record first to eliminate TDZ ReferenceError
  const myParticipant = participants.find(p => p.userId === user?.id);

  // For vendor chats, vendor or group admin can send; for internal chats, all members can
  const isVendor = user?.role === 'vendor' || myParticipant?.role === 'vendor';
  const matchingGroup = (currentGroup?.id === conversation.groupId ? currentGroup : null)
    || groups.find(g => g.id === conversation.groupId);
  const isGroupAdmin = matchingGroup?.user_role === 'admin'
    || matchingGroup?.created_by === user?.id
    || conversation.groupRole === 'admin'
    || conversation.userRole === 'admin';
  const isInternalGroup = conversation.type === 'group';
  const canSendMessages = isInternalGroup
    ? (myParticipant?.canSend !== false)
    : (isVendor || ((isGroupAdmin || conversation.canSend === true) && myParticipant?.canSend !== false));

  // Handle input change with typing indicator
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);

    // Send typing indicator
    if (!isTypingTimeout) {
      chatSocket.sendTypingIndicator(conversation.id, true);
    }

    // Clear previous timeout
    if (isTypingTimeout) {
      clearTimeout(isTypingTimeout);
    }

    // Set new timeout to stop typing indicator
    const timeout = setTimeout(() => {
      chatSocket.sendTypingIndicator(conversation.id, false);
      setIsTypingTimeout(null);
    }, 3000);

    setIsTypingTimeout(timeout);
  };

  // Handle send message
  const handleSendMessage = () => {
    if (!inputValue.trim() || !canSendMessages) return;

    if (!validateChatMessage(inputValue)) {
      alert(
        'Message contains invalid characters or is too long (max 5000 characters)',
      );
      return;
    }

    const sanitizedMessage = sanitizeChatMessage(inputValue);
    const tempId = `temp-${Date.now()}`;

    // Create optimistic message
    const optimisticMessage = {
      id: tempId,
      conversationId: conversation.id,
      senderId: user?.id || '',
      senderName: user?.name || 'You',
      senderAvatar: user?.avatar || '',
      content: sanitizedMessage,
      timestamp: new Date().toISOString(),
      read: false,
      isOwn: true,
      tempId,
    };

    // Add optimistic message to Redux
    dispatch(
      addOptimisticMessage({
        conversationId: conversation.id,
        message: optimisticMessage,
      }),
    );

    // Send via socket (middleware will handle the actual sending)
    chatSocket.sendMessage(conversation.id, sanitizedMessage);

    setInputValue('');

    // Clear typing indicator
    if (isTypingTimeout) {
      clearTimeout(isTypingTimeout);
      setIsTypingTimeout(null);
    }
    chatSocket.sendTypingIndicator(conversation.id, false);
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!canSendMessages) return;
      handleSendMessage();
    }
  };

  // Mark as read handled in useEffect above

  // Format message time
  const formatMessageTime = (timestamp: string) => {
    const date = parseDate(timestamp);
    return date
      ? date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      : '';
  };

  const displayTitle = (isVendor
    ? (conversation.groupName || conversation.title)
    : conversation.title) || 'Chat';

  return (
    <div className='fixed inset-0 z-[60] flex flex-col h-full h-[100vh] h-[100dvh] max-h-[100dvh] bg-white max-w-md lg:max-w-6xl mx-auto shadow-2xl overflow-hidden'>
      {/* Header */}
      <div className='bg-gradient-to-r from-[#0047AB] to-[#6EE7B7] p-4 pt-[max(1rem,env(safe-area-inset-top))] flex items-center gap-3 shrink-0'>
        <Button
          variant='ghost'
          size='icon'
          onClick={onBack}
          className='text-white hover:bg-white/10'
        >
          <ArrowLeft className='w-5 h-5' />
        </Button>

        <div className='flex-1'>
          <div className='flex items-center gap-2'>
            <Avatar className='w-10 h-10 bg-white/20'>
              <AvatarFallback className='bg-white/20 text-white font-medium'>
                {displayTitle.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className='text-white font-semibold'>{displayTitle}</h3>
              <div className='flex items-center gap-2 text-xs text-white/80'>
                {isVendor ? (
                  <>
                    <Users className='w-3 h-3' />
                    <span>
                      Purchasing Group · {participants.length > 0 ? `${participants.length} members` : 'Direct inquiry'}
                    </span>
                  </>
                ) : conversation.type === 'group-vendor' ? (
                  <>
                    <Store className='w-3 h-3' />
                    <span>{conversation.isOnline ? 'Online' : 'Offline'}</span>
                  </>
                ) : conversation.type === 'direct' ? (
                  <>
                    <MessageCircle className='w-3 h-3' />
                    <span>{conversation.isOnline ? 'Online' : 'Direct message'}</span>
                  </>
                ) : (
                  <>
                    <Users className='w-3 h-3' />
                    <span>{participants.length} members</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <Button
          variant='ghost'
          size='icon'
          className='text-white hover:bg-white/10'
        >
          <Info className='w-5 h-5' />
        </Button>
      </div>

      {/* Read-only notice for group-vendor chats */}
      {conversation.type === 'group-vendor' && !canSendMessages && (
        <Alert className='m-4 border-blue-200 bg-blue-50'>
          <ShieldAlert className='h-4 w-4 text-blue-600' />
          <AlertDescription className='text-sm text-blue-800'>
            You have read-only access to this vendor conversation. Only the group admin and vendor can send messages.
          </AlertDescription>
        </Alert>
      )}

      {/* Messages */}
      <ScrollArea className='flex-1 min-h-0 p-4'>
        {loading ? (
          <div className='flex justify-center py-8'>
            <div className='w-8 h-8 border-4 border-[#0047AB] border-t-transparent rounded-full animate-spin' />
          </div>
        ) : messages.length === 0 ? (
          <div className='text-center py-8'>
            <p className='text-gray-500'>No messages yet</p>
            <p className='text-sm text-gray-400 mt-2'>
              Start the conversation!
            </p>
          </div>
        ) : (
          <div className='space-y-4'>
            {messages.map(message => (
              <div
                key={message.id}
                className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`flex gap-2 max-w-[75%] ${message.isOwn ? 'flex-row-reverse' : ''}`}
                >
                  {!message.isOwn && (
                    <Avatar className='w-8 h-8 flex-shrink-0 bg-[#0047AB] text-white'>
                      <AvatarFallback className='bg-[#0047AB] text-white text-xs'>
                        {message.senderAvatar || (message.senderName ? message.senderName.charAt(0) : 'U')}
                      </AvatarFallback>
                    </Avatar>
                  )}

                  <div>
                    {!message.isOwn && (
                      <p className='text-xs text-gray-500 mb-1 px-3'>
                        {message.senderName || 'Member'}
                      </p>
                    )}
                    <div
                      className={`rounded-lg px-4 py-2 ${
                        message.isOwn
                          ? 'bg-[#0047AB] text-white rounded-tr-none'
                          : 'bg-gray-100 text-gray-900 rounded-tl-none'
                      }`}
                    >
                      <p className='text-sm whitespace-pre-wrap break-words'>
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
              <div className='flex items-center gap-2 text-sm text-gray-500 italic'>
                <div className='flex gap-1'>
                  <span
                    className='w-2 h-2 bg-gray-400 rounded-full animate-bounce'
                    style={{ animationDelay: '0ms' }}
                  />
                  <span
                    className='w-2 h-2 bg-gray-400 rounded-full animate-bounce'
                    style={{ animationDelay: '150ms' }}
                  />
                  <span
                    className='w-2 h-2 bg-gray-400 rounded-full animate-bounce'
                    style={{ animationDelay: '300ms' }}
                  />
                </div>
                <span>
                  {typingUsers.map(u => u.userName).join(', ')}{' '}
                  {typingUsers.length === 1 ? 'is' : 'are'} typing...
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className='border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-white shrink-0'>
        {!canSendMessages && conversation.type === 'group-vendor' && (
          <div className='flex items-center justify-center gap-2 text-sm text-gray-500 mb-2'>
            <ShieldAlert className='w-4 h-4' />
            <span>Only the group admin and vendor can send messages</span>
          </div>
        )}
        <div className='flex items-center gap-2'>
          <Input
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            placeholder={
              !canSendMessages
                ? 'Messages disabled (view only)'
                : isVendor
                  ? 'Reply to group...'
                  : 'Type a message...'
            }
            className='flex-1'
            disabled={!canSendMessages}
          />
          <Button
            size='icon'
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || !canSendMessages}
            className='bg-[#0047AB] hover:bg-[#0047AB]/90'
          >
            <Send className='w-5 h-5' />
          </Button>
        </div>
      </div>
    </div>
  );
}
