import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  getGroupCart,
  addToGroupCart,
  updateCartItemQuantity,
  updateCartAllocation,
  updatePaymentFulfillment,
  removeCartItem,
  clearGroupCart,
} from '../controllers/cart.controller.js';

const router = express.Router({ mergeParams: true });

// All cart routes require authentication
router.use(authenticateToken);

// GET /api/groups/:groupId/cart
router.get('/', getGroupCart);

// POST /api/groups/:groupId/cart/items
router.post('/items', addToGroupCart);

// PATCH /api/groups/:groupId/cart/items/:productId
router.patch('/items/:productId', updateCartItemQuantity);

// PATCH /api/groups/:groupId/cart/items/:productId/allocations/:memberId
router.patch('/items/:productId/allocations/:memberId', updateCartAllocation);

// PATCH /api/groups/:groupId/cart/allocations/payment
router.patch('/allocations/payment', updatePaymentFulfillment);

// DELETE /api/groups/:groupId/cart/items/:productId
router.delete('/items/:productId', removeCartItem);

// DELETE /api/groups/:groupId/cart
router.delete('/', clearGroupCart);

export default router;
