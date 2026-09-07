// Chat System Mock Data

export type ConversationType = 'group' | 'group-vendor';

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: string;
  read: boolean;
  isOwn?: boolean; // Set dynamically based on current user
}

export interface Conversation {
  id: string;
  type: ConversationType;
  title: string;
  avatar?: string;
  lastMessage?: ChatMessage;
  unreadCount: number;
  participants: ConversationParticipant[];
  groupId?: string; // For both group and group-vendor chats
  vendorId?: string; // For group-vendor chats
  productId?: string; // Optional: product being discussed with vendor
  isOnline?: boolean; // For vendor chats
  typingUsers?: string[]; // User IDs currently typing
  groupName?: string; // For group-vendor chats, show which group
}

export interface ConversationParticipant {
  userId: string;
  name: string;
  avatar?: string;
  role?: 'admin' | 'member' | 'vendor';
  isOnline?: boolean;
}

// Current logged-in user (member perspective)
export const currentUserId = 'user-001';

// Helper to check if current user is admin of a group
export function isGroupAdmin(conversation: Conversation): boolean {
  const currentUser = conversation.participants.find(p => p.userId === currentUserId);
  return currentUser?.role === 'admin';
}

// Group Chat Mock Data
export const groupConversations: Conversation[] = [
  {
    id: 'group-conv-001',
    type: 'group',
    title: 'Eco Warriors - Solar Panel Group',
    avatar: '🌞',
    groupId: '1', // Linked to group ID
    unreadCount: 3,
    participants: [
      { userId: 'user-001', name: 'You', role: 'member', isOnline: true },
      { userId: 'user-002', name: 'Sarah Chen', avatar: '👩', role: 'admin', isOnline: true },
      { userId: 'user-003', name: 'Michael Kumar', avatar: '👨', role: 'member', isOnline: false },
      { userId: 'user-004', name: 'Lisa Wong', avatar: '👩‍💼', role: 'member', isOnline: true },
      { userId: 'user-005', name: 'David Smith', avatar: '👨‍💻', role: 'member', isOnline: false },
    ],
    typingUsers: ['user-002'],
    lastMessage: {
      id: 'msg-group-015',
      conversationId: 'group-conv-001',
      senderId: 'user-002',
      senderName: 'Sarah Chen',
      senderAvatar: '👩',
      content: 'Great! I\'ll coordinate the delivery address tomorrow.',
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      read: false,
    },
  },
  {
    id: 'group-conv-002',
    type: 'group',
    title: 'Battery Buyers Club',
    avatar: '🔋',
    groupId: '2', // Linked to group ID
    unreadCount: 0,
    participants: [
      { userId: 'user-001', name: 'You', role: 'member', isOnline: true },
      { userId: 'user-006', name: 'James Brown', avatar: '👨‍🔧', role: 'admin', isOnline: false },
      { userId: 'user-007', name: 'Emma Wilson', avatar: '👩‍🔬', role: 'member', isOnline: false },
      { userId: 'user-008', name: 'Alex Taylor', avatar: '🧑', role: 'member', isOnline: false },
    ],
    lastMessage: {
      id: 'msg-group-020',
      conversationId: 'group-conv-002',
      senderId: 'user-001',
      senderName: 'You',
      content: 'Sounds good! Let\'s finalize by Friday.',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      read: true,
    },
  },
  {
    id: 'group-conv-003',
    type: 'group',
    title: 'Office Supply Savers',
    avatar: '📎',
    groupId: '3', // Linked to group ID
    unreadCount: 7,
    participants: [
      { userId: 'user-001', name: 'You', role: 'member', isOnline: true },
      { userId: 'user-009', name: 'Rachel Green', avatar: '👩‍💼', role: 'admin', isOnline: true },
      { userId: 'user-010', name: 'Tom Anderson', avatar: '👨‍💼', role: 'member', isOnline: true },
      { userId: 'user-011', name: 'Nina Patel', avatar: '👩', role: 'member', isOnline: false },
    ],
    typingUsers: [],
    lastMessage: {
      id: 'msg-group-025',
      conversationId: 'group-conv-003',
      senderId: 'user-009',
      senderName: 'Rachel Green',
      senderAvatar: '👩‍💼',
      content: 'Anyone wants to add notebooks to the order?',
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      read: false,
    },
  },
];

