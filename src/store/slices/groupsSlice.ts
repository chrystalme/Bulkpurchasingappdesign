import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { Group, CreateGroupPayload, UpdateGroupPayload, AddMemberPayload, UpdateMemberRolePayload, JoinGroupPayload } from '../../lib/types';
import { apiClient } from '../../lib/api';

interface GroupsState {
  groups: Group[];
  currentGroup: Group | null;
  selectedGroupId: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: GroupsState = {
  groups: [],
  currentGroup: null,
  selectedGroupId: null,
  loading: false,
  error: null,
};

// Thunks
export const fetchGroups = createAsyncThunk(
  'groups/fetchGroups',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.groups.getAll();
      return response.data;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const fetchGroupById = createAsyncThunk(
  'groups/fetchGroupById',
  async (groupId: string, { rejectWithValue }) => {
    try {
      const response = await apiClient.groups.getById(groupId);
      return response.data;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const createGroup = createAsyncThunk(
  'groups/createGroup',
  async (groupData: CreateGroupPayload, { rejectWithValue }) => {
    try {
      const response = await apiClient.groups.create(groupData);
      return response.data;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const updateGroup = createAsyncThunk(
  'groups/updateGroup',
  async ({ groupId, groupData }: { groupId: string; groupData: UpdateGroupPayload }, { rejectWithValue }) => {
    try {
      const response = await apiClient.groups.update(groupId, groupData);
      return response.data;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const deleteGroup = createAsyncThunk(
  'groups/deleteGroup',
  async (groupId: string, { rejectWithValue }) => {
    try {
      await apiClient.groups.delete(groupId);
      return groupId;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const joinGroup = createAsyncThunk(
  'groups/joinGroup',
  async (joinData: JoinGroupPayload, { rejectWithValue }) => {
    try {
      const response = await apiClient.groups.join(joinData);
      return response.data;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const addMember = createAsyncThunk(
  'groups/addMember',
  async ({ groupId, memberData }: { groupId: string; memberData: AddMemberPayload }, { rejectWithValue }) => {
    try {
      await apiClient.groups.addMember(groupId, memberData);
      // Fetch updated group to get new member list
      const response = await apiClient.groups.getById(groupId);
      return response.data;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const removeMember = createAsyncThunk(
  'groups/removeMember',
  async ({ groupId, memberId }: { groupId: string; memberId: string }, { rejectWithValue }) => {
    try {
      await apiClient.groups.removeMember(groupId, memberId);
      // Fetch updated group to get new member list
      const response = await apiClient.groups.getById(groupId);
      return response.data;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const updateMemberRole = createAsyncThunk(
  'groups/updateMemberRole',
  async ({ groupId, memberId, roleData }: { groupId: string; memberId: string; roleData: UpdateMemberRolePayload }, { rejectWithValue }) => {
    try {
      await apiClient.groups.updateMemberRole(groupId, memberId, roleData);
      // Fetch updated group to get updated member roles
      const response = await apiClient.groups.getById(groupId);
      return response.data;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

// Slice
const groupsSlice = createSlice({
  name: 'groups',
  initialState,
  reducers: {
    setSelectedGroupId: (state, action) => {
      state.selectedGroupId = action.payload;
    },
    clearCurrentGroup: (state) => {
      state.currentGroup = null;
      state.selectedGroupId = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Groups
    builder
      .addCase(fetchGroups.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchGroups.fulfilled, (state, action) => {
        state.loading = false;
        state.groups = action.payload;
      })
      .addCase(fetchGroups.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch Group By ID
    builder
      .addCase(fetchGroupById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchGroupById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentGroup = action.payload;
      })
      .addCase(fetchGroupById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Create Group
    builder
      .addCase(createGroup.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createGroup.fulfilled, (state, action) => {
        state.loading = false;
        state.groups.push(action.payload);
        state.currentGroup = action.payload;
        state.selectedGroupId = action.payload.id;
      })
      .addCase(createGroup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Update Group
    builder
      .addCase(updateGroup.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateGroup.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.groups.findIndex((g) => g.id === action.payload.id);
        if (index !== -1) {
          state.groups[index] = action.payload;
        }
        if (state.currentGroup?.id === action.payload.id) {
          state.currentGroup = action.payload;
        }
      })
      .addCase(updateGroup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Delete Group
    builder
      .addCase(deleteGroup.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteGroup.fulfilled, (state, action) => {
        state.loading = false;
        state.groups = state.groups.filter((g) => g.id !== action.payload);
        if (state.currentGroup?.id === action.payload) {
          state.currentGroup = null;
          state.selectedGroupId = null;
        }
      })
      .addCase(deleteGroup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Join Group
    builder
      .addCase(joinGroup.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(joinGroup.fulfilled, (state, action) => {
        state.loading = false;
        // Add to groups list if not already there
        const existingIndex = state.groups.findIndex((g) => g.id === action.payload.id);
        if (existingIndex === -1) {
          state.groups.push(action.payload);
        }
        state.currentGroup = action.payload;
        state.selectedGroupId = action.payload.id;
      })
      .addCase(joinGroup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Add Member
    builder
      .addCase(addMember.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addMember.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.groups.findIndex((g) => g.id === action.payload.id);
        if (index !== -1) {
          state.groups[index] = action.payload;
        }
        if (state.currentGroup?.id === action.payload.id) {
          state.currentGroup = action.payload;
        }
      })
      .addCase(addMember.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Remove Member
    builder
      .addCase(removeMember.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeMember.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.groups.findIndex((g) => g.id === action.payload.id);
        if (index !== -1) {
          state.groups[index] = action.payload;
        }
        if (state.currentGroup?.id === action.payload.id) {
          state.currentGroup = action.payload;
        }
      })
      .addCase(removeMember.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Update Member Role
    builder
      .addCase(updateMemberRole.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateMemberRole.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.groups.findIndex((g) => g.id === action.payload.id);
        if (index !== -1) {
          state.groups[index] = action.payload;
        }
        if (state.currentGroup?.id === action.payload.id) {
          state.currentGroup = action.payload;
        }
      })
      .addCase(updateMemberRole.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setSelectedGroupId, clearCurrentGroup, clearError } = groupsSlice.actions;
export default groupsSlice.reducer;
