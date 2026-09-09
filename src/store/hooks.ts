import { useDispatch, useSelector } from 'react-redux';
import type { TypedUseSelectorHook } from 'react-redux';
import type { RootState, AppDispatch } from './store';

// Export pre-typed hooks for the whole app
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Groups-specific hooks
export const useGroups = () => {
  const dispatch = useAppDispatch();
  const { groups, currentGroup, selectedGroupId, loading, error } = useAppSelector((state) => state.groups);

  return {
    groups,
    currentGroup,
    selectedGroupId,
    loading,
    error,
    dispatch,
  };
};
