import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { useAuth } from './contexts/AuthContext';
import { fetchProducts } from './store/slices/productsSlice';
import { fetchVendors } from './store/slices/vendorsSlice';
import { fetchOrders } from './store/slices/ordersSlice';
import { fetchTransactions } from './store/slices/escrowSlice';
import { fetchUsers } from './store/slices/usersSlice';
import { joinGroup } from './store/slices/groupsSlice';
import {
  navigate,
  setRestorationComplete,
} from './store/slices/navigationSlice';
import { Welcome } from './components/onboarding/Welcome';
import { Login } from './components/auth/Login';
import { Signup } from './components/auth/Signup';
import { Home } from './components/dashboard/Home';
import { GroupCreate } from './components/groups/GroupCreate';
import { GroupDetailNew } from './components/groups/GroupDetailNew';
import { GroupsBrowse } from './components/groups/GroupsBrowse';
import { GroupDiscover } from './components/groups/GroupDiscover';
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
  | 'group-discover'
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
  const dispatch = useAppDispatch();
  const currentScreen = useAppSelector(state => state.navigation.currentScreen);
  const selectedGroupId = useAppSelector(state => state.navigation.selectedGroupId);
  const restorationComplete = useAppSelector(state => state.navigation.restorationComplete);

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
    'group-discover',
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
  // Note: redux-persist handles persistence automatically, but we need to validate restored state
  useEffect(() => {
    if (isAuthenticated && !isLoading && !restorationComplete) {
      // Validate that restored screen is valid for authenticated users
      if (currentScreen && authenticatedScreens.has(currentScreen)) {
        // Screen is valid, restoration already handled by redux-persist
        dispatch(setRestorationComplete(true));
      } else {
        // Invalid screen, navigate to home
        dispatch(navigate({ screen: 'home' }));
        dispatch(setRestorationComplete(true));
      }
    } else if (!isAuthenticated && !isLoading && !restorationComplete) {
      // Not authenticated, allow normal auth flow
      dispatch(setRestorationComplete(true));
    }
  }, [dispatch, isAuthenticated, isLoading, restorationComplete, currentScreen, authenticatedScreens]);

  // Handle ?join=CODE deep link
  useEffect(() => {
    if (!isAuthenticated || !restorationComplete) return;
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get('join');
    if (!joinCode) return;

    // Clean the URL
    window.history.replaceState({}, '', window.location.pathname);

    // Auto-join via invite link
    dispatch(joinGroup({ join_code: joinCode }) as any).then((result: any) => {
      if (result.meta?.requestStatus === 'fulfilled' && result.payload?.id) {
        dispatch(navigate({ screen: 'group-detail', groupId: result.payload.id }));
      } else {
        // Show groups page on failure — user will see the error in Redux state
        dispatch(navigate({ screen: 'groups' }));
      }
    });
  }, [isAuthenticated, restorationComplete, dispatch]);

  const handleNavigate = (screen: Screen, groupId?: string) => {
    // Redux-persist handles persistence automatically
    dispatch(navigate({ screen, groupId }));
  };

  const handleGetStarted = () => {
    dispatch(navigate({ screen: 'login' }));
  };

  const handleNavigateToSignup = () => {
    dispatch(navigate({ screen: 'signup' }));
  };

  const handleNavigateToLogin = () => {
    dispatch(navigate({ screen: 'login' }));
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
          handleNavigate('home');
        }
        return <Home navigate={handleNavigate} />;
      case 'home':
        return <Home navigate={handleNavigate} />;
      case 'groups':
        return <GroupsBrowse navigate={handleNavigate} />;
      case 'group-create':
        return <GroupCreate navigate={handleNavigate} />;
      case 'group-detail':
        return <GroupDetailNew navigate={handleNavigate} groupId={selectedGroupId} />;
      case 'group-discover':
        return <GroupDiscover navigate={handleNavigate} />;
      case 'products':
        return <ProductCatalog navigate={handleNavigate} groupId={selectedGroupId} />;
      case 'cart':
        return <GroupCart navigate={handleNavigate} groupId={selectedGroupId} />;
      case 'chat':
        return <VendorChat navigate={handleNavigate} groupId={selectedGroupId} />;
      case 'chat-dashboard':
        return <ChatDashboardReal navigate={handleNavigate} />;
      case 'checkout':
        return <Checkout navigate={handleNavigate} />;
      case 'tracking':
        return <OrderTracking navigate={handleNavigate} />;
      case 'review':
        return <ReviewForm navigate={handleNavigate} />;
      case 'profile':
        return <Profile navigate={handleNavigate} />;
      case 'escrow-checkout':
        return <EscrowCheckout navigate={handleNavigate} />;
      case 'escrow-buyer-dashboard':
        return <BuyerTransactionDashboard navigate={handleNavigate} />;
      case 'escrow-inspection':
        return <InspectionWindow navigate={handleNavigate} />;
      case 'escrow-seller-order':
        return <SellerOrderReceived navigate={handleNavigate} />;
      case 'escrow-seller-upload':
        return <SellerUploadProof navigate={handleNavigate} />;
      case 'escrow-seller-awaiting':
        return <SellerAwaitingInspection navigate={handleNavigate} />;
      case 'escrow-dispute':
        return <DisputeOpen navigate={handleNavigate} />;
      case 'escrow-mediation':
        return <DisputeMediation navigate={handleNavigate} />;
      case 'vendor-dashboard':
        return <VendorDashboard navigate={handleNavigate} />;
      case 'vendor-add-product':
        return <VendorAddProduct navigate={handleNavigate} />;
      case 'vendor-products':
        return <VendorProducts navigate={handleNavigate} />;
      case 'vendor-orders':
        return <VendorOrders navigate={handleNavigate} />;
      case 'vendor-customers':
        return <VendorCustomers navigate={handleNavigate} />;
      case 'admin-users':
        return <UserManagement navigate={handleNavigate} />;
      case 'admin-create-user':
        return <CreateUser navigate={handleNavigate} />;
      default:
        return <Home navigate={handleNavigate} />;
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
          <BottomNav currentScreen={currentScreen} navigate={handleNavigate} />
        )}
      </div>
      <Toaster />
      {/* TODO: Remove this after testing authorization */}
      <AuthorizationTestPanel />
    </div>
  );
}

export default AppContent;
