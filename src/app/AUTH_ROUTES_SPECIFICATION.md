# 🔐 Authentication Routes Specification

## Overview

The **Authentication Routes** handle user authentication, registration, session management, and password recovery for the "Save Together, Buy Smarter" bulk purchasing application. These routes form the foundation of user identity and access control across the entire platform.

---

## 🎯 What Authentication Is For

In your bulk purchasing app, **Authentication** enables:

1. **User Identity** - Verify who users are
2. **Secure Access** - Protect sensitive user data and transactions
3. **Role-Based Access** - Different permissions for members, vendors, admins
4. **Session Management** - Maintain user sessions securely
5. **Account Recovery** - Help users regain access to their accounts
6. **Audit Trail** - Track who performed which actions

---

## 🏗️ Authentication Architecture

### Base Route
```
/api/auth
```

### Authentication Methods
- **JWT (JSON Web Tokens)** - Stateless authentication
- **HTTP-Only Cookies** - Secure token storage (optional)
- **Bearer Token** - Authorization header format

### Token Structure
```javascript
{
  userId: "uuid",
  email: "user@example.com",
  role: "member|vendor|admin|superUser",
  name: "User Name",
  iat: 1706280000,  // Issued at
  exp: 1706366400   // Expires in 24 hours
}
```

---

## 📍 Complete Endpoint List

### Authentication & Registration (5 endpoints)
1. `POST /api/auth/signup` - Register new user account
2. `POST /api/auth/login` - Login with credentials
3. `POST /api/auth/logout` - Logout and invalidate token
4. `GET /api/auth/me` - Get current authenticated user
5. `POST /api/auth/refresh` - Refresh access token

### Password Management (4 endpoints)
6. `POST /api/auth/forgot-password` - Request password reset
7. `POST /api/auth/reset-password` - Reset password with token
8. `PUT /api/auth/change-password` - Change password (authenticated)
9. `POST /api/auth/verify-email` - Verify email address

### Account Management (3 endpoints)
10. `PUT /api/auth/update-profile` - Update user profile
11. `DELETE /api/auth/delete-account` - Delete user account
12. `POST /api/auth/verify-token` - Verify token validity

### Multi-Factor Authentication (3 endpoints - Optional)
13. `POST /api/auth/mfa/enable` - Enable 2FA
14. `POST /api/auth/mfa/verify` - Verify 2FA code
15. `POST /api/auth/mfa/disable` - Disable 2FA

---

## 📖 Detailed Endpoint Specifications

---

### 1. POST /api/auth/signup

**Purpose:** Register a new user account

**Authentication:** Not required (public endpoint)

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "password": "SecurePassword123!",
  "role": "member",
  "phone": "+1234567890",
  "location": "New York, USA",
  "avatar": "https://example.com/avatar.jpg"
}
```

**Field Descriptions:**
- `name` (required, string, 2-100 chars) - Full name
- `email` (required, string, valid email) - Unique email address
- `password` (required, string, min 8 chars) - Strong password
- `role` (required, enum: `member`|`vendor`) - User type (admin/superUser set by system)
- `phone` (optional, string) - Contact phone number
- `location` (optional, string) - User's location
- `avatar` (optional, string, URL) - Profile picture URL

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Account created successfully",
  "user": {
    "id": "uuid-1",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "role": "member",
    "phone": "+1234567890",
    "location": "New York, USA",
    "avatar": "https://example.com/avatar.jpg",
    "email_verified": false,
    "created_at": "2025-01-26T10:00:00Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 86400
}
```

**Business Logic:**

1. **Validation:**
   - Check email is unique (not already registered)
   - Validate email format
   - Validate password strength (min 8 chars, 1 uppercase, 1 number, 1 special char)
   - Validate role is either 'member' or 'vendor'
   - Sanitize all inputs

2. **Password Hashing:**
   - Hash password using bcrypt (salt rounds: 10-12)
   - Never store plain text passwords
   - Generate random salt per user

