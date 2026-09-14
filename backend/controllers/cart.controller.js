import pool from '../config/database.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_PG_INT = 2147483647;
const MIN_PG_INT = -2147483648;

/**
 * Validate UUID format to prevent PostgreSQL 22P02 syntax errors.
 */
export function isValidUUID(val) {
  return typeof val === 'string' && UUID_REGEX.test(val.trim());
}

/**
 * Validates integer inputs and protects against NaN, floats, and 32-bit overflow.
 */
export function parseSafeInt(val, { min = MIN_PG_INT, max = MAX_PG_INT } = {}) {
  if (val === undefined || val === null || typeof val === 'boolean') {
    return { valid: false };
  }
  if (typeof val === 'number') {
    if (!Number.isInteger(val)) return { valid: false };
    if (val < min || val > max) return { valid: false };
    return { valid: true, value: val };
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!/^-?\d+$/.test(trimmed)) return { valid: false };
    const num = Number(trimmed);
    if (!Number.isSafeInteger(num) || num < min || num > max) return { valid: false };
    return { valid: true, value: num };
  }
  return { valid: false };
}

/**
 * Helper to fetch complete group cart items with member allocations.
 * Formats data matching CartItemData interface.
 */
export async function getCartData(groupId, customPool = pool) {
  const query = `
    SELECT 
      gci.id,
      gci.product_id AS "productId",
      gci.quantity,
      COALESCE(
        json_agg(
          json_build_object(
            'id', gca.id,
            'memberId', gca.user_id,
            'memberName', u.name,
            'memberAvatar', u.avatar,
            'quantity', gca.quantity,
            'paid', gca.paid
          ) ORDER BY gca.created_at ASC
        ) FILTER (WHERE gca.id IS NOT NULL AND gm.id IS NOT NULL),
        '[]'
      ) AS allocations
    FROM group_cart_items gci
    LEFT JOIN group_cart_allocations gca ON gci.id = gca.cart_item_id
    LEFT JOIN group_members gm ON gm.group_id = gci.group_id AND gm.user_id = gca.user_id
    LEFT JOIN users u ON gca.user_id = u.id
    WHERE gci.group_id = $1
    GROUP BY gci.id, gci.product_id, gci.quantity, gci.created_at
    ORDER BY gci.created_at ASC, gci.id ASC;
  `;

  const result = await customPool.query(query, [groupId]);
  return result.rows.map(row => {
    let rawAllocations = row.allocations;
    if (typeof rawAllocations === 'string') {
      try {
        rawAllocations = JSON.parse(rawAllocations);
      } catch (e) {
        rawAllocations = [];
      }
    }
    return {
      id: row.id,
      productId: row.productId,
      quantity: parseInt(row.quantity, 10),
      allocations: Array.isArray(rawAllocations)
        ? rawAllocations.map(a => ({
            ...a,
            quantity: parseInt(a.quantity, 10),
            paid: Boolean(a.paid),
          }))
        : [],
    };
  });
}

/**
 * Verify if a user is an active member of a group.
 */
export async function checkGroupMembership(groupId, userId, customPool = pool) {
  const result = await customPool.query(
    'SELECT id, role FROM group_members WHERE group_id = $1 AND user_id = $2',
    [groupId, userId]
  );
  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Helper to broadcast cart updates via Socket.IO
 */
function broadcastCartUpdated(req, groupId, items) {
  const io = req.app?.get('io');
  if (io) {
    io.to(`cart:${groupId}`).emit('cart-updated', {
      groupId,
      items,
      updatedBy: req.user?.id,
    });
  }
}

/**
 * Helper to broadcast cart cleared via Socket.IO
 */
function broadcastCartCleared(req, groupId) {
  const io = req.app?.get('io');
  if (io) {
    io.to(`cart:${groupId}`).emit('cart-cleared', {
      groupId,
      clearedBy: req.user?.id,
    });
  }
}

/**
 * GET /api/groups/:groupId/cart
 * Fetch group cart items with allocations
 */
export const getGroupCart = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    if (!isValidUUID(groupId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid group ID format',
      });
    }

    const membership = await checkGroupMembership(groupId, userId);
    if (!membership) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: You are not a member of this group',
      });
    }

    const items = await getCartData(groupId, pool);

    return res.json({
      success: true,
      data: {
        groupId,
        items,
      },
    });
  } catch (error) {
    console.error('Error fetching group cart:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch group cart',
    });
  }
};

