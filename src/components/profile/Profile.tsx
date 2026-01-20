import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Separator } from '../ui/separator';
import {
  ChevronRight,
  CreditCard,
  Package,
  Bell,
  HelpCircle,
  Shield,
  LogOut,
  Settings,
  Users,
  TrendingDown,
  Award,
  UserCog,
} from 'lucide-react';
import type { Screen } from '../../App';
import { TrustScore } from '../escrow/TrustScore';
import { mockTrustScores } from '../../lib/mockData';
import { useAuth } from '../../contexts/AuthContext';
import { permissions } from '../../lib/auth';
import { toast } from 'sonner';

interface ProfileProps {
  navigate: (screen: Screen) => void;
}

export function Profile({ navigate }: ProfileProps) {
  const { user, logout } = useAuth();

  // Fallback if no user (shouldn't happen in authenticated state)
  if (!user) {
    return null;
  }

  // Get trust score for current user
  const userTrustScore = mockTrustScores[0];

  // Format member since date
  const memberSince = new Date(user.createdAt).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  // Mock user stats (in a real app, these would come from the backend)
  const userStats = {
    groups: 3,
    orders: 12,
    saved: 24000,
  };

  const handleLogout = () => {
    if (confirm('Are you sure you want to log out?')) {
      logout();
      toast.success('Logged out successfully');
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'superUser':
        return 'bg-[#FB7185]/10 text-[#FB7185] border-[#FB7185]/20';
      case 'admin':
        return 'bg-[#0047AB]/10 text-[#0047AB] border-[#0047AB]/20';
      case 'vendor':
        return 'bg-[#6EE7B7]/10 text-[#10B981] border-[#6EE7B7]/20';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const menuSections = [
    {
      title: 'Account',
      items: [
        { icon: Settings, label: 'Account Settings', screen: null },
        { icon: CreditCard, label: 'Payment Methods', screen: null },
        { icon: Package, label: 'Order History', screen: 'tracking' as const },
        { icon: Users, label: 'My Groups', screen: 'group-detail' as const },
      ],
    },
    ...(permissions.canManageUsers(user.role) ? [{
      title: 'Administration',
      items: [
        { icon: UserCog, label: 'User Management', screen: 'admin-users' as const },
      ],
    }] : []),
    ...(permissions.canAccessVendorDashboard(user.role) ? [{
      title: 'Vendor',
      items: [
        { icon: Package, label: 'Vendor Dashboard', screen: 'vendor-dashboard' as const },
      ],
    }] : []),
    {
      title: 'Preferences',
      items: [
        { icon: Bell, label: 'Notifications', screen: null },
        { icon: Shield, label: 'Privacy & Security', screen: null },
      ],
    },
    {
      title: 'Support',
      items: [
        { icon: HelpCircle, label: 'Help Center', screen: null },
        { icon: Package, label: 'Contact Support', screen: null },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#F4F4F5]">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0047AB] to-[#6EE7B7] p-6 lg:p-8 pb-8">
        <div className="flex items-center gap-4 mb-6">
          <Avatar className="h-20 w-20 border-4 border-white">
            <AvatarImage src={user.avatar} />
            <AvatarFallback>{user.name[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1 text-white">
            <h3 className="text-white mb-1">{user.name}</h3>
            <p className="text-white/80 text-sm mb-2">{user.email}</p>
            <Badge className="bg-white/20 text-white border-white/30">
              Member since {memberSince}
            </Badge>
            <Badge className={getRoleBadgeColor(user.role)}>
              {user.role}
            </Badge>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
            <CardContent className="p-3 text-center">
              <Users className="w-5 h-5 text-white mx-auto mb-1" />
              <div className="text-white">{userStats.groups}</div>
              <div className="text-white/80 text-xs">Groups</div>
            </CardContent>
          </Card>
          <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
            <CardContent className="p-3 text-center">
              <Package className="w-5 h-5 text-white mx-auto mb-1" />
              <div className="text-white">{userStats.orders}</div>
              <div className="text-white/80 text-xs">Orders</div>
            </CardContent>
          </Card>
          <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
            <CardContent className="p-3 text-center">
              <TrendingDown className="w-5 h-5 text-[#FACC15] mx-auto mb-1" />
              <div className="text-white">₦{(userStats.saved / 1000).toFixed(0)}K</div>
              <div className="text-white/80 text-xs">Saved</div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="p-4 lg:p-6 -mt-4">
        <div className="max-w-3xl mx-auto space-y-4">
        {/* Trust Score Section */}
        <TrustScore trustScore={userTrustScore} variant="full" />

        {/* Achievement Badge */}
        <Card className="bg-gradient-to-br from-[#FACC15]/10 to-[#FB7185]/10 border-[#FACC15]/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#FACC15]/20 rounded-full flex items-center justify-center">
                <Award className="w-6 h-6 text-[#FACC15]" />
              </div>
              <div className="flex-1">
                <h5 className="mb-1">Super Saver 🎉</h5>
                <p className="text-sm text-gray-600">
                  You've saved over ₦20,000 with group buying!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Menu Sections */}
        {menuSections.map((section, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <h5 className="mb-3 text-gray-600">{section.title}</h5>
              <div className="space-y-1">
                {section.items.map((item, itemIndex) => {
                  const Icon = item.icon;
                  return (
                    <div key={itemIndex}>
                      {itemIndex > 0 && <Separator className="my-1" />}
                      <button
                        onClick={() => item.screen && navigate(item.screen)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <Icon className="w-5 h-5 text-gray-400" />
                        <span className="flex-1 text-left">{item.label}</span>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Logout */}
        <Button
          variant="outline"
          className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
          size="lg"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5 mr-2" />
          Logout
        </Button>

        {/* App Version */}
        <p className="text-center text-sm text-gray-400 pb-4">
          Version 1.0.0
        </p>
        </div>
      </div>
    </div>
  );
}