// Vendor Chat Mock Data
export const vendorConversations: Conversation[] = [
  {
    id: 'vendor-conv-001',
    type: 'group-vendor',
    title: 'GreenTech Solutions',
    avatar: '🏢',
    groupId: '1', // Linked to group ID
    vendorId: 'vendor-001',
    productId: 'prod-solar-001',
    unreadCount: 1,
    isOnline: true,
    participants: [
      { userId: 'user-002', name: 'Sarah Chen', avatar: '👩', role: 'admin', isOnline: true },
      { userId: 'user-001', name: 'You', role: 'member', isOnline: true },
      { userId: 'vendor-001', name: 'GreenTech Solutions', avatar: '🏢', role: 'vendor', isOnline: true },
    ],
    typingUsers: ['vendor-001'],
    lastMessage: {
      id: 'msg-vendor-010',
      conversationId: 'vendor-conv-001',
      senderId: 'vendor-001',
      senderName: 'GreenTech Solutions',
      senderAvatar: '🏢',
      content: 'Yes, we can offer 15% discount for orders above 50 units.',
      timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      read: false,
    },
    groupName: 'Eco Warriors - Solar Panel Group',
  },
  {
    id: 'vendor-conv-002',
    type: 'group-vendor',
    title: 'PowerCell Inc.',
    avatar: '⚡',
    groupId: '2', // Linked to group ID
    vendorId: 'vendor-002',
    productId: 'prod-battery-001',
    unreadCount: 0,
    isOnline: false,
    participants: [
      { userId: 'user-006', name: 'James Brown', avatar: '👨‍🔧', role: 'admin', isOnline: false },
      { userId: 'user-001', name: 'You', role: 'member', isOnline: true },
      { userId: 'vendor-002', name: 'PowerCell Inc.', avatar: '⚡', role: 'vendor', isOnline: false },
    ],
    lastMessage: {
      id: 'msg-vendor-015',
      conversationId: 'vendor-conv-002',
      senderId: 'user-006',
      senderName: 'James Brown',
      content: 'Thank you for the information!',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      read: true,
    },
    groupName: 'Battery Buyers Club',
  },
  {
    id: 'vendor-conv-003',
    type: 'group-vendor',
    title: 'BulkOffice Pro',
    avatar: '🖊️',
    groupId: '3', // Linked to group ID
    vendorId: 'vendor-003',
    productId: 'prod-office-001',
    unreadCount: 2,
    isOnline: true,
    participants: [
      { userId: 'user-009', name: 'Rachel Green', avatar: '👩‍💼', role: 'admin', isOnline: true },
      { userId: 'user-001', name: 'You', role: 'member', isOnline: true },
      { userId: 'vendor-003', name: 'BulkOffice Pro', avatar: '🖊️', role: 'vendor', isOnline: true },
    ],
    typingUsers: ['vendor-003'],
    lastMessage: {
      id: 'msg-vendor-020',
      conversationId: 'vendor-conv-003',
      senderId: 'vendor-003',
      senderName: 'BulkOffice Pro',
      senderAvatar: '🖊️',
      content: 'We have a special promotion running this week!',
      timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      read: false,
    },
    groupName: 'Office Supply Savers',
  },
];

