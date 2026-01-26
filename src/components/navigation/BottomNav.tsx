import { Home, Users, ShoppingCart, MessageCircle, User } from 'lucide-react';
import type { Screen } from '../../App';

interface BottomNavProps {
  currentScreen: Screen;
  navigate: (screen: Screen) => void;
}

export function BottomNav({ currentScreen, navigate }: BottomNavProps) {
  const navItems = [
    { id: 'home' as Screen, icon: Home, label: 'Home' },
    { id: 'group-detail' as Screen, icon: Users, label: 'Groups' },
    { id: 'cart' as Screen, icon: ShoppingCart, label: 'Cart' },
    { id: 'chat-dashboard' as Screen, icon: MessageCircle, label: 'Chat' },
    { id: 'profile' as Screen, icon: User, label: 'Profile' },
  ];

  return (
    <>
      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 max-w-md mx-auto z-50">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentScreen === item.id || 
              (item.id === 'chat-dashboard' && currentScreen === 'chat');
            
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                className="flex flex-col items-center justify-center flex-1 h-full transition-colors"
              >
                <Icon 
                  className={`w-6 h-6 ${
                    isActive ? 'text-[#0047AB]' : 'text-gray-400'
                  }`}
                />
                <span className={`text-xs mt-1 ${
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
              const isActive = currentScreen === item.id || 
                (item.id === 'chat-dashboard' && currentScreen === 'chat');
              
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