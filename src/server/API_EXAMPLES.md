# 📡 API Testing Examples

Complete examples for testing all endpoints with cURL and JavaScript.

## 🔐 Authentication

### 1. Sign Up (Create Account)

**cURL:**
```bash
curl -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "secure123",
    "name": "New User",
    "role": "member"
  }'
```

**JavaScript (fetch):**
```javascript
const response = await fetch('http://localhost:3001/api/auth/signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'newuser@example.com',
    password: 'secure123',
    name: 'New User',
    role: 'member'
  })
});
const data = await response.json();
console.log(data.token); // Save this token!
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 11,
    "email": "newuser@example.com",
    "name": "New User",
    "role": "member",
    "trust_score": 0
  }
}
```

---

### 2. Login

**cURL:**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "afam@example.com",
    "password": "password123"
  }'
```

**JavaScript:**
```javascript
const response = await fetch('http://localhost:3001/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'afam@example.com',
    password: 'password123'
  })
});
const data = await response.json();
localStorage.setItem('token', data.token); // Save token
```

---

### 3. Get Current User

**cURL:**
```bash
curl http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**JavaScript:**
```javascript
const token = localStorage.getItem('token');
const response = await fetch('http://localhost:3001/api/auth/me', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const data = await response.json();
```

---

## 🛍️ Products

### 1. Get All Products

**cURL:**
```bash
curl http://localhost:3001/api/products
```

**JavaScript:**
```javascript
const response = await fetch('http://localhost:3001/api/products');
const data = await response.json();
console.log(data.products);
```

---

### 2. Get Products by Category

**cURL:**
```bash
curl "http://localhost:3001/api/products?category=Solar Energy"
```

**JavaScript:**
```javascript
const category = encodeURIComponent('Solar Energy');
const response = await fetch(`http://localhost:3001/api/products?category=${category}`);
const data = await response.json();
```

---

### 3. Get Product by ID

**cURL:**
```bash
curl http://localhost:3001/api/products/1
```

---

### 4. Create Product (Vendor Only)

**cURL:**
```bash
curl -X POST http://localhost:3001/api/products \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Solar Panel 500W",
    "image": "solar-panel-500",
    "bulk_price": 299.99,
    "retail_price": 449.99,
    "moq": 5,
    "vendor_id": 5,
    "category": "Solar Energy"
  }'
```

**JavaScript:**
```javascript
const token = localStorage.getItem('token');
const response = await fetch('http://localhost:3001/api/products', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Solar Panel 500W',
    image: 'solar-panel-500',
    bulk_price: 299.99,
    retail_price: 449.99,
    moq: 5,
    vendor_id: 5,
    category: 'Solar Energy'
  })
});
```

---

### 5. Update Product

**cURL:**
```bash
curl -X PUT http://localhost:3001/api/products/1 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bulk_price": 39.99,
    "retail_price": 59.99
  }'
```

---

## 🏪 Vendors

### 1. Get All Vendors

**cURL:**
```bash
curl http://localhost:3001/api/vendors
```

---

### 2. Get Vendor Dashboard Stats

**cURL:**
```bash
curl http://localhost:3001/api/vendors/5/dashboard \
  -H "Authorization: Bearer YOUR_VENDOR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "total_revenue": 45820.50,
    "monthly_revenue": 12450.75,
    "total_orders": 156,
    "pending_orders": 8,
    "total_products": 14,
    "total_customers": 89,
    "average_rating": 4.9
  }
}
```

---

### 3. Get Vendor Orders

**cURL:**
```bash
curl http://localhost:3001/api/vendors/5/orders \
  -H "Authorization: Bearer YOUR_VENDOR_TOKEN"
```

---

### 4. Get Vendor Customers

**cURL:**
```bash
curl http://localhost:3001/api/vendors/5/customers \
  -H "Authorization: Bearer YOUR_VENDOR_TOKEN"
```

---

## 📦 Orders

### 1. Get My Orders

**cURL:**
```bash
curl http://localhost:3001/api/orders \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**JavaScript:**
```javascript
const token = localStorage.getItem('token');
const response = await fetch('http://localhost:3001/api/orders', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const data = await response.json();
```

---

### 2. Create Order

**cURL:**
```bash
curl -X POST http://localhost:3001/api/orders \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "product_id": 10,
        "quantity": 5
      },
      {
        "product_id": 11,
        "quantity": 3
      }
    ],
    "group_id": 1
  }'
```

**JavaScript:**
```javascript
const token = localStorage.getItem('token');
const response = await fetch('http://localhost:3001/api/orders', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    items: [
      { product_id: 10, quantity: 5 },
      { product_id: 11, quantity: 3 }
    ],
    group_id: 1
  })
});
const data = await response.json();
console.log(data.order);
```

**Response:**
```json
{
  "success": true,
  "order": {
    "id": 4,
    "order_number": "ORD-1737382145678",
    "buyer_id": 7,
    "status": "pending",
    "total_amount": 2157.92,
    "items": [
      {
        "product_id": 10,
        "product_name": "Monocrystalline Solar Panel 300W",
        "quantity": 5,
        "price": 175.99
      }
    ]
  }
}
```

---

### 3. Update Order Status

**cURL:**
```bash
curl -X PUT http://localhost:3001/api/orders/1/status \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "shipped"}'
```

---

## 🔒 Escrow Transactions

### 1. Get My Transactions

