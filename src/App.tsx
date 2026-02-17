import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Provider } from 'react-redux';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { store } from './store/store';
import { fetchProducts } from './store/slices/productsSlice';
import { fetchVendors } from './store/slices/vendorsSlice';
import { fetchOrders } from './store/slices/ordersSlice';
import { fetchTransactions } from './store/slices/escrowSlice';
import { fetchUsers } from './store/slices/usersSlice';
import { Welcome } from './components/onboarding/Welcome';
import { Login } from './components/auth/Login';
import { Signup } from './components/auth/Signup';
import { Home } from './components/dashboard/Home';
import { GroupCreate } from './components/groups/GroupCreate';
import { GroupDetailNew } from './components/groups/GroupDetailNew';
import { GroupsBrowse } from './components/groups/GroupsBrowse';
import { ProductCatalog } from './components/products/ProductCatalog';
import { GroupCart } from './components/products/GroupCart';
import { VendorChat } from './components/chat/VendorChat';
import { ChatDashboardReal } from './components/chat/ChatDashboardReal';
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
import { AuthorizationTestPanel } from './components/debug/AuthorizationTestPanel';

export type Screen =
  | 'welcome'
  | 'login'
  | 'signup'
  | 'home'
  | 'groups'
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
  const { isAuthenticated, isLoading, user } = useAuth();
  const dispatch = useDispatch();
  const [currentScreen, setCurrentScreen] = useState<Screen>('welcome');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [restorationComplete, setRestorationComplete] = useState(false);

  // Initialize Redux data on app boot
  useEffect(() => {
    if (isAuthenticated && !isLoading && restorationComplete) {
      // Always load these
      dispatch(fetchProducts() as any);
      dispatch(fetchVendors() as any);

      // Load if user is authenticated
      if (user) {
        dispatch(fetchOrders() as any);
        dispatch(fetchTransactions() as any);

        // Only load users if admin
        if (user.role === 'admin' || user.role === 'superUser') {
          dispatch(fetchUsers() as any);
        }
      }
    }
  }, [dispatch, isAuthenticated, isLoading, user, restorationComplete]);

  // Authenticated screens that can be restored after refresh
  const authenticatedScreens = new Set<Screen>([
    'home',
    'group-create',
    'group-detail',
    'products',
    'cart',
    'chat',
    'chat-dashboard',
    'checkout',
    'tracking',
    'review',
    'profile',
    'escrow-checkout',
    'escrow-buyer-dashboard',
    'escrow-inspection',
    'escrow-seller-order',
    'escrow-seller-upload',
    'escrow-seller-awaiting',
    'escrow-dispute',
    'escrow-mediation',
    'vendor-dashboard',
    'vendor-add-product',
    'vendor-products',
    'vendor-orders',
    'vendor-customers',
    'admin-users',
    'admin-create-user',
  ]);

  // Restore persisted screen state when authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      const savedScreen = localStorage.getItem('lastScreen') as Screen | null;
      const savedGroupId = localStorage.getItem('lastGroupId');

      // Only restore if it's a valid authenticated screen
      if (savedScreen && authenticatedScreens.has(savedScreen)) {
        setCurrentScreen(savedScreen);
        if (savedGroupId) setSelectedGroupId(savedGroupId);
      } else {
        // Default to home if no valid screen is saved
        setCurrentScreen('home');
      }
      setRestorationComplete(true);
    } else if (!isAuthenticated && !isLoading) {
      // Not authenticated, allow normal auth flow
      setRestorationComplete(true);
    }
  }, [isAuthenticated, isLoading]);

  const navigate = (screen: Screen, groupId?: string) => {
    // Persist navigation for authenticated users
    if (isAuthenticated && authenticatedScreens.has(screen)) {
      localStorage.setItem('lastScreen', screen);
      if (groupId) {
        setSelectedGroupId(groupId);
        localStorage.setItem('lastGroupId', groupId);
      } else {
        setSelectedGroupId(null);
        localStorage.removeItem('lastGroupId');
      }
    } else if (!authenticatedScreens.has(screen)) {
      // Clear persisted state when navigating to auth screens
      localStorage.removeItem('lastScreen');
      localStorage.removeItem('lastGroupId');
    }

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
        // Only redirect if restoration is complete (avoid race condition with useEffect)
        if (restorationComplete) {
          navigate('home');
        }
        return <Home navigate={navigate} />;
      case 'home':
        return <Home navigate={navigate} />;
      case 'groups':
        return <GroupsBrowse navigate={navigate} />;
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
        return <ChatDashboardReal navigate={navigate} />;
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

  const showBottomNav =
    isAuthenticated &&
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
      {/* TODO: Remove this after testing authorization */}
      <AuthorizationTestPanel />
    </div>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Provider>
  );
}
