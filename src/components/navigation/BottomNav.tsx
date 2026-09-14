import * as React from 'react';
import {
  Home,
  Users,
  ShoppingCart,
  MessageCircle,
  User,
  Shield,
  Package,
  AlertTriangle,
  Settings,
  Wallet,
  Receipt,
  Activity,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { toggleSidebar } from '../../store/slices/navigationSlice';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Brand } from '../brand/Brand';
import type { Screen } from '../../App';

type IconType = React.ComponentType<{ className?: string }>;

interface BottomNavProps {
  currentScreen: Screen;
  navigate: (screen: Screen) => void;
}

interface NavItem {
  id: Screen;
  icon: IconType;
  label: string;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

/** True when the current screen (incl. sub-screens) belongs to a nav item. */
function isItemActive(current: Screen, itemId: Screen): boolean {
  if (current === itemId) return true;
  switch (itemId) {
    case 'chat-dashboard':
      return current === 'chat';
    case 'groups':
      return current === 'group-detail' || current === 'group-create' || current === 'group-discover';
    case 'tracking':
      return current === 'checkout' || current === 'review';
    case 'transaction-history':
      return current === 'transaction-history';
    case 'dispute-management':
      return current === 'escrow-dispute' || current === 'escrow-mediation' || current === 'dispute-management';
    case 'escrow-buyer-dashboard':
      return (
        current === 'escrow-checkout' ||
        current === 'escrow-inspection' ||
        current === 'escrow-buyer-dashboard'
      );
    case 'admin-users':
      return current === 'admin-create-user';
    case 'vendor-products':
      return current === 'vendor-add-product' || current === 'vendor-product-detail' || current === 'vendor-product-edit';
    case 'vendor-orders':
      return current === 'vendor-orders';
    case 'vendor-customers':
      return current === 'vendor-customers';
    case 'vendor-analytics':
      return current === 'vendor-analytics';
    case 'profile':
      return current === 'profile-settings';
    default:
      return false;
  }
}

export function BottomNav({ currentScreen, navigate }: BottomNavProps) {
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const collapsed = useAppSelector((state) => state.navigation.sidebarCollapsed);
  const totalUnread = useAppSelector((state) =>
    state.chat.conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0)
  );
  const selectedConversationId = useAppSelector(
    (state) => state.chat.selectedConversationId
  );
  const isChatCapableScreen =
    currentScreen === 'chat' ||
    currentScreen === 'chat-dashboard' ||
    currentScreen === 'group-detail';
  const isChatOpen = isChatCapableScreen && Boolean(selectedConversationId);

  if (isChatOpen) {
    return null;
  }

  // ── Role-based sidebar sections (grouped exactly as the Figma design) ──
  const guestSections: NavSection[] = [
    {
      label: 'Main',
      items: [
        { id: 'welcome' as Screen, icon: Home, label: 'Home' },
        { id: 'group-discover' as Screen, icon: Users, label: 'Groups' },
        { id: 'products' as Screen, icon: ShoppingCart, label: 'Products' },
      ],
    },
  ];

  const memberSections: NavSection[] = [
    {
      label: 'Main',
      items: [
        { id: 'home' as Screen, icon: Home, label: 'Dashboard' },
        { id: 'groups' as Screen, icon: Users, label: 'My Groups' },
        { id: 'products' as Screen, icon: ShoppingCart, label: 'Products' },
        { id: 'cart' as Screen, icon: Package, label: 'Cart' },
      ],
    },
    {
      label: 'Communication',
      items: [{ id: 'chat-dashboard' as Screen, icon: MessageCircle, label: 'Messages' }],
    },
    {
      label: 'Transactions',
      items: [
        { id: 'escrow-buyer-dashboard' as Screen, icon: Shield, label: 'Escrow' },
        { id: 'tracking' as Screen, icon: Receipt, label: 'Orders' },
      ],
    },
    {
      label: 'Account',
      items: [{ id: 'profile' as Screen, icon: User, label: 'Profile' }],
    },
  ];

