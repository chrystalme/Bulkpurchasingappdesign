import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type {
  Group,
  CreateGroupPayload,
  UpdateGroupPayload,
  AddMemberPayload,
  UpdateMemberRolePayload,
  JoinGroupPayload,
  DiscoverableGroup,
  JoinRequest,
} from '../../lib/types';
import { apiClient } from '../../lib/api';

interface GroupsState {
  groups: Group[];
  currentGroup: Group | null;
  selectedGroupId: string | null;
  discoverableGroups: DiscoverableGroup[];
  joinRequests: JoinRequest[];
  loading: boolean;
  error: string | null;
}

const initialState: GroupsState = {
  groups: [],
  currentGroup: null,
  selectedGroupId: null,
  discoverableGroups: [],
  joinRequests: [],
  loading: false,
  error: null,
};

// Thunks
export const fetchGroups = createAsyncThunk(
  'groups/fetchGroups',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.groups.getAll();
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to fetch groups.');
      }
      return response.data;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  },
);

export const fetchGroupById = createAsyncThunk(
  'groups/fetchGroupById',
  async (groupId: string, { rejectWithValue }) => {
    try {
      const response = await apiClient.groups.getById(groupId);
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to fetch group.');
      }
      return response.data;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  },
);

export const createGroup = createAsyncThunk(
  'groups/createGroup',
  async (groupData: CreateGroupPayload, { rejectWithValue }) => {
    try {
      const response = await apiClient.groups.create(groupData);
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to create group.');
      }
      return response.data;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  },
);

export const updateGroup = createAsyncThunk(
  'groups/updateGroup',
  async (
    { groupId, groupData }: { groupId: string; groupData: UpdateGroupPayload },
    { rejectWithValue },
  ) => {
    try {
      const response = await apiClient.groups.update(groupId, groupData);
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to update group.');
      }
      return response.data;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  },
);

export const deleteGroup = createAsyncThunk(
  'groups/deleteGroup',
  async (groupId: string, { rejectWithValue }) => {
    try {
      const response = await apiClient.groups.delete(groupId);
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to delete group.');
      }
      return groupId;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  },
);

export const joinGroup = createAsyncThunk(
  'groups/joinGroup',
  async (joinData: JoinGroupPayload, { rejectWithValue }) => {
    try {
      const response = await apiClient.groups.join(joinData);
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to join group.');
      }
      return response.data;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  },
);

export const addMember = createAsyncThunk(
  'groups/addMember',
  async (
    { groupId, memberData }: { groupId: string; memberData: AddMemberPayload },
    { rejectWithValue },
  ) => {
    try {
      const addMemberResponse = await apiClient.groups.addMember(groupId, memberData);
      if (!addMemberResponse.success) {
        return rejectWithValue(addMemberResponse.error || 'Failed to add member.');
      }
      // Fetch updated group to get new member list
      const response = await apiClient.groups.getById(groupId);
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to fetch updated group after adding member.');
      }
      return response.data;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  },
);

export const removeMember = createAsyncThunk(
  'groups/removeMember',
  async (
    { groupId, memberId }: { groupId: string; memberId: string },
    { rejectWithValue },
  ) => {
    try {
      const removeMemberResponse = await apiClient.groups.removeMember(groupId, memberId);
      if (!removeMemberResponse.success) {
        return rejectWithValue(removeMemberResponse.error || 'Failed to remove member.');
      }
      // Fetch updated group to get new member list
      const response = await apiClient.groups.getById(groupId);
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to fetch updated group after removing member.');
      }
      return response.data;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  },
);

export const updateMemberRole = createAsyncThunk(
  'groups/updateMemberRole',
  async (
    {
      groupId,
      memberId,
      roleData,
    }: { groupId: string; memberId: string; roleData: UpdateMemberRolePayload },
    { rejectWithValue },
  ) => {
    try {
      const updateMemberRoleResponse = await apiClient.groups.updateMemberRole(groupId, memberId, roleData);
      if (!updateMemberRoleResponse.success) {
        return rejectWithValue(updateMemberRoleResponse.error || 'Failed to update member role.');
      }
      // Fetch updated group to get updated member roles
      const response = await apiClient.groups.getById(groupId);
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to fetch updated group after updating member role.');
      }
      return response.data;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  },
);