3. **User Creation:**
   - Insert user into `users` table
   - Set `email_verified = false`
   - Set default values (avatar, status = 'active')
   - Generate unique user ID (UUID)

4. **Vendor-Specific Logic:**
   - If role = 'vendor', create entry in `vendors` table
   - Set vendor status = 'pending' (requires approval)
   - Link user.vendor_id to vendors.id

5. **Token Generation:**
   - Generate JWT token with user data
   - Set expiration (24 hours default)
   - Sign with JWT_SECRET

6. **Post-Creation:**
   - Send verification email
   - Create user wallet (balance = 0)
   - Log signup event
   - Send welcome notification

**Validation Rules:**
```javascript
{
  name: {
    minLength: 2,
    maxLength: 100,
    pattern: /^[a-zA-Z\s'-]+$/
  },
  email: {
    format: 'email',
    unique: true,
    maxLength: 255
  },
  password: {
    minLength: 8,
    maxLength: 128,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]/,
    message: "Password must contain uppercase, lowercase, number, and special character"
  },
  role: {
    enum: ['member', 'vendor']
  },
  phone: {
    pattern: /^\+?[1-9]\d{1,14}$/,
    optional: true
  }
}
```

**Error Responses:**

**400 Bad Request:**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    },
    {
      "field": "password",
      "message": "Password must be at least 8 characters"
    }
  ]
}
```

**409 Conflict:**
```json
{
  "error": "Email already registered",
  "message": "An account with this email already exists"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Registration failed",
  "message": "Unable to create account. Please try again."
}
```

**Security Considerations:**
- Rate limit: 5 signups per IP per hour
- CAPTCHA verification for suspicious activity
- Email verification required before full access
- Log failed signup attempts
- Block disposable email domains (optional)

---

### 2. POST /api/auth/login

**Purpose:** Authenticate user and generate access token

**Authentication:** Not required (public endpoint)

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "password": "SecurePassword123!",
  "remember_me": true
}
```

**Field Descriptions:**
- `email` (required, string) - User's email address
- `password` (required, string) - User's password
- `remember_me` (optional, boolean) - Extend token expiration to 30 days

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "uuid-1",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "role": "member",
    "avatar": "https://example.com/avatar.jpg",
    "email_verified": true,
    "status": "active",
    "created_at": "2025-01-15T10:00:00Z",
    "last_login": "2025-01-26T10:30:00Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 86400,
  "permissions": [
    "groups:create",
    "groups:join",
    "orders:create",
    "chat:send"
  ]
}
```

**For Vendor Users, Additional Fields:**
```json
{
  "user": {
    // ... standard user fields
    "vendor_id": "uuid-vendor-1",
    "vendor_name": "Tech Supplies Co",
    "vendor_verified": true,
    "vendor_rating": 4.8
  }
}
```

**Business Logic:**

1. **Credential Verification:**
   - Find user by email (case-insensitive)
   - Check user exists and status = 'active'
   - Compare password hash using bcrypt.compare()
   - Fail if credentials don't match

2. **Account Status Checks:**
   - Verify account is not suspended/deleted
   - Check if email is verified (warn if not)
   - For vendors, check vendor status is 'approved'

3. **Security Checks:**
   - Check for suspicious login patterns
   - Verify login attempt count < 5 in last 15 minutes
   - Check if account is locked due to failed attempts

4. **Token Generation:**
   - Generate access token (expires in 24h or 30d if remember_me)
   - Generate refresh token (expires in 30d or 90d)
   - Include user ID, email, role, name in token payload
   - Sign tokens with JWT_SECRET

5. **Session Management:**
   - Update user's last_login timestamp
   - Store refresh token in database (for revocation)
   - Clear any existing password reset tokens
   - Log successful login event

6. **Response Enhancement:**
   - Load vendor data if user is vendor
   - Load user permissions based on role
   - Return user preferences/settings

**Login Attempt Tracking:**
```sql
-- Track failed login attempts
CREATE TABLE login_attempts (
  id UUID PRIMARY KEY,
  email VARCHAR(255),
  ip_address VARCHAR(45),
  attempted_at TIMESTAMP,
  success BOOLEAN
);

