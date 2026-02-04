import type { RootState } from '../store';

export const selectVendors = (state: RootState) => state.vendors.vendors;
export const selectCurrentVendor = (state: RootState) => state.vendors.currentVendor;
export const selectDashboard = (state: RootState) => state.vendors.dashboard;
export const selectOrders = (state: RootState) => state.vendors.orders;
export const selectCustomers = (state: RootState) => state.vendors.customers;
export const selectVendorsLoading = (state: RootState) => state.vendors.loading;
export const selectVendorsError = (state: RootState) => state.vendors.error;
