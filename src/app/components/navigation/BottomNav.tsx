import { Home, Users, ShoppingCart, MessageCircle, User, Package, Shield, Settings } from 'lucide-react';
import type { Screen } from '../../App';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationsContext';

interface BottomNavProps {
  currentScreen: Screen;
  navigate: (screen: Screen) => void;
}

const mobileNavItems = [
  { id: 'home' as Screen, icon: Home, label: 'Home' },
  { id: 'group-detail' as Screen, icon: Users, label: 'Groups' },
  { id: 'cart' as Screen, icon: ShoppingCart, label: 'Cart' },
  { id: 'chat-dashboard' as Screen, icon: MessageCircle, label: 'Chat' },
  { id: 'profile' as Screen, icon: User, label: 'Profile' },
];

const sidebarSections = [
  {
    label: 'Main',
    items: [
      { id: 'home' as Screen, icon: Home, label: 'Dashboard' },
      { id: 'group-detail' as Screen, icon: Users, label: 'My Groups' },
      { id: 'products' as Screen, icon: ShoppingCart, label: 'Products' },
      { id: 'cart' as Screen, icon: Package, label: 'Cart' },
    ],
  },
  {
    label: 'Communication',
    items: [
      { id: 'chat-dashboard' as Screen, icon: MessageCircle, label: 'Messages' },
    ],
  },
  {
    label: 'Transactions',
    items: [
      { id: 'escrow-buyer-dashboard' as Screen, icon: Shield, label: 'Escrow' },
      { id: 'tracking' as Screen, icon: Package, label: 'Orders' },
    ],
  },
  {
    label: 'Account',
    items: [
      { id: 'profile' as Screen, icon: User, label: 'Profile' },
    ],
  },
];

function active(current: Screen, itemId: Screen): boolean {
  if (current === itemId) return true;
  if (itemId === 'chat-dashboard' && current === 'chat') return true;
  if (itemId === 'group-detail' && current === 'group-create') return true;
  if (itemId === 'escrow-buyer-dashboard' && current.startsWith('escrow')) return true;
  return false;
}

export function BottomNav({ currentScreen, navigate }: BottomNavProps) {
  const { user } = useAuth();
  const { totalUnread } = useNotifications();
  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <>
      {/* ── MOBILE TOP HEADER ──────────────────────────────────────── */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-[#0047AB]/10 h-14 flex items-center px-4 justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#0047AB] flex items-center justify-center">
            <Users className="w-4 h-4 text-white" />
          </div>
          <span
            className="font-bold text-[#0047AB] text-base tracking-tight"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            SaveTogether
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('chat-dashboard')}
            className="relative w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-[#EBF1FB] transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
            {totalUnread > 0 && (
              totalUnread > 9
                ? <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">{totalUnread > 99 ? '99+' : totalUnread}</span>
                : <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white" />
            )}
          </button>
          <button
            onClick={() => navigate('profile')}
            className="w-9 h-9 rounded-full bg-[#0047AB] flex items-center justify-center text-white text-xs font-bold"
          >
            {initials}
          </button>
        </div>
      </header>

      {/* Pushes content below fixed top header on mobile */}
      <div className="lg:hidden h-14" />

      {/* ── MOBILE BOTTOM NAV ──────────────────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#0047AB]/10">
        <div className="flex items-center justify-around h-16 px-1">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = active(currentScreen, item.id);
            const showBadge = item.id === 'chat-dashboard' && totalUnread > 0;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                className="flex flex-col items-center justify-center flex-1 h-full gap-0.5"
              >
                <div className={`relative w-8 h-6 rounded-md flex items-center justify-center transition-colors ${isActive ? 'bg-[#EBF1FB]' : ''}`}>
                  <Icon className={`w-5 h-5 ${isActive ? 'text-[#0047AB]' : 'text-gray-400'}`} />
                  {showBadge && (
                    <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                      {totalUnread > 9 ? '9+' : totalUnread}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-medium ${isActive ? 'text-[#0047AB]' : 'text-gray-400'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── DESKTOP SIDEBAR ────────────────────────────────────────── */}
      <nav className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-64 bg-white border-r border-[#0047AB]/10 z-50">
        {/* Brand */}
        <div className="px-5 py-5 border-b border-[#0047AB]/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0047AB] flex items-center justify-center">
              <Users className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="font-bold text-[#0047AB] text-sm" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                SaveTogether
              </div>
              <div className="text-[10px] text-gray-400">Buy Smarter, Together</div>
            </div>
          </div>
        </div>

        {/* Nav sections */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
          {sidebarSections.map((section) => (
            <div key={section.label}>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-2 mb-1.5">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = active(currentScreen, item.id);
                  return (
                    <button
                      key={`${section.label}-${item.id}`}
                      onClick={() => navigate(item.id)}
                      className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-[#0047AB] text-white shadow-sm'
                          : 'text-gray-600 hover:bg-[#F4F4F5] hover:text-[#0047AB]'
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span>{item.label}</span>
                      {item.id === 'chat-dashboard' && totalUnread > 0 && (
                        <span className="ml-auto min-w-[20px] h-5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                          {totalUnread > 99 ? '99+' : totalUnread}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* User card */}
        <div className="p-3 border-t border-[#0047AB]/10">
          <button
            onClick={() => navigate('profile')}
            className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#F4F4F5] transition-colors group"
          >
            <div className="w-9 h-9 rounded-full bg-[#0047AB] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="text-left min-w-0 flex-1">
              <div className="text-sm font-semibold text-gray-800 truncate">{user?.name || 'User'}</div>
              <div className="text-[10px] text-gray-400 truncate">{user?.email || ''}</div>
            </div>
            <Settings className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#0047AB] flex-shrink-0" />
          </button>
        </div>
      </nav>
    </>
  );
}