-- Lock account after 5 failed attempts in 15 minutes
```

**Error Responses:**

**401 Unauthorized - Invalid Credentials:**
```json
{
  "error": "Invalid credentials",
  "message": "Email or password is incorrect",
  "attempts_remaining": 3
}
```

**401 Unauthorized - Account Locked:**
```json
{
  "error": "Account locked",
  "message": "Too many failed login attempts. Try again in 15 minutes.",
  "locked_until": "2025-01-26T10:45:00Z"
}
```

**403 Forbidden - Account Suspended:**
```json
{
  "error": "Account suspended",
  "message": "Your account has been suspended. Contact support.",
  "support_email": "support@savetogether.com"
}
```

**403 Forbidden - Email Not Verified:**
```json
{
  "error": "Email not verified",
  "message": "Please verify your email before logging in",
  "can_resend": true
}
```

**403 Forbidden - Vendor Pending:**
```json
{
  "error": "Vendor approval pending",
  "message": "Your vendor account is pending approval",
  "status": "pending"
}
```

**Security Considerations:**
- Rate limit: 5 login attempts per IP per 15 minutes
- Rate limit: 5 failed attempts per email per 15 minutes
- Lock account after 5 failed attempts
- Log all login attempts (success and failure)
- Notify user of login from new device/location
- Optional: Implement 2FA for vendors and admins

---

### 3. POST /api/auth/logout

**Purpose:** Logout user and invalidate tokens

**Authentication:** Required

**Request Headers:**
```
Authorization: Bearer <token>
```

**Request Body (optional):**
```json
{
  "all_devices": false
}
```

**Field Descriptions:**
- `all_devices` (optional, boolean) - Logout from all devices (invalidate all tokens)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Business Logic:**

1. **Token Invalidation:**
   - Extract token from Authorization header
   - Verify token is valid
   - Add token to blacklist (Redis or database)
   - Set expiration on blacklist entry = token's original expiration

2. **Single Device Logout:**
   - Invalidate only the current access token
   - Keep refresh token valid for other sessions

3. **All Devices Logout:**
   - If `all_devices = true`, invalidate all refresh tokens for user
   - Clear all active sessions
   - Force re-login on all devices

4. **Cleanup:**
   - Log logout event
   - Clear any temporary data
   - Update last_activity timestamp

**Token Blacklist Structure:**
```javascript
// Redis
blacklistedTokens: {
  "<token_hash>": {
    userId: "uuid-1",
    expiresAt: 1706366400,
    blacklistedAt: 1706280000
  }
}

