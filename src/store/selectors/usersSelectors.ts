import type { RootState } from '../store';

export const selectUsers = (state: RootState) => state.users.users;
export const selectUserStats = (state: RootState) => state.users.stats;
export const selectUsersLoading = (state: RootState) => state.users.loading;
export const selectUsersError = (state: RootState) => state.users.error;
export const selectUsersSaving = (state: RootState) => state.users.saving;
