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
  setPendingNavigation,
  clearPendingNavigation,
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
import { ChatDashboardReal } from './components/chat/ChatDashboardReal';
import { Checkout } from './components/checkout/Checkout';
import { OrderTracking } from './components/orders/OrderTracking';
import { ReviewForm } from './components/reviews/ReviewForm';
import { Profile } from './components/profile/Profile';
import { BottomNav } from './components/navigation/BottomNav';
import { Toaster } from './components/ui/sonner';
import { ErrorBoundary } from './components/errors/ErrorBoundary';
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
import { VendorProductDetail } from './components/vendor/VendorProductDetail';
import { VendorOrders } from './components/vendor/VendorOrders';
import { VendorCustomers } from './components/vendor/VendorCustomers';
import { UserManagement } from './components/admin/UserManagement';
import { CreateUser } from './components/admin/CreateUser';
import { ProfileSettings } from './components/profile/ProfileSettings';
import { VendorAnalytics } from './components/vendor/VendorAnalytics';
import { TransactionHistory } from './components/orders/TransactionHistory';
import { DisputeManagement } from './components/escrow/DisputeManagement';

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
  | 'vendor-product-detail'
  | 'vendor-product-edit'
  | 'vendor-orders'
  | 'vendor-customers'
  | 'vendor-analytics'
  | 'admin-users'
  | 'admin-create-user'
  | 'profile-settings'
  | 'transaction-history'
  | 'dispute-management';

/** Navigation signature shared by the screens that take a selected id. */
export type NavigateFn = (
  screen: Screen,
  groupId?: string,
  productId?: string | null
) => void;

