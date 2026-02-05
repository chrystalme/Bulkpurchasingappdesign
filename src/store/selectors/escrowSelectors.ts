import type { RootState } from '../store';

export const selectTransactions = (state: RootState) => state.escrow.transactions;
export const selectTransactionById = (id: number) => (state: RootState) =>
  state.escrow.transactions.find((t) => t.id === id);
export const selectCurrentTransaction = (state: RootState) => state.escrow.currentTransaction;
export const selectEscrowLoading = (state: RootState) => state.escrow.loading;
export const selectTransactionsLoading = (state: RootState) => state.escrow.loading;
export const selectEscrowError = (state: RootState) => state.escrow.error;
export const selectEscrowFilter = (state: RootState) => state.escrow.filter;
