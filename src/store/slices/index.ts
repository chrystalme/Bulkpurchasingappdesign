// Export all slice reducers
export { default as groupsReducer } from './groupsSlice';
export { default as productsReducer } from './productsSlice';
export { default as vendorsReducer } from './vendorsSlice';
export { default as ordersReducer } from './ordersSlice';
export { default as escrowReducer } from './escrowSlice';
export { default as usersReducer } from './usersSlice';
export { default as chatReducer } from './chatSlice';

// Export all thunks
export {
  fetchGroups,
  fetchGroupById,
  createGroup,
  updateGroup,
  deleteGroup,
  joinGroup,
  addMember,
  removeMember,
  updateMemberRole,
  clearCurrentGroup,
} from './groupsSlice';

export {
  fetchProducts,
  fetchProductById,
  fetchCategories,
  setFilter,
  clearProducts,
} from './productsSlice';

export {
  fetchVendors,
  fetchVendorById,
  fetchVendorDashboard,
  fetchVendorOrders,
  fetchVendorCustomers,
  setCurrentVendor,
  clearVendor,
} from './vendorsSlice';

export {
  fetchOrders,
  fetchOrderById,
  createOrder,
  updateOrderStatus,
  setCurrentOrder,
  clearOrders,
} from './ordersSlice';

export {
  fetchTransactions,
  fetchTransactionById,
  createEscrowTransaction,
  updateTransactionStatus,
  setFilter as setEscrowFilter,
  setCurrentTransaction,
  clearTransactions,
} from './escrowSlice';

export {
  fetchUsers,
  fetchUserStats,
  createUser,
  updateUser,
  deleteUser,
  setUserActive,
  clearUsers,
} from './usersSlice';

export {
  fetchConversations,
  fetchMessages,
  fetchParticipants,
  sendMessage,
  messageReceived,
  typingStatusChanged,
  userOnlineStatusChanged,
  messageDeleted,
  conversationRead,
  selectConversation,
  addOptimisticMessage,
  removeOptimisticMessage,
  clearChat,
} from './chatSlice';

export {
  bootstrapAuth,
  login,
  signup,
  logout,
  updateCurrentUser,
  setAccessToken,
  clearError,
} from './authSlice';

export {
  navigate,
  setSelectedGroupId,
  setRestorationComplete,
  setPendingNavigation,
  clearPendingNavigation,
  toggleSidebar,
  setSidebarCollapsed,
  restoreFromPersistedState,
} from './navigationSlice';

export {
  setCartGroup,
  addItem,
  removeItem,
  updateQuantity,
  updateAllocation,
  clearCart,
} from './cartSlice';