export const discoverGroups = createAsyncThunk(
  'groups/discoverGroups',
  async (search: string | undefined, { rejectWithValue }) => {
    try {
      const response = await apiClient.groups.discover(search);
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to discover groups.');
      }
      return response.data!;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  },
);

export const requestToJoin = createAsyncThunk(
  'groups/requestToJoin',
  async (
    { groupId, message }: { groupId: string; message?: string },
    { rejectWithValue },
  ) => {
    try {
      const response = await apiClient.groups.createJoinRequest(groupId, message);
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to send join request.');
      }
      return { groupId, data: response.data! };
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  },
);

export const fetchJoinRequests = createAsyncThunk(
  'groups/fetchJoinRequests',
  async (
    { groupId, status }: { groupId: string; status?: string },
    { rejectWithValue },
  ) => {
    try {
      const response = await apiClient.groups.getJoinRequests(groupId, status);
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to fetch join requests.');
      }
      return response.data!;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  },
);

export const reviewJoinRequest = createAsyncThunk(
  'groups/reviewJoinRequest',
  async (
    { groupId, requestId, action }: { groupId: string; requestId: string; action: 'approved' | 'rejected' },
    { rejectWithValue },
  ) => {
    try {
      const response = await apiClient.groups.reviewJoinRequest(groupId, requestId, action);
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to review join request.');
      }
      return { requestId, action };
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  },
);

// Slice
const groupsSlice = createSlice({
  name: 'groups',
  initialState,
  reducers: {
    setSelectedGroupId: (state, action) => {
      state.selectedGroupId = action.payload;
    },
    clearCurrentGroup: state => {
      state.currentGroup = null;
      state.selectedGroupId = null;
    },
    clearError: state => {
      state.error = null;
    },
  },
  extraReducers: builder => {
    // Fetch Groups
    builder
      .addCase(fetchGroups.pending, state => {
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
      .addCase(fetchGroupById.pending, state => {
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
      .addCase(createGroup.pending, state => {
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
      .addCase(updateGroup.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateGroup.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.groups.findIndex(g => g.id === action.payload.id);
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
      .addCase(deleteGroup.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteGroup.fulfilled, (state, action) => {
        state.loading = false;
        state.groups = state.groups.filter(g => g.id !== action.payload);
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
      .addCase(joinGroup.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(joinGroup.fulfilled, (state, action) => {
        state.loading = false;
        // Add to groups list if not already there
        const existingIndex = state.groups.findIndex(
          g => g.id === action.payload.id,
        );
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
      .addCase(addMember.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addMember.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.groups.findIndex(g => g.id === action.payload.id);
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
      .addCase(removeMember.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeMember.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.groups.findIndex(g => g.id === action.payload.id);
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
      .addCase(updateMemberRole.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateMemberRole.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.groups.findIndex(g => g.id === action.payload.id);
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

    // Discover Groups
    builder
      .addCase(discoverGroups.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(discoverGroups.fulfilled, (state, action) => {
        state.loading = false;
        state.discoverableGroups = action.payload;
      })
      .addCase(discoverGroups.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Request to Join
    builder
      .addCase(requestToJoin.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(requestToJoin.fulfilled, (state, action) => {
        state.loading = false;
        const group = state.discoverableGroups.find(g => g.id === action.payload.groupId);
        if (group) {
          group.has_pending_request = true;
        }
      })
      .addCase(requestToJoin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch Join Requests
    builder
      .addCase(fetchJoinRequests.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchJoinRequests.fulfilled, (state, action) => {
        state.loading = false;
        state.joinRequests = action.payload;
      })
      .addCase(fetchJoinRequests.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Review Join Request
    builder
      .addCase(reviewJoinRequest.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(reviewJoinRequest.fulfilled, (state, action) => {
        state.loading = false;
        const { requestId, action: reviewAction } = action.payload;
        const request = state.joinRequests.find(r => r.id === requestId);
        if (request) {
          request.status = reviewAction;
        }
      })
      .addCase(reviewJoinRequest.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setSelectedGroupId, clearCurrentGroup, clearError } =
  groupsSlice.actions;
export default groupsSlice.reducer;