// Message History for Group Chats
export const groupMessages: Record<string, ChatMessage[]> = {
  'group-conv-001': [
    {
      id: 'msg-group-001',
      conversationId: 'group-conv-001',
      senderId: 'user-002',
      senderName: 'Sarah Chen',
      senderAvatar: '👩',
      content: 'Hey everyone! I found a great deal on 300W solar panels.',
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      read: true,
    },
    {
      id: 'msg-group-002',
      conversationId: 'group-conv-001',
      senderId: 'user-003',
      senderName: 'Michael Kumar',
      senderAvatar: '👨',
      content: 'How much are we looking at per unit?',
      timestamp: new Date(Date.now() - 2.9 * 60 * 60 * 1000).toISOString(),
      read: true,
    },
    {
      id: 'msg-group-003',
      conversationId: 'group-conv-001',
      senderId: 'user-002',
      senderName: 'Sarah Chen',
      senderAvatar: '👩',
      content: '$180 per panel if we order 50 units. That\'s 30% off retail!',
      timestamp: new Date(Date.now() - 2.8 * 60 * 60 * 1000).toISOString(),
      read: true,
    },
    {
      id: 'msg-group-004',
      conversationId: 'group-conv-001',
      senderId: 'user-001',
      senderName: 'You',
      content: 'That\'s amazing! I\'m in for 10 panels.',
      timestamp: new Date(Date.now() - 2.7 * 60 * 60 * 1000).toISOString(),
      read: true,
      isOwn: true,
    },
    {
      id: 'msg-group-005',
      conversationId: 'group-conv-001',
      senderId: 'user-004',
      senderName: 'Lisa Wong',
      senderAvatar: '👩‍💼',
      content: 'Count me in for 8!',
      timestamp: new Date(Date.now() - 2.6 * 60 * 60 * 1000).toISOString(),
      read: true,
    },
    {
      id: 'msg-group-006',
      conversationId: 'group-conv-001',
      senderId: 'user-005',
      senderName: 'David Smith',
      senderAvatar: '👨‍💻',
      content: 'I need 15 panels for my cabin project.',
      timestamp: new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString(),
      read: true,
    },
    {
      id: 'msg-group-007',
      conversationId: 'group-conv-001',
      senderId: 'user-002',
      senderName: 'Sarah Chen',
      senderAvatar: '👩',
      content: 'Perfect! We\'re at 33 panels so far. Who else is interested?',
      timestamp: new Date(Date.now() - 2.4 * 60 * 60 * 1000).toISOString(),
      read: true,
    },
    {
      id: 'msg-group-008',
      conversationId: 'group-conv-001',
      senderId: 'user-003',
      senderName: 'Michael Kumar',
      senderAvatar: '👨',
      content: 'I\'ll take 12 units.',
      timestamp: new Date(Date.now() - 2.3 * 60 * 60 * 1000).toISOString(),
      read: true,
    },
    {
      id: 'msg-group-009',
      conversationId: 'group-conv-001',
      senderId: 'user-004',
      senderName: 'Lisa Wong',
      senderAvatar: '👩‍💼',
      content: 'We\'re almost at 50! This is exciting 🎉',
      timestamp: new Date(Date.now() - 2.2 * 60 * 60 * 1000).toISOString(),
      read: true,
    },
    {
      id: 'msg-group-010',
      conversationId: 'group-conv-001',
      senderId: 'user-001',
      senderName: 'You',
      content: 'When is the deadline to commit?',
      timestamp: new Date(Date.now() - 2.1 * 60 * 60 * 1000).toISOString(),
      read: true,
      isOwn: true,
    },
    {
      id: 'msg-group-011',
      conversationId: 'group-conv-001',
      senderId: 'user-002',
      senderName: 'Sarah Chen',
      senderAvatar: '👩',
      content: 'Vendor needs confirmation by Friday. I\'ll set up the payment once we hit 50.',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      read: true,
    },
    {
      id: 'msg-group-012',
      conversationId: 'group-conv-001',
      senderId: 'user-005',
      senderName: 'David Smith',
      senderAvatar: '👨‍💻',
      content: 'Are shipping costs included?',
      timestamp: new Date(Date.now() - 1.9 * 60 * 60 * 1000).toISOString(),
      read: true,
    },
    {
      id: 'msg-group-013',
      conversationId: 'group-conv-001',
      senderId: 'user-002',
      senderName: 'Sarah Chen',
      senderAvatar: '👩',
      content: 'Yes, free shipping for bulk orders over $8000. We\'re well above that.',
      timestamp: new Date(Date.now() - 1.8 * 60 * 60 * 1000).toISOString(),
      read: true,
    },
    {
      id: 'msg-group-014',
      conversationId: 'group-conv-001',
      senderId: 'user-001',
      senderName: 'You',
      content: 'Excellent! Where will they be delivered?',
      timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      read: true,
      isOwn: true,
    },
    {
      id: 'msg-group-015',
      conversationId: 'group-conv-001',
      senderId: 'user-002',
      senderName: 'Sarah Chen',
      senderAvatar: '👩',
      content: 'Great! I\'ll coordinate the delivery address tomorrow.',
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      read: false,
    },
  ],
  'group-conv-002': [
    {
      id: 'msg-group-016',
      conversationId: 'group-conv-002',
      senderId: 'user-006',
      senderName: 'James Brown',
      senderAvatar: '👨‍🔧',
      content: 'Looking at lithium-ion batteries for our RV project.',
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      read: true,
    },
    {
      id: 'msg-group-017',
      conversationId: 'group-conv-002',
      senderId: 'user-007',
      senderName: 'Emma Wilson',
      senderAvatar: '👩‍🔬',
      content: 'What capacity are you thinking?',
      timestamp: new Date(Date.now() - 4.5 * 60 * 60 * 1000).toISOString(),
      read: true,
    },
    {
      id: 'msg-group-018',
      conversationId: 'group-conv-002',
      senderId: 'user-006',
      senderName: 'James Brown',
      senderAvatar: '👨‍🔧',
      content: '200Ah would be perfect. Need at least 10 units.',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      read: true,
    },
    {
      id: 'msg-group-019',
      conversationId: 'group-conv-002',
      senderId: 'user-008',
      senderName: 'Alex Taylor',
      senderAvatar: '🧑',
      content: 'I\'m interested too. How much per battery?',
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      read: true,
    },
    {
      id: 'msg-group-020',
      conversationId: 'group-conv-002',
      senderId: 'user-001',
      senderName: 'You',
      content: 'Sounds good! Let\'s finalize by Friday.',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      read: true,
      isOwn: true,
    },
  ],
  'group-conv-003': [
    {
      id: 'msg-group-021',
      conversationId: 'group-conv-003',
      senderId: 'user-009',
      senderName: 'Rachel Green',
      senderAvatar: '👩‍💼',
      content: 'Hi team! Time for our quarterly office supply order.',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      read: false,
    },
    {
      id: 'msg-group-022',
      conversationId: 'group-conv-003',
      senderId: 'user-010',
      senderName: 'Tom Anderson',
      senderAvatar: '👨‍💼',
      content: 'We definitely need more printer paper.',
      timestamp: new Date(Date.now() - 1.8 * 60 * 60 * 1000).toISOString(),
      read: false,
    },
    {
      id: 'msg-group-023',
      conversationId: 'group-conv-003',
      senderId: 'user-011',
      senderName: 'Nina Patel',
      senderAvatar: '👩',
      content: 'And pens! We\'re running low.',
      timestamp: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(),
      read: false,
    },
    {
      id: 'msg-group-024',
      conversationId: 'group-conv-003',
      senderId: 'user-010',
      senderName: 'Tom Anderson',
      senderAvatar: '👨‍💼',
      content: 'Should we get sticky notes too?',
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      read: false,
    },
    {
      id: 'msg-group-025',
      conversationId: 'group-conv-003',
      senderId: 'user-009',
      senderName: 'Rachel Green',
      senderAvatar: '👩‍💼',
      content: 'Anyone wants to add notebooks to the order?',
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      read: false,
    },
  ],
};

