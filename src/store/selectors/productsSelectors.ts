import type { RootState } from '../store';

export const selectProducts = (state: RootState) => state.products.products;
export const selectProductsLoading = (state: RootState) => state.products.loading;
export const selectProductsError = (state: RootState) => state.products.error;
export const selectProductsByVendor = (vendorId: number) => (state: RootState) =>
  state.products.products.filter((p) => p.vendor_id === vendorId);
export const selectCategories = (state: RootState) => state.products.categories;
export const selectProductFilter = (state: RootState) => state.products.filter;