// PostgreSQL
CREATE TABLE token_blacklist (
  id UUID PRIMARY KEY,
  token_hash VARCHAR(64),
  user_id UUID,
  expires_at TIMESTAMP,
  blacklisted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Error Responses:**

**401 Unauthorized:**
```json
{
  "error": "Invalid token",
  "message": "Token is invalid or expired"
}
```

**Security Considerations:**
- Always invalidate token server-side
- Client should delete token from storage
- Blacklist tokens to prevent reuse
- Clean up expired blacklist entries periodically
- Log logout events for audit

---

### 4. GET /api/auth/me

**Purpose:** Get current authenticated user's profile

**Authentication:** Required

**Request Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `include` (optional) - Comma-separated fields to include: `groups,orders,wallet,stats`

**Request Example:**
```http
GET /api/auth/me?include=groups,wallet,stats
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "id": "uuid-1",
  "name": "John Doe",
  "email": "john.doe@example.com",
  "role": "member",
  "phone": "+1234567890",
  "location": "New York, USA",
  "avatar": "https://example.com/avatar.jpg",
  "email_verified": true,
  "status": "active",
  "created_at": "2025-01-15T10:00:00Z",
  "last_login": "2025-01-26T10:30:00Z",
  
  "groups": [
    {
      "id": "uuid-group-1",
      "name": "Tech Enthusiasts",
      "role": "admin",
      "member_count": 12
    }
  ],
  
  "wallet": {
    "balance": 150.50,
    "currency": "USD",
    "pending": 50.00,
    "available": 100.50
  },
  
  "statistics": {
    "groups_count": 3,
    "orders_count": 15,
    "total_saved": 450.75,
    "reputation_score": 4.8
  },
  
  "preferences": {
    "notifications_enabled": true,
    "email_notifications": true,
    "theme": "light",
    "language": "en"
  },
  
  "permissions": [
    "groups:create",
    "groups:join",
    "orders:create",
    "chat:send"
  ]
}
```

**For Vendor Users:**
```json
{
  // ... standard user fields
  "vendor_id": "uuid-vendor-1",
  "vendor": {
    "id": "uuid-vendor-1",
    "name": "Tech Supplies Co",
    "description": "Quality tech supplies at bulk prices",
    "logo": "https://...",
    "verified": true,
    "rating": 4.8,
    "total_orders": 250,
    "response_time": 120,
    "status": "approved"
  },
  "vendor_statistics": {
    "total_sales": 125000.50,
    "active_products": 45,
    "pending_orders": 8,
    "completed_orders": 242
  }
}
```

**Business Logic:**

1. **Token Verification:**
   - Extract and verify JWT token
   - Check token is not blacklisted
   - Extract userId from token payload

2. **User Data Retrieval:**
   - Fetch user from database by ID
   - Verify user exists and status = 'active'
   - Load user preferences

3. **Conditional Loading:**
   - If `include=groups`, load user's groups
   - If `include=wallet`, load wallet balance
   - If `include=stats`, calculate user statistics
   - If vendor, load vendor profile

4. **Permissions Calculation:**
   - Load permissions based on user role
   - Check feature flags
   - Return allowed actions

5. **Data Enrichment:**
   - Calculate reputation score
   - Load unread notifications count
   - Check for pending actions

**Error Responses:**

**401 Unauthorized:**
```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired token"
}
```

**404 Not Found:**
```json
{
  "error": "User not found",
  "message": "User account no longer exists"
}
```

**Use Cases:**
- Load user profile on app start
- Verify user is still authenticated
- Display user info in UI
- Check permissions for actions
- Show wallet balance
- Display user statistics

---

### 5. POST /api/auth/refresh

**Purpose:** Refresh access token using refresh token

**Authentication:** Not required (uses refresh token)

**Request Body:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 86400
}
```

**Business Logic:**

1. **Refresh Token Validation:**
   - Verify refresh token signature
   - Check token is not expired
   - Check token is not blacklisted
   - Extract userId from token

2. **User Verification:**
   - Verify user still exists
   - Check user status is 'active'
   - Check user has not changed critical info

3. **Token Generation:**
   - Generate new access token (24h expiration)
   - Generate new refresh token (30d expiration)
   - Invalidate old refresh token
   - Store new refresh token in database

4. **Security Checks:**
   - Verify token rotation (old token used only once)
   - Check for token theft (concurrent usage)
   - Log token refresh event

**Refresh Token Rotation:**
```javascript
// Each refresh generates new access + refresh tokens
// Old refresh token is invalidated (one-time use)
// Prevents token theft and replay attacks
```

**Error Responses:**

**401 Unauthorized - Invalid Refresh Token:**
```json
{
  "error": "Invalid refresh token",
  "message": "Refresh token is invalid or expired. Please login again."
}
```

**401 Unauthorized - Token Reuse Detected:**
```json
{
  "error": "Token reuse detected",
  "message": "Possible token theft. All sessions have been invalidated.",
  "action": "All tokens revoked for security"
}
```

**Security Considerations:**
- Implement token rotation (one-time use)
- Detect token reuse (sign of theft)
- Limit refresh attempts per minute
- Log all refresh attempts
- Revoke all tokens if theft detected

---

### 6. POST /api/auth/forgot-password

**Purpose:** Request password reset link

**Authentication:** Not required (public endpoint)

**Request Body:**
```json
{
  "email": "john.doe@example.com"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "If an account exists with this email, a password reset link has been sent."
}
```

**Note:** Always return success even if email doesn't exist (prevent email enumeration)

**Business Logic:**

1. **Email Lookup:**
   - Search for user by email (case-insensitive)
   - If user doesn't exist, return success anyway (security)
   - Check user status is 'active'

2. **Token Generation:**
   - Generate secure random token (32 bytes)
   - Hash token before storing (use SHA-256)
   - Set expiration (1 hour)
   - Store in `password_reset_tokens` table

3. **Email Sending:**
   - Generate reset link: `https://app.com/reset-password?token=...`
   - Send email with reset instructions
   - Include token expiration time
   - Provide alternative contact method

