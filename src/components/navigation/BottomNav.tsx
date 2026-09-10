import {
  Home,
  Users,
  ShoppingCart,
  MessageCircle,
  User,
  Shield,
  Package,
  AlertTriangle,
  ShoppingBag,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useAppSelector } from '../../store/hooks';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import type { Screen } from '../../App';

interface BottomNavProps {
  currentScreen: Screen;
  navigate: (screen: Screen) => void;
}

interface NavItem {
  id: Screen;
  icon: any;
  label: string;
  badge?: number | string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export function BottomNav({ currentScreen, navigate }: BottomNavProps) {
  const { user } = useAuth();
  const cartItems = useAppSelector(state => state.cart.items);

  // Guest sections
  const guestSections: NavSection[] = [
    {
      title: 'EXPLORE',
      items: [
        { id: 'welcome' as Screen, icon: Home, label: 'Home' },
        { id: 'group-discover' as Screen, icon: Users, label: 'Discover Groups' },
        { id: 'products' as Screen, icon: ShoppingBag, label: 'Marketplace' },
      ],
    },
  ];

  // SuperUser sections (root platform control)
  const superUserSections: NavSection[] = [
    {
      title: 'PLATFORM',
      items: [{ id: 'home' as Screen, icon: Home, label: 'Platform Overview' }],
    },
    {
      title: 'CONTROL CENTER',
      items: [
        { id: 'admin-users' as Screen, icon: Shield, label: 'User Directory' },
        { id: 'dispute-management' as Screen, icon: AlertTriangle, label: 'Dispute Mediation' },
      ],
    },
    {
      title: 'ACCOUNT',
      items: [{ id: 'profile' as Screen, icon: User, label: 'SuperUser Profile' }],
    },
  ];

  // Admin sections (platform administration & mediation)
  const adminSections: NavSection[] = [
    {
      title: 'OVERVIEW',
      items: [{ id: 'home' as Screen, icon: Home, label: 'Admin Dashboard' }],
    },
    {
      title: 'MANAGEMENT',
      items: [
        { id: 'admin-users' as Screen, icon: Shield, label: 'User Management' },
        { id: 'dispute-management' as Screen, icon: AlertTriangle, label: 'Dispute Mediation' },
      ],
    },
    {
      title: 'ACCOUNT',
      items: [{ id: 'profile' as Screen, icon: User, label: 'Admin Profile' }],
    },
  ];

  // Vendor sections (catalog, bulk orders, customer messages)
  const vendorSections: NavSection[] = [
    {
      title: 'VENDOR HUB',
      items: [
        { id: 'home' as Screen, icon: Home, label: 'Dashboard' },
        { id: 'vendor-products' as Screen, icon: Package, label: 'My Products' },
        { id: 'vendor-orders' as Screen, icon: ShoppingCart, label: 'Group Orders' },
      ],
    },
    {
      title: 'COMMUNICATION',
      items: [{ id: 'chat-dashboard' as Screen, icon: MessageCircle, label: 'Customer Chats' }],
    },
    {
      title: 'ACCOUNT',
      items: [{ id: 'profile' as Screen, icon: User, label: 'Vendor Profile' }],
    },
  ];

  // Member sections (buying groups, marketplace, cart, chat)
  const memberSections: NavSection[] = [
    {
      title: 'OVERVIEW',
      items: [
        { id: 'home' as Screen, icon: Home, label: 'Dashboard' },
        { id: 'groups' as Screen, icon: Users, label: 'My Groups' },
      ],
    },
    {
      title: 'MARKETPLACE',
      items: [
        { id: 'products' as Screen, icon: ShoppingBag, label: 'Wholesale Products' },
        {
          id: 'cart' as Screen,
          icon: ShoppingCart,
          label: 'Group Cart',
          badge: cartItems.length > 0 ? cartItems.length : undefined,
        },
      ],
    },
    {
      title: 'MESSAGING',
      items: [{ id: 'chat-dashboard' as Screen, icon: MessageCircle, label: 'Group Chat' }],
    },
    {
      title: 'ACCOUNT',
      items: [{ id: 'profile' as Screen, icon: User, label: 'Profile' }],
    },
  ];

  // Select sections based on user role
  const navSections = !user
    ? guestSections
    : user?.role === 'superUser'
      ? superUserSections
      : user?.role === 'admin'
        ? adminSections
        : user?.role === 'vendor'
          ? vendorSections
          : memberSections;

  // Flatten primary items for mobile bottom bar (max 5 items)
  const mobileItems = navSections
    .flatMap(s => s.items)
    .filter((item, index, self) => index === self.findIndex(t => t.id === item.id))
    .slice(0, 5);

  const isItemActive = (itemId: Screen) => {
    if (currentScreen === itemId) return true;
    if (itemId === 'chat-dashboard' && currentScreen === 'chat') return true;
    if (
      itemId === 'dispute-management' &&
      (currentScreen === 'escrow-dispute' || currentScreen === 'escrow-mediation')
    )
      return true;
    if (itemId === 'admin-users' && currentScreen === 'admin-create-user') return true;
    if (itemId === 'vendor-products' && currentScreen === 'vendor-add-product') return true;
    if (
      itemId === 'groups' &&
      (currentScreen === 'group-detail' ||
        currentScreen === 'group-create' ||
        currentScreen === 'group-discover')
    )
      return true;
    if (itemId === 'cart' && currentScreen === 'checkout') return true;
    return false;
  };

  const userInitial = user?.name
    ? user.name[0].toUpperCase()
    : user?.email
      ? user.email[0].toUpperCase()
      : 'U';

  const roleDisplay =
    user?.role === 'superUser'
      ? 'Super User'
      : user?.role === 'admin'
        ? 'Admin'
        : user?.role === 'vendor'
          ? 'Vendor'
          : 'Member';

  return (
    <>
      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 max-w-md mx-auto z-50 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-16 px-1">
          {mobileItems.map(item => {
            const Icon = item.icon;
            const isActive = isItemActive(item.id);

            return (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                className="flex flex-col items-center justify-center flex-1 h-full min-h-[48px] transition-all active:scale-95 touch-manipulation select-none relative"
              >
                <div className="relative">
                  <Icon
                    className={`w-6 h-6 transition-colors ${
                      isActive ? 'text-[#0047AB]' : 'text-gray-400'
                    }`}
                  />
                  {item.badge !== undefined && (
                    <span className="absolute -top-1 -right-2 bg-[#0047AB] text-white text-[9px] font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </div>
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

      {/* Desktop Side Navigation */}
      <nav className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 z-50">
        {/* Brand Header */}
        <div className="p-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#0047AB] text-white font-black flex items-center justify-center text-sm shadow-xs">
              BB
            </div>
            <div>
              <h2 className="text-[#0047AB] font-bold text-lg leading-none">BulkBuy</h2>
              <p className="text-[10px] text-gray-400 font-medium tracking-wide mt-0.5 uppercase">
                Save Together
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Categories and Items */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
          {navSections.map(section => (
            <div key={section.title} className="space-y-1">
              <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400 select-none">
                {section.title}
              </div>
              <div className="space-y-1">
                {section.items.map(item => {
                  const Icon = item.icon;
                  const isActive = isItemActive(item.id);

                  return (
                    <button
                      key={item.id}
                      onClick={() => navigate(item.id)}
                      className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-[#0047AB]/10 text-[#0047AB] font-semibold'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-[#0047AB]' : 'text-gray-500'}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge !== undefined && (
                        <Badge className="bg-[#0047AB] text-white text-[10px] px-1.5 py-0.2 h-4">
                          {item.badge}
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom User Profile Section (Matching Figma Design) */}
        <div className="mt-auto border-t border-gray-200 p-4 bg-gray-50/50">
          {user ? (
            <div
              onClick={() => navigate('profile')}
              className="flex items-center gap-3 p-2 rounded-xl hover:bg-white border border-transparent hover:border-gray-200 cursor-pointer transition-all shadow-2xs group"
              title="View your profile"
            >
              <Avatar className="h-10 w-10 border border-gray-200 flex-shrink-0">
                <AvatarImage src={user.avatar} alt={user.name || user.email} />
                <AvatarFallback className="bg-[#0047AB]/10 text-[#0047AB] font-bold text-sm">
                  {userInitial}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-[#0047AB] transition-colors">
                    {user.name || 'User'}
                  </p>
                </div>
                <p className="text-xs text-gray-500 truncate" title={user.email}>
                  {user.email}
                </p>
                <span className="inline-block mt-1 text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.2 rounded bg-blue-50 text-[#0047AB] border border-blue-100">
                  {roleDisplay}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center p-2">
              <p className="text-xs text-gray-500 mb-2">Browsing as Guest</p>
              <button
                onClick={() => navigate('login' as Screen)}
                className="w-full text-xs font-semibold text-[#0047AB] bg-blue-50 hover:bg-blue-100 py-2 rounded-lg transition-colors"
              >
                Sign In
              </button>
            </div>
          )}
        </div>
      </nav>
    </>
  );
}