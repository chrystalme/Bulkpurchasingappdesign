import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import {
  User,
  Lock,
  Bell,
  Shield,
  LogOut,
  ArrowLeft,
  Edit2,
  Save,
  X,
  Star,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';
import { useAuth } from '../../contexts/AuthContext';
import type { User as UserType } from '../../lib/types';

interface ProfileSettingsProps {
  navigate?: (screen: string) => void;
}

export function ProfileSettings({ navigate }: ProfileSettingsProps) {
  const { user, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
    setSaveMessage(null);
  };

  const handleEditChange = (field: string, value: string) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = () => {
    setSaveMessage({
      type: 'success',
      text: 'Profile updated successfully!',
    });
    setTimeout(() => {
      setIsEditing(false);
      setSaveMessage(null);
    }, 2000);
  };

  const handlePasswordChange = () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setSaveMessage({
        type: 'error',
        text: 'Passwords do not match!',
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setSaveMessage({
        type: 'error',
        text: 'Password must be at least 6 characters!',
      });
      return;
    }

    setSaveMessage({
      type: 'success',
      text: 'Password updated successfully!',
    });

    setTimeout(() => {
      setShowPasswordForm(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setSaveMessage(null);
    }, 2000);
  };

  const handleLogout = () => {
    logout();
    if (navigate) {
      navigate('login');
    }
  };

  const getRoleColor = (role?: string) => {
    switch (role) {
      case 'superUser':
        return 'bg-red-100 text-red-800';
      case 'admin':
        return 'bg-blue-100 text-blue-800';
      case 'vendor':
        return 'bg-purple-100 text-purple-800';
      case 'member':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (role?: string) => {
    if (!role) return 'Member';
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0047AB] to-[#6EE7B7] p-6 lg:p-8">
        <div className="flex items-center gap-3">
          {navigate && (
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={() => navigate('dashboard')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div>
            <h1 className="text-white mb-1 text-3xl font-bold">Account Settings</h1>
            <p className="text-white/80">Manage your profile and preferences</p>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Profile Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar Section */}
            <div className="flex items-start gap-6">
              <Avatar className="h-20 w-20">
                <AvatarImage src={user?.avatar} />
                <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">{user?.name}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className={getRoleColor(user?.role)}>
                    {getRoleLabel(user?.role)}
                  </Badge>
                  {user?.trust_score && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Star className="w-3 h-3 fill-[#FACC15]" />
                      Trust Score: {user.trust_score}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Profile Form */}
            {!isEditing ? (
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-600">Full Name</Label>
                  <p className="text-lg font-medium">{editData.name}</p>
                </div>
                <div>
                  <Label className="text-gray-600">Email Address</Label>
                  <p className="text-lg font-medium">{editData.email}</p>
                </div>
                <div>
                  <Label className="text-gray-600">User ID</Label>
                  <p className="text-sm font-mono text-gray-600">{user?.id}</p>
                </div>
                <Button
                  onClick={handleEditToggle}
                  className="bg-[#0047AB] hover:bg-[#0047AB]/90 w-full"
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={editData.name}
                    onChange={(e) => handleEditChange('name', e.target.value)}
                    placeholder="Your full name"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={editData.email}
                    onChange={(e) => handleEditChange('email', e.target.value)}
                    placeholder="your.email@example.com"
                    className="mt-1"
                  />
                </div>

                {saveMessage && (
                  <Alert variant={saveMessage.type === 'success' ? 'default' : 'destructive'}>
                    {saveMessage.type === 'success' ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    <AlertDescription>{saveMessage.text}</AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={handleSaveProfile}
                    className="flex-1 bg-[#6EE7B7] hover:bg-[#6EE7B7]/90 text-[#0047AB]"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                  <Button
                    onClick={handleEditToggle}
                    variant="outline"
                    className="flex-1"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Security & Password
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!showPasswordForm ? (
              <div className="space-y-4">
                <p className="text-gray-600">Change your password to keep your account secure.</p>
                <Button
                  onClick={() => setShowPasswordForm(true)}
                  variant="outline"
                  className="w-full"
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Change Password
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) =>
                      setPasswordData(prev => ({
                        ...prev,
                        currentPassword: e.target.value,
                      }))
                    }
                    placeholder="Enter current password"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) =>
                      setPasswordData(prev => ({
                        ...prev,
                        newPassword: e.target.value,
                      }))
                    }
                    placeholder="Enter new password (min 6 characters)"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) =>
                      setPasswordData(prev => ({
                        ...prev,
                        confirmPassword: e.target.value,
                      }))
                    }
                    placeholder="Confirm new password"
                    className="mt-1"
                  />
                </div>

                {saveMessage && (
                  <Alert variant={saveMessage.type === 'success' ? 'default' : 'destructive'}>
                    {saveMessage.type === 'success' ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    <AlertDescription>{saveMessage.text}</AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={handlePasswordChange}
                    className="flex-1 bg-[#0047AB] hover:bg-[#0047AB]/90"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Update Password
                  </Button>
                  <Button
                    onClick={() => {
                      setShowPasswordForm(false);
                      setPasswordData({
                        currentPassword: '',
                        newPassword: '',
                        confirmPassword: '',
                      });
                      setSaveMessage(null);
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Account Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Preferences & Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start">
              <Bell className="w-4 h-4 mr-2" />
              Notification Settings
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Shield className="w-4 h-4 mr-2" />
              Privacy & Security
            </Button>
            <Button
              onClick={handleLogout}
              variant="destructive"
              className="w-full justify-start"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </CardContent>
        </Card>

        {/* Trust Score Info (if available) */}
        {user?.trust_score && (
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-900">
                <Star className="w-5 h-5 fill-[#FACC15]" />
                Your Trust Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-blue-900">Overall Score</span>
                  <span className="text-2xl font-bold text-blue-900">{user.trust_score}%</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div
                    className="bg-[#FACC15] h-2 rounded-full"
                    style={{ width: `${user.trust_score}%` }}
                  />
                </div>
                <p className="text-sm text-blue-800">
                  Your trust score is calculated based on completed transactions, ratings, and account verification.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