4. **Rate Limiting:**
   - Max 3 requests per email per hour
   - Max 10 requests per IP per hour
   - Prevent abuse and spam

**Password Reset Token Structure:**
```sql
CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  token_hash VARCHAR(64),
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  used BOOLEAN DEFAULT false
);
```

**Email Template:**
```
Subject: Reset Your Password

Hi {name},

We received a request to reset your password. Click the link below to reset it:

{reset_link}

This link expires in 1 hour.

If you didn't request this, please ignore this email.

Thanks,
Save Together Team
```

**Error Responses:**

**429 Too Many Requests:**
```json
{
  "error": "Too many requests",
  "message": "Please wait before requesting another reset",
  "retry_after": 3600
}
```

**Security Considerations:**
- Never reveal if email exists
- Use secure random tokens
- Hash tokens before storage
- Set short expiration (1 hour)
- Rate limit requests
- Log all reset requests
- Notify user if multiple attempts

---

### 7. POST /api/auth/reset-password

**Purpose:** Reset password using token from email

**Authentication:** Not required (uses reset token)

**Request Body:**
```json
{
  "token": "secure-random-token-from-email",
  "new_password": "NewSecurePassword123!",
  "confirm_password": "NewSecurePassword123!"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Password reset successfully. You can now login with your new password."
}
```

**Business Logic:**

1. **Token Validation:**
   - Hash provided token
   - Look up token in database
   - Verify token exists and not expired
   - Verify token not already used
   - Extract userId from token record

2. **Password Validation:**
   - Validate password strength (same rules as signup)
   - Verify new_password matches confirm_password
   - Check password is different from old password
   - Check password not in common passwords list

3. **Password Update:**
   - Hash new password with bcrypt
   - Update user's password in database
   - Mark reset token as used
   - Invalidate all existing sessions/tokens

4. **Post-Reset Actions:**
   - Send confirmation email
   - Log password change event
   - Notify user of password change
   - Require re-login on all devices

**Error Responses:**

**400 Bad Request - Passwords Don't Match:**
```json
{
  "error": "Passwords don't match",
  "message": "New password and confirmation must match"
}
```

**400 Bad Request - Weak Password:**
```json
{
  "error": "Weak password",
  "message": "Password must contain uppercase, lowercase, number, and special character",
  "requirements": {
    "minLength": 8,
    "uppercase": true,
    "lowercase": true,
    "number": true,
    "special": true
  }
}
```

**401 Unauthorized - Invalid Token:**
```json
{
  "error": "Invalid or expired token",
  "message": "Password reset token is invalid or has expired. Please request a new one."
}
```

**410 Gone - Token Already Used:**
```json
{
  "error": "Token already used",
  "message": "This password reset link has already been used. Please request a new one."
}
```

