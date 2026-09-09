import pool from '../config/database.js';
import crypto from 'crypto';

/**
 * Generate a unique join code
 */
const generateJoinCode = () => {
  return `GRP${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
};

// ============================================
// GROUP CONTROLLERS
// ============================================

/**
 * Create a new group
 * Creator automatically becomes admin
 */
export const createGroup = async (req, res) => {
  const client = await pool.connect();

  try {
    const userId = req.user.id;
    const { name, description, moq_target } = req.body;

    // Validate input
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Group name is required' });
    }
    if (!moq_target || moq_target < 1) {
      return res.status(400).json({ error: 'MOQ target must be at least 1' });
    }

    // Generate unique join code
    const join_code = generateJoinCode();

    // Start transaction
    await client.query('BEGIN');

    // Create group
    const groupResult = await client.query(
      `INSERT INTO groups (name, description, join_code, moq_target, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, description, join_code, moq_target, current_quantity, status, created_by, created_at`,
      [name, description || null, join_code, moq_target, userId],
    );

    const groupId = groupResult.rows[0].id;

    // Add creator as admin member
    await client.query(
      `INSERT INTO group_members (group_id, user_id, role, joined_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
      [groupId, userId, 'admin'],
    );

    // NOTE: Internal group chat is auto-created by database trigger (create_group_chat_trigger)
    // No need to manually create it here

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      data: groupResult.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create group error:', error);
    res.status(500).json({ error: 'Failed to create group' });
  } finally {
    client.release();
  }
};

/**
 * Get all groups for the current user
 */
