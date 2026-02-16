import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken } from '../middleware/auth.js';
import {
  createGroup,
  getGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
  joinGroup,
  addMember,
  removeMember,
  updateMemberRole,
  discoverGroups,
  createJoinRequest,
  getJoinRequests,
  reviewJoinRequest,
} from '../controllers/groups.controller.js';

const router = express.Router();

// Validation middleware for group creation
const validateCreateGroup = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Group name is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('Group name must be between 2 and 255 characters'),
  body('description')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters'),
  body('moq_target')
    .isInt({ min: 1 })
    .withMessage('MOQ target must be a positive integer'),
];

// Validation middleware for group updates
const validateUpdateGroup = [
  body('name')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Group name must be between 2 and 255 characters'),
  body('description')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters'),
  body('moq_target')
    .optional()
    .isInt({ min: 1 })
    .withMessage('MOQ target must be a positive integer'),
  body('status')
    .optional()
    .isIn(['active', 'pending', 'completed'])
    .withMessage('Invalid status'),
];

// Validation middleware for joining group
const validateJoinGroup = [
  body('join_code')
    .trim()
    .notEmpty()
    .withMessage('Join code is required')
    .matches(/^GRP[A-F0-9]{8}$/)
    .withMessage('Invalid join code format'),
];

// Validation middleware for adding member
const validateAddMember = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Valid email is required'),
];

// Validation middleware for updating member role
const validateUpdateMemberRole = [
  body('role')
    .isIn(['admin', 'member'])
    .withMessage('Role must be either admin or member'),
];

// Helper middleware to check validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// ============================================
// ROUTES
// ============================================

// Create a new group
// POST /api/groups
router.post('/', authenticateToken, validateCreateGroup, handleValidationErrors, createGroup);

// Get all groups for current user
// GET /api/groups
router.get('/', authenticateToken, getGroups);

// Discover groups (must be before /:id routes)
// GET /api/groups/discover
router.get('/discover', authenticateToken, discoverGroups);

// Get specific group details with members
// GET /api/groups/:id
router.get('/:id', authenticateToken, getGroupById);

// Update group details
// PUT /api/groups/:id
router.put(
  '/:id',
  authenticateToken,
  validateUpdateGroup,
  handleValidationErrors,
  updateGroup,
);

// Delete a group
// DELETE /api/groups/:id
router.delete('/:id', authenticateToken, deleteGroup);

// Join group by code
// POST /api/groups/join
router.post('/join', authenticateToken, validateJoinGroup, handleValidationErrors, joinGroup);

// Add a member to group
// POST /api/groups/:id/members
router.post(
  '/:id/members',
  authenticateToken,
  validateAddMember,
  handleValidationErrors,
  addMember,
);

// Remove a member from group
// DELETE /api/groups/:id/members/:memberId
router.delete('/:id/members/:memberId', authenticateToken, removeMember);

// Update member role
// PUT /api/groups/:id/members/:memberId
router.put(
  '/:id/members/:memberId',
  authenticateToken,
  validateUpdateMemberRole,
  handleValidationErrors,
  updateMemberRole,
);

// Create a join request
// POST /api/groups/:id/join-requests
router.post('/:id/join-requests', authenticateToken, createJoinRequest);

// Get join requests for a group (admin only)
// GET /api/groups/:id/join-requests
router.get('/:id/join-requests', authenticateToken, getJoinRequests);

// Review (approve/reject) a join request
// PUT /api/groups/:id/join-requests/:requestId
router.put(
  '/:id/join-requests/:requestId',
  authenticateToken,
  [body('action').isIn(['approved', 'rejected']).withMessage('Action must be "approved" or "rejected"')],
  handleValidationErrors,
  reviewJoinRequest,
);

export default router;