**Security Considerations:**
- Validate token securely
- Mark tokens as single-use
- Invalidate all sessions after reset
- Send confirmation email
- Log password change
- Notify of suspicious activity

---

### 8. PUT /api/auth/change-password

**Purpose:** Change password while authenticated

**Authentication:** Required

**Request Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "current_password": "OldPassword123!",
  "new_password": "NewSecurePassword123!",
  "confirm_password": "NewSecurePassword123!"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Business Logic:**

1. **Authentication:**
   - Verify user is authenticated
   - Extract userId from token

2. **Current Password Verification:**
   - Fetch user's current password hash
   - Compare current_password with stored hash
   - Fail if current password is incorrect

3. **New Password Validation:**
   - Validate password strength
   - Verify new_password matches confirm_password
   - Check new password is different from current
   - Check not in common passwords list

4. **Password Update:**
   - Hash new password
   - Update in database
   - Optionally invalidate all tokens (force re-login)

5. **Notifications:**
   - Send email confirmation
   - Log password change
   - Alert if suspicious

**Error Responses:**

**401 Unauthorized - Incorrect Current Password:**
```json
{
  "error": "Incorrect password",
  "message": "Current password is incorrect"
}
```

**400 Bad Request - Same Password:**
```json
{
  "error": "Same password",
  "message": "New password must be different from current password"
}
```

**Security Considerations:**
- Always verify current password
- Invalidate sessions after change (optional)
- Send confirmation email
- Log password changes
- Alert user of change

---

### 9. POST /api/auth/verify-email

**Purpose:** Verify user's email address

**Authentication:** Not required (uses verification token)

**Request Body:**
```json
{
  "token": "email-verification-token-from-email"
}
```

**OR via URL parameter:**
```http
POST /api/auth/verify-email?token=email-verification-token
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Email verified successfully",
  "user": {
    "id": "uuid-1",
    "email": "john.doe@example.com",
    "email_verified": true
  }
}
```

**Business Logic:**

1. **Token Validation:**
   - Look up token in database
   - Verify token exists and not expired
   - Verify token not already used
   - Extract userId

2. **Email Verification:**
   - Update user's email_verified = true
   - Mark token as used
   - Update verified_at timestamp

3. **Post-Verification:**
   - Send welcome email
   - Unlock full features
   - Log verification event
   - Update user status if needed

**Error Responses:**

**401 Unauthorized - Invalid Token:**
```json
{
  "error": "Invalid verification token",
  "message": "Email verification token is invalid or expired"
}
```

**410 Gone - Already Verified:**
```json
{
  "error": "Already verified",
  "message": "Email address is already verified"
}
```

---

### 10. PUT /api/auth/update-profile

**Purpose:** Update authenticated user's profile information

**Authentication:** Required

**Request Body (all fields optional):**
```json
{
  "name": "John Updated Doe",
  "phone": "+1234567890",
  "location": "San Francisco, USA",
  "avatar": "https://new-avatar-url.com/image.jpg",
  "bio": "Tech enthusiast and bulk buying pro",
  "preferences": {
    "notifications_enabled": true,
    "email_notifications": false,
    "theme": "dark",
    "language": "en"
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "user": {
    "id": "uuid-1",
    "name": "John Updated Doe",
    "email": "john.doe@example.com",
    "phone": "+1234567890",
    "location": "San Francisco, USA",
    "avatar": "https://new-avatar-url.com/image.jpg",
    "bio": "Tech enthusiast and bulk buying pro",
    "updated_at": "2025-01-26T12:00:00Z"
  }
}
```

**Business Logic:**

1. **Validation:**
   - Validate name length (2-100 chars)
   - Validate phone format
   - Validate avatar URL format
   - Sanitize all inputs

2. **Update:**
   - Update only provided fields
   - Don't update email, role (use separate endpoints)
   - Update updated_at timestamp
   - Store old values for audit