export const getGroups = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT 
         g.id,
         g.name,
         g.description,
         g.join_code,
         g.moq_target,
         g.current_quantity,
         g.status,
         g.created_by,
         g.created_at,
         u.name as creator_name,
         u.avatar as creator_avatar,
         (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count,
         (SELECT role FROM group_members WHERE group_id = g.id AND user_id = $1) as user_role
       FROM groups g
       JOIN users u ON g.created_by = u.id
       JOIN group_members gm ON g.id = gm.group_id
       WHERE gm.user_id = $1
       ORDER BY g.created_at DESC`,
      [userId],
    );

    return res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
};

/**
 * Get a specific group with members
 */
export const getGroupById = async (req, res) => {
  try {
    const groupId = req.params.id;
    const userId = req.user.id;

    // Check if user is a member of the group
    const memberCheck = await pool.query(
      'SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, userId],
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You are not a member of this group' });
    }

    // Get group details
    const groupResult = await pool.query(
      `SELECT 
         g.id,
         g.name,
         g.description,
         g.join_code,
         g.moq_target,
         g.current_quantity,
         g.status,
         g.created_by,
         g.created_at,
         u.name as creator_name,
         u.avatar as creator_avatar,
         u.email as creator_email
       FROM groups g
       JOIN users u ON g.created_by = u.id
       WHERE g.id = $1`,
      [groupId],
    );

    if (groupResult.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Get members
    const membersResult = await pool.query(
      `SELECT 
         gm.id,
         gm.user_id,
         gm.role,
         gm.joined_at,
         u.name,
         u.email,
         u.avatar
       FROM group_members gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.group_id = $1
       ORDER BY gm.role DESC, gm.joined_at ASC`,
      [groupId],
    );

    const group = groupResult.rows[0];
    group.members = membersResult.rows;
    group.user_role = memberCheck.rows[0].role;

    return res.status(200).json({
      success: true,
      data: group,
    });
  } catch (error) {
    console.error('Get group by ID error:', error);
    res.status(500).json({ error: 'Failed to fetch group' });
  }
};

/**
 * Update group details
 * Only admin can update
 */
export const updateGroup = async (req, res) => {
  try {
    const groupId = req.params.id;
    const userId = req.user.id;
    const { name, description, moq_target, status } = req.body;

    // Check admin role
    const adminCheck = await pool.query(
      'SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, userId],
    );

    if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can update the group' });
    }

    // Validate input
    const updates = [];
    const params = [groupId];
    let paramCount = 2;

    if (name !== undefined && name.trim() !== '') {
      updates.push(`name = $${paramCount}`);
      params.push(name);
      paramCount++;
    }

    if (description !== undefined) {
      updates.push(`description = $${paramCount}`);
      params.push(description);
      paramCount++;
    }

    if (moq_target !== undefined && moq_target >= 1) {
      updates.push(`moq_target = $${paramCount}`);
      params.push(moq_target);
      paramCount++;
    }

    if (status !== undefined && ['active', 'pending', 'completed'].includes(status)) {
      updates.push(`status = $${paramCount}`);
      params.push(status);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const result = await pool.query(
      `UPDATE groups 
       SET ${updates.join(', ')}
       WHERE id = $1
       RETURNING id, name, description, join_code, moq_target, current_quantity, status, created_by, created_at`,
      params,
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    return res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Update group error:', error);
    res.status(500).json({ error: 'Failed to update group' });
  }
};

/**
 * Delete a group
 * Only admin can delete, and only if group is not in 'completed' status
 */
export const deleteGroup = async (req, res) => {
  const client = await pool.connect();

  try {
    const groupId = req.params.id;
    const userId = req.user.id;

    // Check admin role
    const adminCheck = await pool.query(
      'SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, userId],
    );

    if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can delete the group' });
    }

    // Check group status
    const groupCheck = await pool.query(
      'SELECT status FROM groups WHERE id = $1',
      [groupId],
    );

    if (groupCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    if (groupCheck.rows[0].status === 'completed') {
      return res.status(400).json({ error: 'Cannot delete a completed group' });
    }

    // Start transaction
    await client.query('BEGIN');

    // Delete related data
    await client.query('DELETE FROM group_members WHERE group_id = $1', [groupId]);

    // Delete conversations related to group
    await client.query(
      'DELETE FROM message_read_receipts WHERE message_id IN (SELECT id FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE group_id = $1))',
      [groupId],
    );
    await client.query(
      'DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE group_id = $1)',
      [groupId],
    );
    await client.query(
      'DELETE FROM conversation_participants WHERE conversation_id IN (SELECT id FROM conversations WHERE group_id = $1)',
      [groupId],
    );
    await client.query(
      'DELETE FROM conversations WHERE group_id = $1',
      [groupId],
    );

    // Delete the group
    await client.query('DELETE FROM groups WHERE id = $1', [groupId]);

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      message: 'Group deleted successfully',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Delete group error:', error);
    res.status(500).json({ error: 'Failed to delete group' });
  } finally {
    client.release();
  }
};

/**
 * Join a group using join code
 */
export const joinGroup = async (req, res) => {
  const client = await pool.connect();

  try {
    const userId = req.user.id;
    const { join_code } = req.body;

    if (!join_code || join_code.trim() === '') {
      return res.status(400).json({ error: 'Join code is required' });
    }

    // Find group by join code
    const groupResult = await pool.query(
      'SELECT id, name FROM groups WHERE join_code = $1',
      [join_code],
    );

    if (groupResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid join code' });
    }

    const groupId = groupResult.rows[0].id;
    const groupName = groupResult.rows[0].name;

    // Check if user is already a member
    const memberCheck = await pool.query(
      'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, userId],
    );

    if (memberCheck.rows.length > 0) {
      return res.status(400).json({ error: 'You are already a member of this group' });
    }

    await client.query('BEGIN');

    // Add user as member
    await client.query(
      `INSERT INTO group_members (group_id, user_id, role, joined_at)
       VALUES ($1, $2, 'member', CURRENT_TIMESTAMP)`,
      [groupId, userId],
    );

    // NOTE: User is auto-added to internal group chat by database trigger (add_member_to_group_chat)
    // No need to manually add them here

    await client.query('COMMIT');

    // Fetch updated group details
    const updatedGroup = await pool.query(
      `SELECT 
         g.id,
         g.name,
         g.description,
         g.join_code,
         g.moq_target,
         g.current_quantity,
         g.status,
         g.created_by,
         g.created_at,
         u.name as creator_name,
         (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count
       FROM groups g
       JOIN users u ON g.created_by = u.id
       WHERE g.id = $1`,
      [groupId],
    );

    return res.status(200).json({
      success: true,
      message: `Successfully joined data: ${groupName}`,
      data: updatedGroup.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Join group error:', error);
    res.status(500).json({ error: 'Failed to join group' });
  } finally {
    client.release();
  }
};

/**
 * Add a member to group
 * Only admin can add members
 */
export const addMember = async (req, res) => {
  const client = await pool.connect();

  try {
    const groupId = req.params.id;
    const userId = req.user.id;
    const { email } = req.body;

    if (!email || email.trim() === '') {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check admin role
    const adminCheck = await pool.query(
      'SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, userId],
    );

    if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can add members' });
    }

    // Find user by email
    const userResult = await pool.query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
      [email],
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const newMemberId = userResult.rows[0].id;

    // Check if user is already a member
    const memberCheck = await pool.query(
      'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, newMemberId],
    );

    if (memberCheck.rows.length > 0) {
      return res.status(400).json({ error: 'User is already a member of this group' });
    }

    await client.query('BEGIN');

    // Add user as member
    await client.query(
      `INSERT INTO group_members (group_id, user_id, role, joined_at)
       VALUES ($1, $2, 'member', CURRENT_TIMESTAMP)`,
      [groupId, newMemberId],
    );

    // NOTE: User is auto-added to internal group chat by database trigger (add_member_to_group_chat)
    // No need to manually add them here

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      message: 'Member added successfully',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Add member error:', error);
    res.status(500).json({ error: 'Failed to add member' });
  } finally {
    client.release();
  }
};

/**
 * Remove a member from group
 * Only admin can remove members
 */
export const removeMember = async (req, res) => {
  const client = await pool.connect();

  try {
    const groupId = req.params.id;
    const memberId = req.params.memberId;
    const userId = req.user.id;

    // Check admin role
    const adminCheck = await pool.query(
      'SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, userId],
    );

    if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can remove members' });
    }

    // Prevent removing the creator (if they're the last admin)
    const groupData = await pool.query(
      'SELECT created_by FROM groups WHERE id = $1',
      [groupId],
    );

    if (groupData.rows[0].created_by === memberId) {
      // Check if there are other admins
      const adminCount = await pool.query(
        'SELECT COUNT(*) as count FROM group_members WHERE group_id = $1 AND role = \'admin\'',
        [groupId],
      );

      if (parseInt(adminCount.rows[0].count) <= 1) {
        return res.status(400).json({ error: 'Cannot remove the last admin of the group' });
      }
    }

    await client.query('BEGIN');

    // Remove member
    await client.query(
      'DELETE FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, memberId],
    );

    // Remove from group conversations
    await client.query(
      `DELETE FROM conversation_participants 
       WHERE user_id = $1 AND conversation_id IN (
         SELECT id FROM conversations WHERE group_id = $2
       )`,
      [memberId, groupId],
    );

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      message: 'Member removed successfully',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Remove member error:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  } finally {
    client.release();
  }
};

/**
 * Update member role
 * Only admin can change roles
 */
export const updateMemberRole = async (req, res) => {
  try {
    const groupId = req.params.id;
    const memberId = req.params.memberId;
    const userId = req.user.id;
    const { role } = req.body;

    if (!['admin', 'member'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check admin role
    const adminCheck = await pool.query(
      'SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, userId],
    );

    if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can change member roles' });
    }

    // Check member exists
    const memberCheck = await pool.query(
      'SELECT id, role FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, memberId],
    );

    if (memberCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Prevent removing last admin
    if (memberCheck.rows[0].role === 'admin' && role === 'member') {
      const adminCount = await pool.query(
        'SELECT COUNT(*) as count FROM group_members WHERE group_id = $1 AND role = \'admin\'',
        [groupId],
      );

      if (parseInt(adminCount.rows[0].count) <= 1) {
        return res.status(400).json({ error: 'Cannot remove the last admin of the group' });
      }
    }

    // Update role
    const result = await pool.query(
      `UPDATE group_members 
       SET role = $1
       WHERE group_id = $2 AND user_id = $3
       RETURNING id, user_id, group_id, role, joined_at`,
      [role, groupId, memberId],
    );

    // If promoting to admin, update conversation participant role
    if (role === 'admin') {
      await pool.query(
        `UPDATE conversation_participants 
         SET role = 'admin'
         WHERE user_id = $1 AND conversation_id IN (
           SELECT id FROM conversations WHERE group_id = $2 AND type = 'group'
         )`,
        [memberId, groupId],
      );
    } else if (role === 'member') {
      // If demoting from admin, update conversation participant role
      await pool.query(
        `UPDATE conversation_participants 
         SET role = 'member'
         WHERE user_id = $1 AND conversation_id IN (
           SELECT id FROM conversations WHERE group_id = $2 AND type = 'group'
         )`,
        [memberId, groupId],
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Member role updated successfully',
      member: result.rows[0],
    });
  } catch (error) {
    console.error('Update member role error:', error);
    res.status(500).json({ error: 'Failed to update member role' });
  }
};

// ============================================
// DISCOVER GROUPS
// ============================================

/**
 * Discover groups the user is NOT a member of
 */
export const discoverGroups = async (req, res) => {
  try {
    // Guest-friendly: userId is optional for read-only discovery.
    // Guests see all active groups; members additionally get their
    // pending-request flag and have their own groups excluded.
    const userId = req.user ? req.user.id : null;
    const { search } = req.query;

    let query = `
      SELECT 
        g.id,
        g.name,
        g.description,
        g.moq_target,
        g.current_quantity,
        g.status,
        g.created_at,
        (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count,
        CASE WHEN $1::uuid IS NULL THEN false
          ELSE EXISTS(
            SELECT 1 FROM group_join_requests 
            WHERE group_id = g.id AND user_id = $1 AND status = 'pending'
          )
        END as has_pending_request
      FROM groups g
      WHERE g.status = 'active'
    `;

    const params = [userId];

    // Members: exclude groups they already belong to. Guests see all.
    if (userId) {
      query += ` AND g.id NOT IN (
        SELECT group_id FROM group_members WHERE user_id = $1
      )`;
    }

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      query += ` AND (g.name ILIKE $${params.length} OR g.description ILIKE $${params.length})`;
    }

    query += ' ORDER BY g.created_at DESC';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        moq_target: row.moq_target,
        current_quantity: row.current_quantity,
        status: row.status,
        created_at: row.created_at,
        member_count: parseInt(row.member_count) || 0,
        has_pending_request: row.has_pending_request,
      })),
    });
  } catch (error) {
    console.error('Discover groups error:', error);
    res.status(500).json({ error: 'Failed to discover groups' });
  }
};

// ============================================
// JOIN REQUESTS
// ============================================

/**
 * Create a join request for a group
 */
export const createJoinRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const groupId = req.params.id;
    const { message } = req.body;

    // Check group exists and is active
    const group = await pool.query(
      'SELECT id, name, status FROM groups WHERE id = $1',
      [groupId],
    );

    if (group.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    if (group.rows[0].status !== 'active') {
      return res.status(400).json({ error: 'Group is not accepting new members' });
    }

    // Check if already a member
    const memberCheck = await pool.query(
      'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, userId],
    );

    if (memberCheck.rows.length > 0) {
      return res.status(400).json({ error: 'You are already a member of this group' });
    }

    // Check for existing pending request
    const existingRequest = await pool.query(
      "SELECT id FROM group_join_requests WHERE group_id = $1 AND user_id = $2 AND status = 'pending'",
      [groupId, userId],
    );

    if (existingRequest.rows.length > 0) {
      return res.status(400).json({ error: 'You already have a pending request for this group' });
    }

    const result = await pool.query(
      `INSERT INTO group_join_requests (group_id, user_id, message)
       VALUES ($1, $2, $3)
       RETURNING id, group_id, user_id, message, status, created_at`,
      [groupId, userId, message || ''],
    );

    res.status(201).json({
      success: true,
      message: 'Join request sent successfully',
      data: result.rows[0],
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'You already have a request for this group' });
    }
    console.error('Create join request error:', error);
    res.status(500).json({ error: 'Failed to create join request' });
  }
};

/**
 * Get join requests for a group (admin only)
 */
export const getJoinRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const groupId = req.params.id;
    const { status } = req.query;

    // Check admin role
    const adminCheck = await pool.query(
      'SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, userId],
    );

    if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can view join requests' });
    }

    let query = `
      SELECT 
        jr.id,
        jr.group_id,
        jr.user_id,
        jr.message,
        jr.status,
        jr.created_at,
        jr.updated_at,
        u.name as user_name,
        u.email as user_email,
        u.avatar as user_avatar
      FROM group_join_requests jr
      JOIN users u ON jr.user_id = u.id
      WHERE jr.group_id = $1
    `;

    const params = [groupId];

    if (status) {
      params.push(status);
      query += ` AND jr.status = $${params.length}`;
    }

    query += ' ORDER BY jr.created_at DESC';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get join requests error:', error);
    res.status(500).json({ error: 'Failed to fetch join requests' });
  }
};

/**
 * Review (approve/reject) a join request
 */
export const reviewJoinRequest = async (req, res) => {
  const client = await pool.connect();

  try {
    const userId = req.user.id;
    const groupId = req.params.id;
    const requestId = req.params.requestId;
    const { action } = req.body;

    if (!['approved', 'rejected'].includes(action)) {
      return res.status(400).json({ error: 'Action must be "approved" or "rejected"' });
    }

    // Check admin role
    const adminCheck = await pool.query(
      'SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, userId],
    );

    if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can review join requests' });
    }

    // Fetch the request
    const request = await pool.query(
      "SELECT * FROM group_join_requests WHERE id = $1 AND group_id = $2 AND status = 'pending'",
      [requestId, groupId],
    );

    if (request.rows.length === 0) {
      return res.status(404).json({ error: 'Join request not found or already reviewed' });
    }

    const joinRequest = request.rows[0];

    await client.query('BEGIN');

    // Update request status
    await client.query(
      `UPDATE group_join_requests 
       SET status = $1, reviewed_by = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [action, userId, requestId],
    );

    // If approved, add user to group
    if (action === 'approved') {
      await client.query(
        `INSERT INTO group_members (group_id, user_id, role, joined_at)
         VALUES ($1, $2, 'member', CURRENT_TIMESTAMP)`,
        [groupId, joinRequest.user_id],
      );
      // NOTE: Database trigger auto-adds user to internal group chat
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: action === 'approved' ? 'Request approved — user added to group' : 'Request rejected',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Review join request error:', error);
    res.status(500).json({ error: 'Failed to review join request' });
  } finally {
    client.release();
  }
};
