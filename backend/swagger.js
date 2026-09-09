/**
 * Swagger/OpenAPI Configuration for Bulk Purchasing App API
 * This file generates comprehensive API documentation
 */

import swaggerJsdoc from 'swagger-jsdoc';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Bulk Purchasing Platform API',
      description:
        'Complete API documentation for the Save Together bulk purchasing application. Includes authentication, user management, product catalog, orders, escrow, disputes, and real-time chat.',
      version: '1.0.0',
      contact: {
        name: 'API Support',
        email: 'support@savetogether.com',
      },
      license: {
        name: 'MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001/api',
        description: 'Development Server',
      },
      {
        url: 'https://api.savetogether.com',
        description: 'Production Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token from login endpoint',
        },
      },
      schemas: {
        // User Schemas
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            role: {
              type: 'string',
              enum: ['superUser', 'admin', 'vendor', 'member'],
            },
            avatar: { type: 'string', format: 'uri' },
            vendor_id: { type: 'string', format: 'uuid', nullable: true },
            trust_score: { type: 'integer' },
            is_active: { type: 'boolean' },
            is_online: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
          },
          required: ['id', 'email', 'name', 'role', 'created_at'],
        },

        AuthResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            token: {
              type: 'string',
              description: 'JWT token for API authentication',
            },
            user: { $ref: '#/components/schemas/User' },
            error: { type: 'string' },
          },
        },

        // Product Schemas
        Product: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            image: { type: 'string' },
            bulk_price: { type: 'number', format: 'decimal' },
            retail_price: { type: 'number', format: 'decimal' },
            moq: { type: 'integer', description: 'Minimum Order Quantity' },
            vendor_id: { type: 'string', format: 'uuid' },
            category: { type: 'string' },
            is_active: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
          },
          required: [
            'id',
            'name',
            'bulk_price',
            'retail_price',
            'moq',
            'vendor_id',
            'category',
          ],
        },

        // Vendor Schemas
        Vendor: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            rating: {
              type: 'number',
              format: 'decimal',
              minimum: 0,
              maximum: 5,
            },
            location: { type: 'string' },
            image: { type: 'string', format: 'uri' },
            verified: { type: 'boolean' },
            product_count: { type: 'integer' },
            created_at: { type: 'string', format: 'date-time' },
          },
          required: ['id', 'name', 'rating', 'verified'],
        },

        VendorDashboard: {
          type: 'object',
          properties: {
            total_revenue: { type: 'number', format: 'decimal' },
            monthly_revenue: { type: 'number', format: 'decimal' },
            total_orders: { type: 'integer' },
            pending_orders: { type: 'integer' },
            total_products: { type: 'integer' },
            total_customers: { type: 'integer' },
            average_rating: { type: 'number', format: 'decimal' },
            total_reviews: { type: 'integer' },
          },
        },

        // Group Schemas
        Group: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: { type: 'string' },
            join_code: { type: 'string' },
            moq_target: { type: 'integer' },
            current_quantity: { type: 'integer' },
            status: {
              type: 'string',
              enum: ['active', 'pending', 'completed'],
            },
            created_by: {
              type: 'string',
              format: 'uuid',
              description: 'User ID of group creator (automatically admin)',
            },
            created_at: { type: 'string', format: 'date-time' },
          },
          required: [
            'id',
            'name',
            'join_code',
            'moq_target',
            'status',
            'created_by',
            'created_at',
          ],
        },

        GroupMember: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            group_id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            user: { $ref: '#/components/schemas/User' },
            role: {
              type: 'string',
              enum: ['admin', 'member'],
              description: 'Group-level role',
            },
            joined_at: { type: 'string', format: 'date-time' },
          },
          required: ['id', 'group_id', 'user_id', 'role', 'joined_at'],
        },

        // Order Schemas
        Order: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            order_number: { type: 'string' },
            group_id: { type: 'string', format: 'uuid' },
            buyer_id: { type: 'string', format: 'uuid' },
            status: {
              type: 'string',
              enum: [
                'pending',
                'paid',
                'confirmed',
                'shipped',
                'delivered',
                'cancelled',
              ],
            },
            total_amount: { type: 'number', format: 'decimal' },
            estimated_delivery: { type: 'string', format: 'date-time' },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  product_id: { type: 'string', format: 'uuid' },
                  product: { $ref: '#/components/schemas/Product' },
                  quantity: { type: 'integer' },
                  price: { type: 'number', format: 'decimal' },
                },
              },
            },
            created_at: { type: 'string', format: 'date-time' },
          },
          required: [
            'id',
            'order_number',
            'status',
            'total_amount',
            'created_at',
          ],
        },

        // Escrow Schemas
        EscrowTransaction: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            transaction_number: { type: 'string' },
            order_id: { type: 'string', format: 'uuid' },
            buyer_id: { type: 'string', format: 'uuid' },
            seller_id: { type: 'string', format: 'uuid' },
            amount: { type: 'number', format: 'decimal' },
            escrow_fee: { type: 'number', format: 'decimal' },
            status: {
              type: 'string',
              enum: [
                'locked',
                'pending_inspection',
                'released',
                'disputed',
                'refunded',
              ],
            },
            tracking_id: { type: 'string' },
            courier: { type: 'string' },
            paid_at: { type: 'string', format: 'date-time' },
            shipped_at: { type: 'string', format: 'date-time' },
            delivered_at: { type: 'string', format: 'date-time' },
            released_at: { type: 'string', format: 'date-time' },
            created_at: { type: 'string', format: 'date-time' },
          },
          required: [
            'id',
            'transaction_number',
            'amount',
            'status',
            'created_at',
          ],
        },

        Dispute: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            dispute_number: { type: 'string' },
            transaction_id: { type: 'string', format: 'uuid' },
            reason: {
              type: 'string',
              enum: [
                'wrong_quantity',
                'damaged',
                'not_as_described',
                'not_received',
              ],
            },
            status: {
              type: 'string',
              enum: ['open', 'under_review', 'resolved'],
            },
            resolution: {
              type: 'string',
              enum: ['refund_buyer', 'release_seller', 'partial_split'],
            },
            admin_notes: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
            resolved_at: { type: 'string', format: 'date-time' },
          },
          required: [
            'id',
            'dispute_number',
            'transaction_id',
            'reason',
            'status',
            'created_at',
          ],
        },

        // Chat Schemas
        Conversation: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            type: { type: 'string', enum: ['group', 'group-vendor'] },
            title: { type: 'string' },
            avatar: { type: 'string' },
            group_id: { type: 'string', format: 'uuid' },
            vendor_id: { type: 'string', format: 'uuid', nullable: true },
            product_id: { type: 'string', format: 'uuid', nullable: true },
            last_message: { $ref: '#/components/schemas/Message' },
            unread_count: { type: 'integer' },
            typing_users: { type: 'array', items: { type: 'object' } },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
          required: ['id', 'type', 'title', 'group_id', 'created_at'],
        },

        Message: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            conversation_id: { type: 'string', format: 'uuid' },
            sender_id: { type: 'string', format: 'uuid' },
            sender_name: { type: 'string' },
            sender_avatar: { type: 'string', format: 'uri' },
            content: { type: 'string' },
            is_deleted: { type: 'boolean' },
            timestamp: { type: 'string', format: 'date-time' },
            is_own: { type: 'boolean' },
            read: { type: 'boolean' },
          },
          required: [
            'id',
            'conversation_id',
            'sender_id',
            'content',
            'timestamp',
          ],
        },

        // Error Schemas
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string' },
          },
          required: ['success', 'error'],
        },

        ValidationError: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Authentication', description: 'User login and authentication' },
      { name: 'Users', description: 'User management (Admin only)' },
      { name: 'Products', description: 'Product catalog and management' },
      { name: 'Vendors', description: 'Vendor information and dashboards' },
      { name: 'Groups', description: 'Bulk purchasing group management' },
      { name: 'Orders', description: 'Order creation and management' },
      {
        name: 'Escrow',
        description: 'Escrow transactions and payment protection',
      },
      { name: 'Disputes', description: 'Dispute resolution' },
      { name: 'Chat', description: 'Real-time chat (WebSocket via Socket.IO)' },
    ],
  },
  apis: ['./openapi.yaml'], // Path to the API docs
};

const specs = swaggerJsdoc(options);

export default specs;