/**
 * POST /api/groups/:groupId/cart/items
 * Add or upsert product into group_cart_items and add/increment allocation
 */
export const addToGroupCart = async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.id;
  const { productId, quantity = 1, memberId } = req.body;

  if (!isValidUUID(groupId)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid group ID format',
    });
  }

  if (!productId || !isValidUUID(productId)) {
    return res.status(400).json({
      success: false,
      error: 'Valid product ID is required',
    });
  }

  const parsedQty = parseSafeInt(quantity, { min: 1, max: MAX_PG_INT });
  if (!parsedQty.valid) {
    return res.status(400).json({
      success: false,
      error: 'Quantity must be a positive integer within valid range (1 to 2147483647)',
    });
  }
  const addQty = parsedQty.value;

  if (memberId !== undefined && !isValidUUID(memberId)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid member ID format: must be a valid UUID',
    });
  }

  const membership = await checkGroupMembership(groupId, userId);
  if (!membership) {
    return res.status(403).json({
      success: false,
      error: 'Access denied: You are not a member of this group',
    });
  }

  // Verify product exists
  const productCheck = await pool.query('SELECT id FROM products WHERE id = $1', [productId]);
  if (productCheck.rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Product not found',
    });
  }

  const targetMemberId = memberId || userId;
  if (targetMemberId !== userId) {
    const targetMembership = await checkGroupMembership(groupId, targetMemberId);
    if (!targetMembership) {
      return res.status(400).json({
        success: false,
        error: 'Specified member is not in this group',
      });
    }
  }

  const client = await pool.connect();
  let inTransaction = false;
  try {
    await client.query('BEGIN');
    inTransaction = true;

    // Guard against 32-bit integer overflow on existing item
    const existingItemCheck = await client.query(
      'SELECT quantity FROM group_cart_items WHERE group_id = $1 AND product_id = $2 FOR UPDATE',
      [groupId, productId]
    );
    if (existingItemCheck.rows.length > 0) {
      const currentQty = parseInt(existingItemCheck.rows[0].quantity, 10);
      if (currentQty + addQty > MAX_PG_INT) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: 'Resulting quantity exceeds 32-bit integer limit',
        });
      }
    }

    // Upsert into group_cart_items
    const upsertItemQuery = `
      INSERT INTO group_cart_items (group_id, product_id, quantity)
      VALUES ($1, $2, $3)
      ON CONFLICT (group_id, product_id)
      DO UPDATE SET 
        quantity = group_cart_items.quantity + EXCLUDED.quantity,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, quantity;
    `;
    const itemResult = await client.query(upsertItemQuery, [groupId, productId, addQty]);
    const cartItemId = itemResult.rows[0].id;

    // Upsert into group_cart_allocations
    const upsertAllocQuery = `
      INSERT INTO group_cart_allocations (cart_item_id, user_id, quantity, paid)
      VALUES ($1, $2, $3, false)
      ON CONFLICT (cart_item_id, user_id)
      DO UPDATE SET 
        quantity = group_cart_allocations.quantity + EXCLUDED.quantity,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, quantity;
    `;
    await client.query(upsertAllocQuery, [cartItemId, targetMemberId, addQty]);

    await client.query('COMMIT');
    inTransaction = false;

    const items = await getCartData(groupId, pool);
    broadcastCartUpdated(req, groupId, items);

    return res.status(201).json({
      success: true,
      data: {
        groupId,
        items,
      },
    });
  } catch (error) {
    if (inTransaction) {
      try {
        await client.query('ROLLBACK');
      } catch (rbErr) {
        console.error('Rollback error:', rbErr);
      }
    }
    console.error('Error adding item to group cart:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to add item to group cart',
    });
  } finally {
    client.release();
  }
};

/**
 * PATCH /api/groups/:groupId/cart/items/:productId
 * Update item total quantity
 */