// Message History for Vendor Chats
export const vendorMessages: Record<string, ChatMessage[]> = {
  'vendor-conv-001': [
    {
      id: 'msg-vendor-001',
      conversationId: 'vendor-conv-001',
      senderId: 'user-001',
      senderName: 'You',
      content: 'Hi, I\'m interested in your 300W solar panels.',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      read: true,
      isOwn: true,
    },
    {
      id: 'msg-vendor-002',
      conversationId: 'vendor-conv-001',
      senderId: 'vendor-001',
      senderName: 'GreenTech Solutions',
      senderAvatar: '🏢',
      content: 'Hello! Thank you for your interest. How many units are you looking for?',
      timestamp: new Date(Date.now() - 5.8 * 60 * 60 * 1000).toISOString(),
      read: true,
    },
    {
      id: 'msg-vendor-003',
      conversationId: 'vendor-conv-001',
      senderId: 'user-001',
      senderName: 'You',
      content: 'We have a group of 5 people, looking at around 50 units total.',
      timestamp: new Date(Date.now() - 5.5 * 60 * 60 * 1000).toISOString(),
      read: true,
      isOwn: true,
    },
    {
      id: 'msg-vendor-004',
      conversationId: 'vendor-conv-001',
      senderId: 'vendor-001',
      senderName: 'GreenTech Solutions',
      senderAvatar: '🏢',
      content: 'Excellent! For 50 units, we can offer $180 per panel, which is 30% off our retail price.',
      timestamp: new Date(Date.now() - 5.3 * 60 * 60 * 1000).toISOString(),
      read: true,
    },
    {
      id: 'msg-vendor-005',
      conversationId: 'vendor-conv-001',
      senderId: 'user-001',
      senderName: 'You',
      content: 'That sounds great! What about shipping?',
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      read: true,
      isOwn: true,
    },
    {
      id: 'msg-vendor-006',
      conversationId: 'vendor-conv-001',
      senderId: 'vendor-001',
      senderName: 'GreenTech Solutions',
      senderAvatar: '🏢',
      content: 'Free shipping for orders over $8000. Your order would qualify.',
      timestamp: new Date(Date.now() - 4.8 * 60 * 60 * 1000).toISOString(),
      read: true,
    },
    {
      id: 'msg-vendor-007',
      conversationId: 'vendor-conv-001',
      senderId: 'user-001',
      senderName: 'You',
      content: 'Perfect! What\'s the estimated delivery time?',
      timestamp: new Date(Date.now() - 4.5 * 60 * 60 * 1000).toISOString(),
      read: true,
      isOwn: true,
    },
    {
      id: 'msg-vendor-008',
      conversationId: 'vendor-conv-001',
      senderId: 'vendor-001',
      senderName: 'GreenTech Solutions',
      senderAvatar: '🏢',
      content: '2-3 weeks from order confirmation. We can also arrange installation if needed.',
      timestamp: new Date(Date.now() - 4.3 * 60 * 60 * 1000).toISOString(),
      read: true,
    },
    {
      id: 'msg-vendor-009',
      conversationId: 'vendor-conv-001',
      senderId: 'user-001',
      senderName: 'You',
      content: 'Is there any additional discount for orders above 50 units?',
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      read: true,
      isOwn: true,
    },
    {
      id: 'msg-vendor-010',
      conversationId: 'vendor-conv-001',
      senderId: 'vendor-001',
      senderName: 'GreenTech Solutions',
      senderAvatar: '🏢',
      content: 'Yes, we can offer 15% discount for orders above 50 units.',
      timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      read: false,
    },
  ],
  'vendor-conv-002': [
    {
      id: 'msg-vendor-011',
      conversationId: 'vendor-conv-002',
      senderId: 'user-001',
      senderName: 'You',
      content: 'Hello, I need information about your lithium-ion batteries.',
      timestamp: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
      read: true,
      isOwn: true,
    },
    {
      id: 'msg-vendor-012',
      conversationId: 'vendor-conv-002',
      senderId: 'vendor-002',
      senderName: 'PowerCell Inc.',
      senderAvatar: '⚡',
      content: 'Hi! We have several options. What capacity are you looking for?',
      timestamp: new Date(Date.now() - 24.8 * 60 * 60 * 1000).toISOString(),
      read: true,
    },
    {
      id: 'msg-vendor-013',
      conversationId: 'vendor-conv-002',
      senderId: 'user-001',
      senderName: 'You',
      content: '200Ah batteries. What\'s the minimum order quantity?',
      timestamp: new Date(Date.now() - 24.5 * 60 * 60 * 1000).toISOString(),
      read: true,
      isOwn: true,
    },
    {
      id: 'msg-vendor-014',
      conversationId: 'vendor-conv-002',
      senderId: 'vendor-002',
      senderName: 'PowerCell Inc.',
      senderAvatar: '⚡',
      content: 'MOQ is 10 units. Price is $450 per battery with 2-year warranty.',
      timestamp: new Date(Date.now() - 24.3 * 60 * 60 * 1000).toISOString(),
      read: true,
    },
    {
      id: 'msg-vendor-015',
      conversationId: 'vendor-conv-002',
      senderId: 'user-001',
      senderName: 'You',
      content: 'Thank you for the information!',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      read: true,
      isOwn: true,
    },
  ],
  'vendor-conv-003': [
    {
      id: 'msg-vendor-016',
      conversationId: 'vendor-conv-003',
      senderId: 'user-001',
      senderName: 'You',
      content: 'Hi, I need office supplies for a bulk order.',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      read: true,
      isOwn: true,
    },
    {
      id: 'msg-vendor-017',
      conversationId: 'vendor-conv-003',
      senderId: 'vendor-003',
      senderName: 'BulkOffice Pro',
      senderAvatar: '🖊️',
      content: 'Hello! We have a wide range of office supplies. What do you need?',
      timestamp: new Date(Date.now() - 1.8 * 60 * 60 * 1000).toISOString(),
      read: true,
    },
    {
      id: 'msg-vendor-018',
      conversationId: 'vendor-conv-003',
      senderId: 'user-001',
      senderName: 'You',
      content: 'Printer paper, pens, and notebooks mainly.',
      timestamp: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(),
      read: true,
      isOwn: true,
    },
    {
      id: 'msg-vendor-019',
      conversationId: 'vendor-conv-003',
      senderId: 'vendor-003',
      senderName: 'BulkOffice Pro',
      senderAvatar: '🖊️',
      content: 'Great! I can send you our catalog with bulk pricing.',
      timestamp: new Date(Date.now() - 1.2 * 60 * 60 * 1000).toISOString(),
      read: true,
    },
    {
      id: 'msg-vendor-020',
      conversationId: 'vendor-conv-003',
      senderId: 'vendor-003',
      senderName: 'BulkOffice Pro',
      senderAvatar: '🖊️',
      content: 'We have a special promotion running this week!',
      timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      read: false,
    },
  ],
};

// Helper function to get all conversations
export function getAllConversations(): Conversation[] {
  return [...groupConversations, ...vendorConversations].sort((a, b) => {
    const aTime = a.lastMessage ? new Date(a.lastMessage.timestamp).getTime() : 0;
    const bTime = b.lastMessage ? new Date(b.lastMessage.timestamp).getTime() : 0;
    return bTime - aTime;
  });
}

// Helper function to get messages for a conversation
export function getMessagesForConversation(conversationId: string): ChatMessage[] {
  return groupMessages[conversationId] || vendorMessages[conversationId] || [];
}

// Helper function to get conversation by ID
export function getConversationById(conversationId: string): Conversation | undefined {
  return [...groupConversations, ...vendorConversations].find(c => c.id === conversationId);
}

// Helper to format timestamp
export function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
}

// Helper to format message time
export function formatMessageTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}