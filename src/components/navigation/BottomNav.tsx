import { Home, Users, ShoppingCart, MessageCircle, User, Shield, Package, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import type { Screen } from '../../App';

interface BottomNavProps {
  currentScreen: Screen;
  navigate: (screen: Screen) => void;
}

export function BottomNav({ currentScreen, navigate }: BottomNavProps) {
  const { user } = useAuth();

  // Guest navigation — browse the marketplace without an account. Gated
  // actions (buy/join) redirect to login from the App-level handler.
  const guestItems = [
    { id: 'welcome' as Screen, icon: Home, label: 'Home' },
    { id: 'group-discover' as Screen, icon: Users, label: 'Groups' },
    { id: 'products' as Screen, icon: ShoppingCart, label: 'Products' },
  ];

  // SuperUser items (root platform management)
  const superUserItems = [
    { id: 'home' as Screen, icon: Home, label: 'Home' },
    { id: 'admin-users' as Screen, icon: Shield, label: 'Users' },
    { id: 'dispute-management' as Screen, icon: AlertTriangle, label: 'Disputes' },
    { id: 'profile' as Screen, icon: User, label: 'Profile' },
  ];

  // Admin-only items
  const adminItems = [
    { id: 'home' as Screen, icon: Home, label: 'Home' },
    { id: 'admin-users' as Screen, icon: Shield, label: 'Users' },
    { id: 'dispute-management' as Screen, icon: AlertTriangle, label: 'Disputes' },
    { id: 'profile' as Screen, icon: User, label: 'Profile' },
  ];

  // Vendor-only items (manage products, orders, chat, profile)
  const vendorItems = [
    { id: 'home' as Screen, icon: Home, label: 'Home' },
    { id: 'vendor-products' as Screen, icon: Package, label: 'Products' },
    { id: 'vendor-orders' as Screen, icon: ShoppingCart, label: 'Orders' },
    { id: 'chat-dashboard' as Screen, icon: MessageCircle, label: 'Chat' },
    { id: 'profile' as Screen, icon: User, label: 'Profile' },
  ];

  // Member items (purchase and group management)
  const memberItems = [
    { id: 'home' as Screen, icon: Home, label: 'Home' },
    { id: 'groups' as Screen, icon: Users, label: 'Groups' },
    { id: 'cart' as Screen, icon: ShoppingCart, label: 'Cart' },
    { id: 'chat-dashboard' as Screen, icon: MessageCircle, label: 'Chat' },
    { id: 'profile' as Screen, icon: User, label: 'Profile' },
  ];

  // Select nav items based on auth + role
  const navItems = !user
    ? guestItems
    : user?.role === 'superUser' ? superUserItems
    : user?.role === 'admin' ? adminItems
    : user?.role === 'vendor' ? vendorItems
    : memberItems;

  const isItemActive = (itemId: Screen) => {
    if (currentScreen === itemId) return true;
    if (itemId === 'chat-dashboard' && currentScreen === 'chat') return true;
    if (itemId === 'dispute-management' && (currentScreen === 'escrow-dispute' || currentScreen === 'escrow-mediation')) return true;
    if (itemId === 'admin-users' && currentScreen === 'admin-create-user') return true;
    if (itemId === 'vendor-products' && currentScreen === 'vendor-add-product') return true;
    if (itemId === 'groups' && (currentScreen === 'group-detail' || currentScreen === 'group-create' || currentScreen === 'group-discover')) return true;
    return false;
  };

  return (
    <>
      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 max-w-md mx-auto z-50 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-16 px-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = isItemActive(item.id);
            
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
                <span className={`text-[11px] font-medium mt-1 transition-colors ${
                  isActive ? 'text-[#0047AB]' : 'text-gray-400'
                }`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Desktop Side Navigation */}
      <nav className="hidden lg:block fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 z-50">
        <div className="p-6">
          <h2 className="text-[#0047AB] mb-8">BulkBuy</h2>
          <div className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = isItemActive(item.id);
              
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.id)}
                  className={`flex items-center gap-3 w-full p-3 rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-[#0047AB]/10 text-[#0047AB]' 
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}