export const updateCartItemQuantity = async (req, res) => {
  const { groupId, productId } = req.params;
  const userId = req.user.id;
  const { delta, quantity } = req.body;

  if (!isValidUUID(groupId)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid group ID format',
    });
  }

  if (!isValidUUID(productId)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid product ID format',
    });
  }

  let parsedQuantityVal;
  let parsedDeltaVal;

  if (quantity !== undefined) {
    const parsed = parseSafeInt(quantity, { min: 1, max: MAX_PG_INT });
    if (!parsed.valid) {
      return res.status(400).json({
        success: false,
        error: 'Quantity must be a positive integer within valid range (1 to 2147483647)',
      });
    }
    parsedQuantityVal = parsed.value;
  }

  if (delta !== undefined) {
    const parsed = parseSafeInt(delta, { min: -MAX_PG_INT, max: MAX_PG_INT });
    if (!parsed.valid) {
      return res.status(400).json({
        success: false,
        error: 'Delta must be a valid integer within valid range (-2147483647 to 2147483647)',
      });
    }
    parsedDeltaVal = parsed.value;
  }

  if (parsedQuantityVal === undefined && parsedDeltaVal === undefined) {
    return res.status(400).json({
      success: false,
      error: 'Either quantity or delta must be specified',
    });
  }

  const membership = await checkGroupMembership(groupId, userId);
  if (!membership) {
    return res.status(403).json({
      success: false,
      error: 'Access denied: You are not a member of this group',
    });
  }

  const client = await pool.connect();
  let inTransaction = false;
  try {
    await client.query('BEGIN');
    inTransaction = true;

    // Lock cart item with FOR UPDATE
    const itemCheck = await client.query(
      `SELECT id, quantity 
       FROM group_cart_items 
       WHERE group_id = $1 AND product_id = $2 
       FOR UPDATE`,
      [groupId, productId]
    );

    if (itemCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Item not found in cart',
      });
    }

    const cartItemId = itemCheck.rows[0].id;

    // Lock caller allocation with FOR UPDATE
    const userAllocCheck = await client.query(
      `SELECT id, quantity 
       FROM group_cart_allocations 
       WHERE cart_item_id = $1 AND user_id = $2 
       FOR UPDATE`,
      [cartItemId, userId]
    );
    const currentUserAllocQty = userAllocCheck.rows.length > 0 ? parseInt(userAllocCheck.rows[0].quantity, 10) : 0;

    // Calculate sum of other active members' allocations (excluding non-members)
    const otherAllocRes = await client.query(
      `SELECT COALESCE(SUM(gca.quantity), 0)::integer AS sum_others 
       FROM group_cart_allocations gca
       JOIN group_cart_items gci ON gca.cart_item_id = gci.id
       JOIN group_members gm ON gm.group_id = gci.group_id AND gm.user_id = gca.user_id
       WHERE gca.cart_item_id = $1 AND gca.user_id != $2`,
      [cartItemId, userId]
    );
    const sumOthers = parseInt(otherAllocRes.rows[0].sum_others, 10);

    let newUserAllocQty;
    if (parsedQuantityVal !== undefined) {
      newUserAllocQty = Math.max(0, parsedQuantityVal - sumOthers);
    } else {
      const targetAlloc = currentUserAllocQty + parsedDeltaVal;
      if (targetAlloc > MAX_PG_INT || (sumOthers + targetAlloc) > MAX_PG_INT) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: 'Resulting quantity exceeds 32-bit integer limit',
        });
      }
      newUserAllocQty = Math.max(0, targetAlloc);
    }

    // Upsert caller allocation
    await client.query(
      `INSERT INTO group_cart_allocations (cart_item_id, user_id, quantity, paid)
       VALUES ($1, $2, $3, false)
       ON CONFLICT (cart_item_id, user_id)
       DO UPDATE SET quantity = EXCLUDED.quantity, updated_at = CURRENT_TIMESTAMP`,
      [cartItemId, userId, newUserAllocQty]
    );

    // Reconcile total cart item quantity
    const reconciledTotalQty = Math.max(1, sumOthers + newUserAllocQty);
    await client.query(
      `UPDATE group_cart_items 
       SET quantity = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2`,
      [reconciledTotalQty, cartItemId]
    );

    await client.query('COMMIT');
    inTransaction = false;

    const items = await getCartData(groupId, pool);
    broadcastCartUpdated(req, groupId, items);

    return res.json({
      success: true,
      data: {
        groupId,
        items,
      },
    });
  } catch (error) {
    if (inTransaction) {
      try {
        await client.query('ROLLBACK');
      } catch (rbErr) {
        console.error('Rollback error:', rbErr);
      }
    }
    console.error('Error updating cart item quantity:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update item quantity',
    });
  } finally {
    client.release();
  }
};