**cURL:**
```bash
# Get all (buyer + seller)
curl http://localhost:3001/api/escrow/transactions \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get buyer transactions only
curl "http://localhost:3001/api/escrow/transactions?type=buyer" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get seller transactions only
curl "http://localhost:3001/api/escrow/transactions?type=seller" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**JavaScript:**
```javascript
const token = localStorage.getItem('token');
const response = await fetch('http://localhost:3001/api/escrow/transactions?type=buyer', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const data = await response.json();
```

---

### 2. Create Escrow Transaction

**cURL:**
```bash
curl -X POST http://localhost:3001/api/escrow/transactions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": 4,
    "seller_id": 3,
    "amount": 2157.92,
    "escrow_fee": 64.74
  }'
```

**JavaScript:**
```javascript
const token = localStorage.getItem('token');
const response = await fetch('http://localhost:3001/api/escrow/transactions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    order_id: 4,
    seller_id: 3,
    amount: 2157.92,
    escrow_fee: 64.74
  })
});
```

---

### 3. Update Escrow Status (Mark as Shipped)

**cURL:**
```bash
curl -X PUT http://localhost:3001/api/escrow/transactions/1/status \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "pending_inspection",
    "tracking_id": "TRK-9999888777",
    "courier": "DHL Express"
  }'
```

---

### 4. Confirm Delivery (Buyer)

**cURL:**
```bash
curl -X POST http://localhost:3001/api/escrow/transactions/1/confirm-delivery \
  -H "Authorization: Bearer YOUR_BUYER_TOKEN"
```

---

### 5. Release Funds (Buyer)

**cURL:**
```bash
curl -X POST http://localhost:3001/api/escrow/transactions/1/release \
  -H "Authorization: Bearer YOUR_BUYER_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "message": "Funds released to seller",
  "transaction": {
    "id": 1,
    "status": "released",
    "released_at": "2026-01-20T12:34:56.789Z"
  }
}
```

---

## 👥 User Management (Admin)

### 1. Get All Users

**cURL:**
```bash
curl http://localhost:3001/api/users \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

### 2. Get User Statistics

**cURL:**
```bash
curl http://localhost:3001/api/users/stats \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "total": "10",
    "active": "10",
    "super_users": "1",
    "admins": "1",
    "vendors": "4",
    "members": "4"
  }
}
```

---

### 3. Create User

**cURL:**
```bash
curl -X POST http://localhost:3001/api/users \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newadmin@example.com",
    "password": "admin123",
    "name": "New Admin",
    "role": "admin"
  }'
```

---

### 4. Deactivate User

**cURL:**
```bash
curl -X POST http://localhost:3001/api/users/7/deactivate \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

### 5. Delete User (SuperUser Only)

**cURL:**
```bash
curl -X DELETE http://localhost:3001/api/users/11 \
  -H "Authorization: Bearer YOUR_SUPERUSER_TOKEN"
```

---

## 🔧 Complete JavaScript Example

```javascript
// API Client Class
class SaveTogetherAPI {
  constructor(baseURL = 'http://localhost:3001') {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('token');
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    if (this.token) {
      config.headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  }

  // Auth
  async login(email, password) {
    const data = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.token = data.token;
    localStorage.setItem('token', data.token);
    return data;
  }

  async signup(email, password, name, role = 'member') {
    const data = await this.request('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, name, role }),
    });
    this.token = data.token;
    localStorage.setItem('token', data.token);
    return data;
  }

  async getMe() {
    return this.request('/api/auth/me');
  }

  // Products
  async getProducts(filters = {}) {
    const query = new URLSearchParams(filters).toString();
    return this.request(`/api/products${query ? '?' + query : ''}`);
  }

  async getProduct(id) {
    return this.request(`/api/products/${id}`);
  }

  async createProduct(productData) {
    return this.request('/api/products', {
      method: 'POST',
      body: JSON.stringify(productData),
    });
  }

  // Orders
  async getOrders() {
    return this.request('/api/orders');
  }

  async createOrder(items, groupId = null) {
    return this.request('/api/orders', {
      method: 'POST',
      body: JSON.stringify({ items, group_id: groupId }),
    });
  }

  // Escrow
  async getTransactions(type = 'all') {
    return this.request(`/api/escrow/transactions?type=${type}`);
  }

  async createEscrowTransaction(orderId, sellerId, amount, escrowFee) {
    return this.request('/api/escrow/transactions', {
      method: 'POST',
      body: JSON.stringify({
        order_id: orderId,
        seller_id: sellerId,
        amount,
        escrow_fee: escrowFee,
      }),
    });
  }

  async releaseFunds(transactionId) {
    return this.request(`/api/escrow/transactions/${transactionId}/release`, {
      method: 'POST',
    });
  }

  // Vendors
  async getVendorDashboard(vendorId) {
    return this.request(`/api/vendors/${vendorId}/dashboard`);
  }

  async getVendorOrders(vendorId) {
    return this.request(`/api/vendors/${vendorId}/orders`);
  }

  async getVendorCustomers(vendorId) {
    return this.request(`/api/vendors/${vendorId}/customers`);
  }
}

// Usage Example
const api = new SaveTogetherAPI();

// Login
await api.login('afam@example.com', 'password123');

// Get products
const { products } = await api.getProducts({ category: 'Solar Energy' });

// Create order
const { order } = await api.createOrder([
  { product_id: 10, quantity: 5 },
  { product_id: 11, quantity: 3 },
]);

// Get my orders
const { orders } = await api.getOrders();

console.log('Orders:', orders);
```

---

## 📝 Notes

- Replace `YOUR_TOKEN` with actual JWT token from login/signup
- All authenticated requests require `Authorization: Bearer TOKEN` header
- Tokens expire after 7 days
- Use appropriate role tokens for role-specific endpoints
- Check response status codes for error handling

## 🔗 Helpful Resources

- [cURL Documentation](https://curl.se/docs/)
- [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
- [Postman](https://www.postman.com/) - Alternative to cURL for testing