  const vendorSections: NavSection[] = [
    {
      label: 'Main',
      items: [
        { id: 'home' as Screen, icon: Home, label: 'Dashboard' },
        { id: 'vendor-products' as Screen, icon: ShoppingCart, label: 'Products' },
        { id: 'vendor-orders' as Screen, icon: Receipt, label: 'Orders' },
        { id: 'vendor-customers' as Screen, icon: Users, label: 'Customers' },
        { id: 'vendor-analytics' as Screen, icon: Activity, label: 'Analytics' },
      ],
    },
    {
      label: 'Communication',
      items: [{ id: 'chat-dashboard' as Screen, icon: MessageCircle, label: 'Messages' }],
    },
    {
      label: 'Account',
      items: [{ id: 'profile' as Screen, icon: User, label: 'Profile' }],
    },
  ];

  const adminSections: NavSection[] = [
    {
      label: 'Main',
      items: [
        { id: 'home' as Screen, icon: Home, label: 'Dashboard' },
        { id: 'admin-users' as Screen, icon: Users, label: 'Users' },
        { id: 'dispute-management' as Screen, icon: AlertTriangle, label: 'Disputes' },
      ],
    },
    {
      label: 'Communication',
      items: [{ id: 'chat-dashboard' as Screen, icon: MessageCircle, label: 'Messages' }],
    },
    {
      label: 'Transactions',
      items: [
        { id: 'transaction-history' as Screen, icon: Wallet, label: 'Transactions' },
        { id: 'escrow-buyer-dashboard' as Screen, icon: Shield, label: 'Escrow' },
      ],
    },
    {
      label: 'Account',
      items: [{ id: 'profile' as Screen, icon: User, label: 'Profile' }],
    },
  ];

  const sections: NavSection[] = !user
    ? guestSections
    : user?.role === 'superUser' || user?.role === 'admin'
      ? adminSections
      : user?.role === 'vendor'
        ? vendorSections
        : memberSections;

  // Mobile bottom nav (also grouped by role, keeps the fixed 5-tab layout)
  const guestItems = [
    { id: 'welcome' as Screen, icon: Home, label: 'Home' },
    { id: 'group-discover' as Screen, icon: Users, label: 'Groups' },
    { id: 'products' as Screen, icon: ShoppingCart, label: 'Products' },
  ];

  const adminItems = [
    { id: 'home' as Screen, icon: Home, label: 'Home' },
    { id: 'admin-users' as Screen, icon: Shield, label: 'Users' },
    { id: 'dispute-management' as Screen, icon: AlertTriangle, label: 'Disputes' },
    { id: 'profile' as Screen, icon: User, label: 'Profile' },
  ];

  const vendorItems = [
    { id: 'home' as Screen, icon: Home, label: 'Home' },
    { id: 'vendor-products' as Screen, icon: Package, label: 'Products' },
    { id: 'vendor-orders' as Screen, icon: ShoppingCart, label: 'Orders' },
    { id: 'chat-dashboard' as Screen, icon: MessageCircle, label: 'Messages' },
    { id: 'profile' as Screen, icon: User, label: 'Profile' },
  ];

  const memberItems = [
    { id: 'home' as Screen, icon: Home, label: 'Home' },
    { id: 'groups' as Screen, icon: Users, label: 'Groups' },
    { id: 'cart' as Screen, icon: ShoppingCart, label: 'Cart' },
    { id: 'chat-dashboard' as Screen, icon: MessageCircle, label: 'Messages' },
    { id: 'profile' as Screen, icon: User, label: 'Profile' },
  ];

  const mobileItems = !user
    ? guestItems
    : user?.role === 'superUser' || user?.role === 'admin'
      ? adminItems
      : user?.role === 'vendor'
        ? vendorItems
        : memberItems;

  const userInitial = user?.name
    ? user.name[0].toUpperCase()
    : user?.email
      ? user.email[0].toUpperCase()
      : 'U';