/**
 * PATCH /api/groups/:groupId/cart/items/:productId/allocations/:memberId
 * Update member allocation quantity and/or paid status
 */
export const updateCartAllocation = async (req, res) => {
  const { groupId, productId, memberId } = req.params;
  const userId = req.user.id;
  const { quantity, paid } = req.body;

  if (!isValidUUID(groupId) || !isValidUUID(productId) || !isValidUUID(memberId)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid UUID format in parameters',
    });
  }

  let parsedAllocQty;
  if (quantity !== undefined) {
    const parsed = parseSafeInt(quantity, { min: 0, max: MAX_PG_INT });
    if (!parsed.valid) {
      return res.status(400).json({
        success: false,
        error: 'Allocation quantity must be a non-negative integer (0 to 2147483647)',
      });
    }
    parsedAllocQty = parsed.value;
  }

  if (quantity === undefined && paid === undefined) {
    return res.status(400).json({
      success: false,
      error: 'Either quantity or paid must be specified',
    });
  }

  const membership = await checkGroupMembership(groupId, userId);
  if (!membership) {
    return res.status(403).json({
      success: false,
      error: 'Access denied: You are not a member of this group',
    });
  }

  const targetCheck = await checkGroupMembership(groupId, memberId);
  if (!targetCheck) {
    return res.status(400).json({
      success: false,
      error: 'Target member is not in this group',
    });
  }

  const client = await pool.connect();
  let inTransaction = false;
  try {
    await client.query('BEGIN');
    inTransaction = true;

    // Lock parent item row
    const itemCheck = await client.query(
      'SELECT id, quantity FROM group_cart_items WHERE group_id = $1 AND product_id = $2 FOR UPDATE',
      [groupId, productId]
    );

    if (itemCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Item not found in cart',
      });
    }

    const cartItemId = itemCheck.rows[0].id;

    // Lock allocation row
    const existingAlloc = await client.query(
      'SELECT id, quantity, paid FROM group_cart_allocations WHERE cart_item_id = $1 AND user_id = $2 FOR UPDATE',
      [cartItemId, memberId]
    );

    // Calculate sum of other active members' allocations to guard against overflow
    const otherAllocsRes = await client.query(
      `SELECT COALESCE(SUM(gca.quantity), 0)::integer AS sum_others
       FROM group_cart_allocations gca
       JOIN group_cart_items gci ON gca.cart_item_id = gci.id
       JOIN group_members gm ON gm.group_id = gci.group_id AND gm.user_id = gca.user_id
       WHERE gca.cart_item_id = $1 AND gca.user_id != $2`,
      [cartItemId, memberId]
    );
    const sumOthers = parseInt(otherAllocsRes.rows[0].sum_others, 10);

    const allocQty = parsedAllocQty !== undefined
      ? parsedAllocQty
      : (existingAlloc.rows.length > 0 ? existingAlloc.rows[0].quantity : 1);
    const allocPaid = paid !== undefined
      ? Boolean(paid)
      : (existingAlloc.rows.length > 0 ? existingAlloc.rows[0].paid : false);

    if (allocQty > MAX_PG_INT || (sumOthers + allocQty) > MAX_PG_INT) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Resulting quantity exceeds 32-bit integer limit',
      });
    }

    // Atomic upsert with ON CONFLICT
    await client.query(
      `INSERT INTO group_cart_allocations (cart_item_id, user_id, quantity, paid)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (cart_item_id, user_id)
       DO UPDATE SET 
         quantity = EXCLUDED.quantity,
         paid = EXCLUDED.paid,
         updated_at = CURRENT_TIMESTAMP`,
      [cartItemId, memberId, allocQty, allocPaid]
    );

    // Reconcile total quantity in group_cart_items to eliminate ghost unallocated items and exclude orphaned allocations
    await client.query(
      `UPDATE group_cart_items
       SET quantity = GREATEST(
         1,
         COALESCE((
           SELECT SUM(gca.quantity) 
           FROM group_cart_allocations gca
           JOIN group_members gm ON gm.group_id = group_cart_items.group_id AND gm.user_id = gca.user_id
           WHERE gca.cart_item_id = $1
         ), 1)
       ),
       updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [cartItemId]
    );

    await client.query('COMMIT');
    inTransaction = false;

    const items = await getCartData(groupId, pool);
    broadcastCartUpdated(req, groupId, items);

    return res.json({
      success: true,
      data: {
        groupId,
        items,
      },
    });
  } catch (error) {
    if (inTransaction) {
      try {
        await client.query('ROLLBACK');
      } catch (rbErr) {
        console.error('Rollback error:', rbErr);
      }
    }
    console.error('Error updating cart allocation:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update cart allocation',
    });
  } finally {
    client.release();
  }
};

/**
 * PATCH /api/groups/:groupId/cart/allocations/payment
 * Update member payment fulfillment across all items or mark all paid
 */
export const updatePaymentFulfillment = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;
    const { memberId, paid, markAll } = req.body;

    if (!isValidUUID(groupId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid group ID format',
      });
    }

    const membership = await checkGroupMembership(groupId, userId);
    if (!membership) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: You are not a member of this group',
      });
    }

    if (markAll === undefined && !memberId) {
      return res.status(400).json({
        success: false,
        error: 'Either markAll or memberId must be specified',
      });
    }

    if (memberId && !isValidUUID(memberId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid member ID format: must be a valid UUID',
      });
    }

    if (memberId) {
      const targetCheck = await checkGroupMembership(groupId, memberId);
      if (!targetCheck) {
        return res.status(400).json({
          success: false,
          error: 'Target member is not in this group',
        });
      }
    }

    const targetPaid = paid !== undefined ? Boolean(paid) : true;

    if (markAll === true || markAll === 'true') {
      await pool.query(
        `UPDATE group_cart_allocations
         SET paid = $1, updated_at = CURRENT_TIMESTAMP
         WHERE cart_item_id IN (SELECT id FROM group_cart_items WHERE group_id = $2)
           AND user_id IN (SELECT user_id FROM group_members WHERE group_id = $2)`,
        [targetPaid, groupId]
      );
    } else if (memberId) {
      await pool.query(
        `UPDATE group_cart_allocations
         SET paid = $1, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $2 AND cart_item_id IN (SELECT id FROM group_cart_items WHERE group_id = $3)`,
        [targetPaid, memberId, groupId]
      );
    }

    const items = await getCartData(groupId, pool);
    broadcastCartUpdated(req, groupId, items);

    return res.json({
      success: true,
      data: {
        groupId,
        items,
      },
    });
  } catch (error) {
    console.error('Error updating payment fulfillment:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update payment fulfillment',
    });
  }
};

/**
 * DELETE /api/groups/:groupId/cart/items/:productId
 * Delete item and cascade allocations
 */
export const removeCartItem = async (req, res) => {
  try {
    const { groupId, productId } = req.params;
    const userId = req.user.id;

    if (!isValidUUID(groupId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid group ID format',
      });
    }

    if (!isValidUUID(productId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid product ID format',
      });
    }

    const membership = await checkGroupMembership(groupId, userId);
    if (!membership) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: You are not a member of this group',
      });
    }

    await pool.query(
      'DELETE FROM group_cart_items WHERE group_id = $1 AND product_id = $2',
      [groupId, productId]
    );

    const items = await getCartData(groupId, pool);
    broadcastCartUpdated(req, groupId, items);

    return res.json({
      success: true,
      data: {
        groupId,
        items,
      },
    });
  } catch (error) {
    console.error('Error removing cart item:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to remove item from cart',
    });
  }
};

/**
 * DELETE /api/groups/:groupId/cart
 * Clear entire group cart
 */
export const clearGroupCart = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    if (!isValidUUID(groupId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid group ID format',
      });
    }

    const membership = await checkGroupMembership(groupId, userId);
    if (!membership) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: You are not a member of this group',
      });
    }

    await pool.query('DELETE FROM group_cart_items WHERE group_id = $1', [groupId]);

    broadcastCartCleared(req, groupId);

    return res.json({
      success: true,
      data: null,
    });
  } catch (error) {
    console.error('Error clearing group cart:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to clear group cart',
    });
  }
};