function AppContent() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const dispatch = useAppDispatch();
  const currentScreen = useAppSelector(state => state.navigation.currentScreen);
  const selectedGroupId = useAppSelector(state => state.navigation.selectedGroupId);
  const selectedProductId = useAppSelector(state => state.navigation.selectedProductId);
  const sidebarCollapsed = useAppSelector(state => state.navigation.sidebarCollapsed);
  const restorationComplete = useAppSelector(state => state.navigation.restorationComplete);
  const pendingScreen = useAppSelector(state => state.navigation.pendingScreen);
  const pendingGroupId = useAppSelector(state => state.navigation.pendingGroupId);

  // Screens a guest may browse without an account. Everything else routes
  // to login (see handleNavigate) — buying and joining stay gated.
  const guestScreens = new Set<Screen>([
    'welcome',
    'login',
    'signup',
    'products',
    'group-discover',
  ]);

  // Initialize Redux data on app boot
  useEffect(() => {
    if (!isLoading && restorationComplete) {
      // Always load products and vendors so public landing page & catalog are populated
      dispatch(fetchProducts() as any);
      dispatch(fetchVendors() as any);

      // Load if user is authenticated
      if (isAuthenticated && user) {
        dispatch(fetchOrders() as any);
        dispatch(fetchTransactions() as any);

        // Only load users if admin or superUser
        if (user.role === 'admin' || user.role === 'superUser') {
          dispatch(fetchUsers() as any);
        }
      }
    }
  }, [dispatch, isAuthenticated, isLoading, user, restorationComplete]);

  // Helper to check if a screen is allowed for a user's role
  const isScreenAllowedForRole = (screen: Screen, role?: string): boolean => {
    // Universal authenticated screens
    if (
      screen === 'welcome' ||
      screen === 'login' ||
      screen === 'signup' ||
      screen === 'home' ||
      screen === 'profile' ||
      screen === 'profile-settings' ||
      screen === 'chat' ||
      screen === 'chat-dashboard' ||
      screen === 'transaction-history'
    ) {
      return true;
    }

    if (role === 'vendor') {
      return (
        screen.startsWith('vendor-') ||
        screen.startsWith('escrow-seller') ||
        screen === 'escrow-dispute' ||
        screen === 'escrow-mediation'
      );
    }

    if (role === 'admin' || role === 'superUser') {
      return (
        screen === 'admin-users' ||
        screen === 'admin-create-user' ||
        screen === 'dispute-management' ||
        screen === 'escrow-mediation' ||
        screen === 'products'
      );
    }

    if (role === 'member') {
      return (
        screen === 'groups' ||
        screen === 'group-create' ||
        screen === 'group-detail' ||
        screen === 'group-discover' ||
        screen === 'products' ||
        screen === 'cart' ||
        screen === 'checkout' ||
        screen === 'tracking' ||
        screen === 'review' ||
        screen === 'escrow-checkout' ||
        screen === 'escrow-buyer-dashboard' ||
        screen === 'escrow-inspection' ||
        screen === 'escrow-dispute' ||
        screen === 'escrow-mediation'
      );
    }

    return false;
  };

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
    'profile-settings',
    'transaction-history',
    'dispute-management',
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
    'vendor-product-detail',
    'vendor-product-edit',
    'vendor-orders',
    'vendor-customers',
    'vendor-analytics',
    'admin-users',
    'admin-create-user',
  ]);

  // Restore persisted screen state when authenticated
  // Note: redux-persist handles persistence automatically, but we need to validate restored state
  useEffect(() => {
    if (isAuthenticated && !isLoading && !restorationComplete) {
      // Validate that restored screen is valid for authenticated users and their role
      if (currentScreen && authenticatedScreens.has(currentScreen) && isScreenAllowedForRole(currentScreen, user?.role)) {
        // Screen is valid, restoration already handled by redux-persist
        dispatch(setRestorationComplete(true));
      } else {
        // Invalid screen or unauthorized role, navigate to home
        dispatch(navigate({ screen: 'home' }));
        dispatch(setRestorationComplete(true));
      }
    } else if (!isAuthenticated && !isLoading && !restorationComplete) {
      // Not authenticated, allow normal auth flow
      dispatch(setRestorationComplete(true));
    }
  }, [dispatch, isAuthenticated, isLoading, restorationComplete, currentScreen, authenticatedScreens, user?.role]);

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

  const handleNavigate = (
    screen: Screen,
    groupId?: string,
    productId?: string | null
  ) => {
    // Guests: browse-only. Gated actions are remembered and routed to
    // login, then continued after auth. Neutral taps (home) fall back to
    // the landing page instead of forcing auth.
    if (!isAuthenticated && !guestScreens.has(screen)) {
      if (screen === 'home') {
        dispatch(clearPendingNavigation());
        dispatch(navigate({ screen: 'welcome' }));
        return;
      }
      dispatch(setPendingNavigation({ screen, groupId }));
      dispatch(navigate({ screen: 'login' }));
      return;
    }

    // Role protection: prevent navigating to unauthorized screens
    if (isAuthenticated && !isScreenAllowedForRole(screen, user?.role)) {
      dispatch(navigate({ screen: 'home' }));
      return;
    }

    // Redux-persist handles persistence automatically
    dispatch(navigate({ screen, groupId, productId }));
  };

  const handleNavigateToWelcome = () => {
    dispatch(clearPendingNavigation());
    dispatch(navigate({ screen: 'welcome' }));
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

  const handleBrowseProducts = () => {
    handleNavigate('products');
  };

  const handleBrowseGroups = () => {
    handleNavigate('group-discover');
  };

  // Restore pending navigation after a guest logs in / signs up so the
  // flow continues where they left off (e.g. they hit "Add to cart").
  useEffect(() => {
    if (isAuthenticated && pendingScreen && restorationComplete) {
      dispatch(navigate({ screen: pendingScreen, groupId: pendingGroupId || undefined }));
      dispatch(clearPendingNavigation());
    }
  }, [isAuthenticated, pendingScreen, pendingGroupId, restorationComplete, dispatch]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0047AB] to-[#6EE7B7] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const renderScreen = () => {
    // Guest / unauthenticated: welcome, login, signup, plus public browsing
    // of products and discoverable groups. Buying and joining stay gated.
    if (!isAuthenticated) {
      if (currentScreen === 'signup') {
        return (
          <Signup
            onNavigateToLogin={handleNavigateToLogin}
            onNavigateHome={handleNavigateToWelcome}
          />
        );
      }
      if (currentScreen === 'login') {
        return (
          <Login
            onNavigateToSignup={handleNavigateToSignup}
            onNavigateHome={handleNavigateToWelcome}
          />
        );
      }
      if (currentScreen === 'products') {
        return <ProductCatalog navigate={handleNavigate} groupId={selectedGroupId} />;
      }
      if (currentScreen === 'group-discover') {
        return <GroupDiscover navigate={handleNavigate} />;
      }
      return (
        <Welcome
          onGetStarted={handleGetStarted}
          onNavigateToLogin={handleNavigateToLogin}
          onNavigateToSignup={handleNavigateToSignup}
          onBrowseProducts={handleBrowseProducts}
          onBrowseGroups={handleBrowseGroups}
        />
      );
    }

    // Authenticated screens: check role permission
    if (!isScreenAllowedForRole(currentScreen, user?.role)) {
      return <Home navigate={handleNavigate} />;
    }

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
      case 'vendor-product-edit':
        return (
          <VendorAddProduct
            navigate={handleNavigate}
            productId={selectedProductId}
          />
        );
      case 'vendor-products':
        return <VendorProducts navigate={handleNavigate} />;
      case 'vendor-product-detail':
        return (
          <VendorProductDetail
            navigate={handleNavigate}
            productId={selectedProductId}
          />
        );
      case 'vendor-orders':
        return <VendorOrders navigate={handleNavigate} />;
      case 'vendor-customers':
        return <VendorCustomers navigate={handleNavigate} />;
      case 'vendor-analytics':
        return <VendorAnalytics vendorId={user?.vendor_id || undefined} />;
      case 'admin-users':
        return <UserManagement navigate={handleNavigate} />;
      case 'admin-create-user':
        return <CreateUser navigate={handleNavigate} />;
      case 'profile-settings':
        return <ProfileSettings navigate={handleNavigate} />;
      case 'transaction-history':
        return <TransactionHistory />;
      case 'dispute-management':
        return <DisputeManagement />;
      default:
        return <Home navigate={handleNavigate} />;
    }
  };

  const showBottomNav =
    (isAuthenticated ||
      currentScreen === 'products' ||
      currentScreen === 'group-discover') &&
    currentScreen !== 'welcome' &&
    currentScreen !== 'login' &&
    currentScreen !== 'signup';

  const isLandingPage =
    !isAuthenticated &&
    (currentScreen === 'welcome' || !currentScreen);

  return (
    <div className={`min-h-screen ${isLandingPage ? 'bg-slate-50' : 'bg-[#F4F4F5]'}`}>
      <div
        className={`${
          isLandingPage
            ? 'w-full min-h-screen'
            : `max-w-md lg:max-w-6xl mx-auto bg-white min-h-screen relative ${
                showBottomNav
                  ? `pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0 ${
                      sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'
                    }`
                  : 'pb-6'
              }`
        }`}
      >
        <ErrorBoundary
          resetKey={currentScreen}
          label={currentScreen}
          onGoHome={() => handleNavigate('home')}
        >
          {renderScreen()}
        </ErrorBoundary>
        {showBottomNav && (
          <BottomNav currentScreen={currentScreen} navigate={handleNavigate} />
        )}
      </div>
      <Toaster />
    </div>
  );
}

export default AppContent;