  return (
    <>
      {/* ── Mobile Bottom Navigation ──────────────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 max-w-md mx-auto z-50 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-16 px-1">
          {mobileItems.map((item) => {
            const Icon = item.icon;
            const isActive = isItemActive(currentScreen, item.id);

            return (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                className="flex flex-col items-center justify-center flex-1 h-full min-h-[48px] transition-all active:scale-95 touch-manipulation select-none"
              >
                <Icon
                  className={`w-6 h-6 transition-colors ${
                    isActive ? 'text-[#0047AB]' : 'text-gray-400'
                  }`}
                />
                <span
                  className={`text-[11px] font-medium mt-1 transition-colors ${
                    isActive ? 'text-[#0047AB]' : 'text-gray-400'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── Desktop Sidebar (grouped, retractable) ───────────────────── */}
      <nav
        className={`hidden lg:flex flex-col fixed left-0 top-0 h-full z-50 bg-white border-r border-[#0047AB]/10 ${
          collapsed ? 'w-20' : 'w-64'
        } transition-all duration-300`}
      >
        {/* Brand */}
        <div className={`${collapsed ? 'px-2 py-4' : 'px-5 py-5'} border-b border-[#0047AB]/10`}>
          {collapsed ? (
            <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-[#0047AB]">
              <Home className="w-4 h-4 text-white" />
            </div>
          ) : (
            <Brand size="lg" tagline />
          )}
        </div>

        {/* Nav sections */}
        <div
          className={`flex-1 overflow-y-auto py-4 space-y-5 ${
            collapsed ? 'px-2' : 'px-3'
          }`}
        >
          {sections.map((section) => (
            <div key={section.label}>
              {!collapsed && (
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-2 mb-1.5">
                  {section.label}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = isItemActive(currentScreen, item.id);

                  return (
                    <button
                      key={`${section.label}-${item.id}`}
                      onClick={() => navigate(item.id)}
                      title={collapsed ? item.label : undefined}
                      className={`flex items-center gap-3 w-full rounded-xl text-sm font-medium transition-all ${
                        collapsed
                          ? `px-2 py-2.5 justify-center ${
                              isActive
                                ? 'bg-[#0047AB] text-white shadow-sm'
                                : 'text-gray-600 hover:bg-[#F4F4F5] hover:text-[#0047AB]'
                            }`
                          : `px-3 py-2.5 ${
                              isActive
                                ? 'bg-[#0047AB] text-white shadow-sm'
                                : 'text-gray-600 hover:bg-[#F4F4F5] hover:text-[#0047AB]'
                            }`
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      {!collapsed && <span>{item.label}</span>}
                      {!collapsed && item.id === 'chat-dashboard' && totalUnread > 0 && (
                        <span className="ml-auto min-w-[20px] h-5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                          {totalUnread > 99 ? '99+' : totalUnread}
                        </span>
                      )}
                      {collapsed && item.id === 'chat-dashboard' && totalUnread > 0 && (
                        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Collapse toggle */}
        <div className="border-t border-[#0047AB]/10">
          <button
            onClick={() => dispatch(toggleSidebar())}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`w-full flex items-center gap-3 rounded-xl text-sm font-medium text-gray-600 hover:bg-[#F4F4F5] hover:text-[#0047AB] transition-colors ${
              collapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5'
            }`}
          >
            {collapsed ? (
              <ChevronsRight className="w-4 h-4 flex-shrink-0" />
            ) : (
              <>
                <ChevronsLeft className="w-4 h-4 flex-shrink-0" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>

        {/* User footer card (Figma design) — only for signed-in users */}
        {user && (
          <div className="p-3 border-t border-[#0047AB]/10">
            <button
              onClick={() => navigate('profile')}
              title={collapsed ? 'Profile' : undefined}
              className={`w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#F4F4F5] transition-colors group ${
                collapsed ? 'justify-center' : ''
              }`}
            >
              <Avatar className="h-9 w-9 rounded-full border border-gray-200 flex-shrink-0">
                <AvatarImage src={user?.avatar} alt={user?.name || user?.email} />
                <AvatarFallback className="bg-[#0047AB] text-white text-xs font-bold">
                  {userInitial}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <>
                  <div className="text-left min-w-0 flex-1">
                    <div className="text-sm font-semibold text-gray-800 truncate group-hover:text-[#0047AB] transition-colors">
                      {user?.name || 'User'}
                    </div>
                    <div className="text-[10px] text-gray-400 truncate">{user?.email || ''}</div>
                  </div>
                  <Settings
                    className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#0047AB] flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('profile-settings');
                    }}
                  />
                </>
              )}
            </button>
          </div>
        )}
      </nav>
    </>
  );
}