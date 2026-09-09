export interface GroupMember {
  id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  name: string;
  email: string;
  avatar: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  join_code: string;
  moq_target: number;
  current_quantity: number;
  status: 'active' | 'pending' | 'completed';
  created_by: string;
  created_at: string;
  creator_name?: string;
  creator_avatar?: string;
  creator_email?: string;
  members?: GroupMember[];
  member_count?: number | string;
  user_role?: 'admin' | 'member';
}

// Request types
export interface CreateGroupPayload {
  name: string;
  description?: string;
  moq_target: number;
}

export interface UpdateGroupPayload {
  name?: string;
  description?: string;
  moq_target?: number;
  status?: 'active' | 'pending' | 'completed';
}

export interface AddMemberPayload {
  email: string;
}

export interface UpdateMemberRolePayload {
  role: 'admin' | 'member';
}

export interface JoinGroupPayload {
  join_code: string;
}

export interface DiscoverableGroup {
  id: string;
  name: string;
  description: string;
  moq_target: number;
  current_quantity: number;
  status: string;
  created_at: string;
  member_count: number;
  has_pending_request: boolean;
}

export interface JoinRequest {
  id: string;
  group_id: string;
  user_id: string;
  message: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string;
  created_at: string;
  updated_at: string;
  user_name: string;
  user_email: string;
  user_avatar?: string;
}