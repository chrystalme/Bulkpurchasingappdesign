import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Welcome } from './components/onboarding/Welcome';
import { Login } from './components/auth/Login';
import { Signup } from './components/auth/Signup';
import { Home } from './components/dashboard/Home';
import { GroupCreate } from './components/groups/GroupCreate';
import { GroupDetailNew } from './components/groups/GroupDetailNew';
import { ProductCatalog } from './components/products/ProductCatalog';
import { GroupCart } from './components/products/GroupCart';
import { VendorChat } from './components/chat/VendorChat';
import { ChatDashboard } from './components/chat/ChatDashboard';
import { Checkout } from './components/checkout/Checkout';
import { OrderTracking } from './components/orders/OrderTracking';
import { ReviewForm } from './components/reviews/ReviewForm';
import { Profile } from './components/profile/Profile';
import { BottomNav } from './components/navigation/BottomNav';
import { Toaster } from './components/ui/sonner';
import { EscrowCheckout } from './components/escrow/buyer/EscrowCheckout';
import { BuyerTransactionDashboard } from './components/escrow/buyer/BuyerTransactionDashboard';
import { InspectionWindow } from './components/escrow/buyer/InspectionWindow';
import { SellerOrderReceived } from './components/escrow/seller/SellerOrderReceived';
import { SellerUploadProof } from './components/escrow/seller/SellerUploadProof';
import { SellerAwaitingInspection } from './components/escrow/seller/SellerAwaitingInspection';
import { DisputeOpen } from './components/escrow/dispute/DisputeOpen';
import { DisputeMediation } from './components/escrow/dispute/DisputeMediation';
import { VendorDashboard } from './components/vendor/VendorDashboard';
import { VendorAddProduct } from './components/vendor/VendorAddProduct';
import { VendorProducts } from './components/vendor/VendorProducts';
import { VendorOrders } from './components/vendor/VendorOrders';
import { VendorCustomers } from './components/vendor/VendorCustomers';
import { UserManagement } from './components/admin/UserManagement';
import { CreateUser } from './components/admin/CreateUser';

export type Screen = 
  | 'welcome'
  | 'login'
  | 'signup'
  | 'home'
  | 'group-create'
  | 'group-detail'
  | 'products'
  | 'cart'
  | 'chat'
  | 'chat-dashboard'
  | 'checkout'
  | 'tracking'
  | 'review'
  | 'profile'
  | 'escrow-checkout'
  | 'escrow-buyer-dashboard'
  | 'escrow-inspection'
  | 'escrow-seller-order'
  | 'escrow-seller-upload'
  | 'escrow-seller-awaiting'
  | 'escrow-dispute'
  | 'escrow-mediation'
  | 'vendor-dashboard'
  | 'vendor-add-product'
  | 'vendor-products'
  | 'vendor-orders'
  | 'vendor-customers'
  | 'admin-users'
  | 'admin-create-user';

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<Screen>('welcome');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const navigate = (screen: Screen, groupId?: string) => {
    if (groupId) setSelectedGroupId(groupId);
    setCurrentScreen(screen);
  };

  const handleGetStarted = () => {
    setCurrentScreen('login');
  };

  const handleNavigateToSignup = () => {
    setCurrentScreen('signup');
  };

  const handleNavigateToLogin = () => {
    setCurrentScreen('login');
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0047AB] to-[#6EE7B7] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const renderScreen = () => {
    // If not authenticated, only show welcome, login, or signup
    if (!isAuthenticated) {
      if (currentScreen === 'signup') {
        return <Signup onNavigateToLogin={handleNavigateToLogin} />;
      }
      if (currentScreen === 'login') {
        return <Login onNavigateToSignup={handleNavigateToSignup} />;
      }
      return <Welcome onGetStarted={handleGetStarted} />;
    }

    // Authenticated screens
    switch (currentScreen) {
      case 'welcome':
      case 'login':
      case 'signup':
        // Redirect to home if trying to access auth screens while authenticated
        navigate('home');
        return <Home navigate={navigate} />;
      case 'home':
        return <Home navigate={navigate} />;
      case 'group-create':
        return <GroupCreate navigate={navigate} />;
      case 'group-detail':
        return <GroupDetailNew navigate={navigate} groupId={selectedGroupId} />;
      case 'products':
        return <ProductCatalog navigate={navigate} groupId={selectedGroupId} />;
      case 'cart':
        return <GroupCart navigate={navigate} groupId={selectedGroupId} />;
      case 'chat':
        return <VendorChat navigate={navigate} groupId={selectedGroupId} />;
      case 'chat-dashboard':
        return <ChatDashboard navigate={navigate} />;
      case 'checkout':
        return <Checkout navigate={navigate} />;
      case 'tracking':
        return <OrderTracking navigate={navigate} />;
      case 'review':
        return <ReviewForm navigate={navigate} />;
      case 'profile':
        return <Profile navigate={navigate} />;
      case 'escrow-checkout':
        return <EscrowCheckout navigate={navigate} />;
      case 'escrow-buyer-dashboard':
        return <BuyerTransactionDashboard navigate={navigate} />;
      case 'escrow-inspection':
        return <InspectionWindow navigate={navigate} />;
      case 'escrow-seller-order':
        return <SellerOrderReceived navigate={navigate} />;
      case 'escrow-seller-upload':
        return <SellerUploadProof navigate={navigate} />;
      case 'escrow-seller-awaiting':
        return <SellerAwaitingInspection navigate={navigate} />;
      case 'escrow-dispute':
        return <DisputeOpen navigate={navigate} />;
      case 'escrow-mediation':
        return <DisputeMediation navigate={navigate} />;
      case 'vendor-dashboard':
        return <VendorDashboard navigate={navigate} />;
      case 'vendor-add-product':
        return <VendorAddProduct navigate={navigate} />;
      case 'vendor-products':
        return <VendorProducts navigate={navigate} />;
      case 'vendor-orders':
        return <VendorOrders navigate={navigate} />;
      case 'vendor-customers':
        return <VendorCustomers navigate={navigate} />;
      case 'admin-users':
        return <UserManagement navigate={navigate} />;
      case 'admin-create-user':
        return <CreateUser navigate={navigate} />;
      default:
        return <Home navigate={navigate} />;
    }
  };

  const showBottomNav = isAuthenticated && 
    currentScreen !== 'welcome' && 
    currentScreen !== 'login' && 
    currentScreen !== 'signup';

  return (
    <div className="min-h-screen bg-[#F4F4F5]">
      <div className="max-w-md lg:max-w-6xl mx-auto bg-white min-h-screen relative pb-20 lg:pb-0">
        {renderScreen()}
        {showBottomNav && (
          <BottomNav currentScreen={currentScreen} navigate={navigate} />
        )}
      </div>
      <Toaster />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}