3. **Preferences:**
   - Merge preferences with existing
   - Don't overwrite unspecified preferences

**Error Responses:**

**400 Bad Request:**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "name",
      "message": "Name must be between 2 and 100 characters"
    }
  ]
}
```

---

### 11. DELETE /api/auth/delete-account

**Purpose:** Permanently delete user account

**Authentication:** Required

**Request Body:**
```json
{
  "password": "UserPassword123!",
  "confirmation": "DELETE",
  "reason": "No longer need the service"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Account deleted successfully. We're sorry to see you go.",
  "data_retention": "Personal data will be deleted within 30 days as per our privacy policy"
}
```

**Business Logic:**

1. **Verification:**
   - Verify password is correct
   - Verify confirmation text matches "DELETE"
   - Check for active obligations

2. **Pre-Deletion Checks:**
   - Check no active orders
   - Check no pending escrow transactions
   - Check no admin-only groups
   - Resolve all pending issues

3. **Data Cleanup:**
   - Soft delete user (status = 'deleted')
   - Anonymize personal data after 30 days
   - Remove from all groups
   - Cancel all pending orders
   - Refund wallet balance

4. **Notifications:**
   - Send confirmation email
   - Notify groups of departure
   - Log deletion event

**Error Responses:**

**403 Forbidden - Active Obligations:**
```json
{
  "error": "Cannot delete account",
  "message": "You have active orders or escrow transactions",
  "details": {
    "active_orders": 2,
    "pending_escrow": 150.50
  }
}
```

**Security Considerations:**
- Require password confirmation
- Require explicit confirmation text
- Soft delete initially (30-day grace period)
- Retain data for legal compliance
- Allow account recovery within 30 days

---

### 12. POST /api/auth/verify-token

**Purpose:** Verify if a token is valid (useful for client-side checks)

**Authentication:** Not required (verifying the token itself)

**Request Body:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK):**
```json
{
  "valid": true,
  "user_id": "uuid-1",
  "role": "member",
  "expires_at": "2025-01-27T10:00:00Z",
  "expires_in": 82800
}
```

**Invalid Token Response (200 OK):**
```json
{
  "valid": false,
  "reason": "Token expired",
  "expired_at": "2025-01-26T10:00:00Z"
}
```

**Business Logic:**
- Verify JWT signature
- Check expiration
- Check if blacklisted
- Return validity status

---

## 🔐 Security Best Practices

### Password Requirements
```javascript
{
  minLength: 8,
  maxLength: 128,
  mustContain: {
    uppercase: 1,
    lowercase: 1,
    number: 1,
    specialChar: 1
  },
  blocked: [
    // Common passwords
    "password123",
    "12345678",
    // User's email/name
  ]
}
```

### Token Security
- **Access Token:** Short-lived (24 hours)
- **Refresh Token:** Long-lived (30 days)
- **Reset Token:** Very short (1 hour)
- **Verification Token:** Moderate (24 hours)

### Rate Limiting
| Endpoint | Limit | Window |
|----------|-------|--------|
| /signup | 5 | 1 hour |
| /login | 5 | 15 minutes |
| /forgot-password | 3 | 1 hour |
| /verify-email | 10 | 1 hour |
| All others | 100 | 15 minutes |

### Encryption
- **Passwords:** bcrypt (salt rounds: 10-12)
- **Tokens:** JWT with HS256 or RS256
- **Sensitive Data:** AES-256
- **Transit:** HTTPS/TLS 1.3

---

## 🗄️ Database Tables

### users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('member', 'vendor', 'admin', 'superUser')),
  phone VARCHAR(20),
  location VARCHAR(255),
  avatar VARCHAR(500),
  bio TEXT,
  email_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
  vendor_id UUID REFERENCES vendors(id),
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
```

### password_reset_tokens
```sql
CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT false,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reset_tokens_hash ON password_reset_tokens(token_hash);
CREATE INDEX idx_reset_tokens_expires ON password_reset_tokens(expires_at);
```

### email_verification_tokens
```sql
CREATE TABLE email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL,
  email VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### refresh_tokens
```sql
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  revoked BOOLEAN DEFAULT false,
  revoked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
```

### login_attempts
```sql
CREATE TABLE login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255),
  ip_address VARCHAR(45),
  user_agent TEXT,
  success BOOLEAN NOT NULL,
  failure_reason VARCHAR(100),
  attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_login_attempts_email ON login_attempts(email);
CREATE INDEX idx_login_attempts_ip ON login_attempts(ip_address);
CREATE INDEX idx_login_attempts_time ON login_attempts(attempted_at);
```

### token_blacklist
```sql
CREATE TABLE token_blacklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash VARCHAR(64) NOT NULL,
  user_id UUID REFERENCES users(id),
  expires_at TIMESTAMP NOT NULL,
  blacklisted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reason VARCHAR(100)
);

CREATE INDEX idx_blacklist_hash ON token_blacklist(token_hash);
CREATE INDEX idx_blacklist_expires ON token_blacklist(expires_at);
```

---

## 🔄 Integration Points

### With User Management:
- Create user profile on signup
- Manage user roles and permissions
- Track user activity and sessions

### With Email Service:
- Send verification emails
- Send password reset emails
- Send account activity notifications

### With Vendor System:
- Create vendor profile for vendor signups
- Link user to vendor account
- Manage vendor-specific permissions

### With Wallet System:
- Create wallet on signup
- Refund balance on account deletion

### With Audit System:
- Log all authentication events
- Track login attempts
- Monitor suspicious activity

---

## 🎯 Business Rules Summary

1. **Registration:**
   - Email must be unique
   - Password must meet strength requirements
   - Email verification required for full access
   - Vendors require approval before activation

2. **Login:**
   - Account locked after 5 failed attempts
   - Lock duration: 15 minutes
   - Suspended accounts cannot login
   - Unverified emails receive warning

3. **Password:**
   - Must be 8+ characters
   - Must contain uppercase, lowercase, number, special char
   - Cannot be same as previous password
   - Reset tokens expire in 1 hour

4. **Tokens:**
   - Access tokens: 24 hours
   - Refresh tokens: 30 days
   - Single-use refresh (rotation)
   - Blacklist on logout

5. **Account Deletion:**
   - Requires password confirmation
   - Cannot delete with active obligations
   - 30-day grace period
   - Anonymize data after grace period

---

## 📊 Authentication Flow Diagram

```
┌─────────────┐
│   Signup    │
└──────┬──────┘
       │
       ├─ Validate input
       ├─ Check email unique
       ├─ Hash password
       ├─ Create user
       ├─ Generate JWT
       ├─ Send verification email
       │
       v
┌─────────────┐
│   Login     │
└──────┬──────┘
       │
       ├─ Find user by email
       ├─ Verify password
       ├─ Check account status
       ├─ Generate tokens
       ├─ Update last_login
       │
       v
┌─────────────┐
│   Session   │
└──────┬──────┘
       │
       ├─ Use access token
       ├─ Verify on each request
       ├─ Refresh when expired
       ├─ Check not blacklisted
       │
       v
┌─────────────┐
│   Logout    │
└──────┬──────┘
       │
       └─ Blacklist token
         └─ Clear session
```

---

## 🎉 Summary

The **Authentication Routes** provide a complete, secure user authentication system with:

- ✅ **User Registration** - Email/password signup with verification
- ✅ **Login/Logout** - Secure session management with JWT
- ✅ **Password Management** - Reset, change, strength validation
- ✅ **Token Management** - Access, refresh, blacklisting
- ✅ **Account Management** - Profile updates, deletion
- ✅ **Security** - Rate limiting, attempt tracking, encryption
- ✅ **Audit Trail** - Log all authentication events

All endpoints follow security best practices and integrate seamlessly with other system components! 🔐
