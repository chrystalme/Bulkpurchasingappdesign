# ⚡ Quick Reference Card

## 🚀 Setup Commands

```bash
# First time setup
cd server
npm install
docker-compose up -d
npm run migrate
npm run seed
npm run dev
```

## 🎮 Daily Commands

```bash
# Start database
docker-compose up -d

# Start server
npm run dev

# Stop database
docker-compose down

# View logs
docker-compose logs -f postgres

# Reset database (WARNING: Deletes all data!)
npm run reset
```

## 🔑 Demo Accounts

| Email | Password | Role |
|-------|----------|------|
| `super@admin.com` | `password123` | superUser |
| `admin@savetogether.com` | `password123` | admin |
| `vendor@solartech.com` | `password123` | vendor |
| `vendor@powercell.com` | `password123` | vendor |
| `afam@example.com` | `password123` | member |
| `chioma@example.com` | `password123` | member |

## 📡 Quick API Tests

```bash
# Health check
curl http://localhost:3001/health

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"afam@example.com","password":"password123"}'

# Get products
curl http://localhost:3001/api/products

# Get my orders (needs token)
curl http://localhost:3001/api/orders \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🗄️ Database Commands

```bash
# Connect to database
docker exec -it save-together-db psql -U postgres -d save_together

# Inside psql:
\dt              # List all tables
\d users         # Describe users table
SELECT * FROM users;
SELECT * FROM products LIMIT 5;
\q               # Exit
```

## 📊 Useful SQL Queries

```sql
-- Count users by role
SELECT role, COUNT(*) FROM users GROUP BY role;

-- Get total orders
SELECT COUNT(*) FROM orders;

-- Get revenue by vendor
SELECT v.name, SUM(oi.price * oi.quantity) as revenue
FROM vendors v
JOIN products p ON v.id = p.vendor_id
JOIN order_items oi ON p.id = oi.product_id
GROUP BY v.name;

-- Get escrow transactions summary
SELECT status, COUNT(*) FROM escrow_transactions GROUP BY status;
```

## 🔧 Troubleshooting

```bash
# Database not starting?
docker-compose down
docker-compose up -d

# Port already in use?
lsof -i :5432    # Find what's using port
lsof -i :3001    # Find what's using port

# Can't connect to database?
docker ps        # Check if container is running
docker logs save-together-db

# Tables don't exist?
npm run migrate

# Need fresh data?
npm run reset
```

## 📁 Important Files

| File | Purpose |
|------|---------|
| `src/server.js` | Main Express server |
| `src/db/schema.sql` | Database structure |
| `src/db/seed.js` | Test data |
| `src/routes/auth.routes.js` | Login/signup |
| `src/middleware/auth.js` | JWT verification |
| `.env` | Configuration |
| `README.md` | Full docs |

## 🎯 Common Tasks

### Add New Endpoint
1. Create route file in `src/routes/`
2. Import in `src/server.js`
3. Add `app.use('/api/name', nameRoutes)`

### Update Database Schema
1. Edit `src/db/schema.sql`
2. Run `npm run migrate`
3. (Optional) Update `src/db/seed.js`

### View API Endpoints
Open `http://localhost:3001` in browser  
Check console output when starting server

### Test with Postman
1. Import endpoints from `API_EXAMPLES.md`
2. Set base URL: `http://localhost:3001`
3. Add token to Authorization header

## 🌐 URLs

| Service | URL |
|---------|-----|
| API Server | http://localhost:3001 |
| Health Check | http://localhost:3001/health |
| PostgreSQL | localhost:5432 |
| pgAdmin | http://localhost:5050 |

## 📦 NPM Scripts

```bash
npm run dev      # Start with auto-reload
npm start        # Start production
npm run migrate  # Create tables
npm run seed     # Add test data
npm run reset    # Drop + recreate + seed
```

## 🔐 Environment Variables

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=dev123
DB_NAME=save_together
PORT=3001
JWT_SECRET=your-secret-key
CORS_ORIGIN=http://localhost:5173
```

## 💡 Pro Tips

- Use pgAdmin at http://localhost:5050 for visual database management
- JWT tokens expire after 7 days
- All passwords are hashed with bcrypt (10 rounds)
- Check `src/middleware/auth.js` for role permissions
- Use `console.log` in routes for debugging
- Check server logs for SQL queries
- Test with `curl -v` for verbose output

## 📞 Getting Help

1. Check `README.md` for detailed docs
2. Check `SETUP_GUIDE.md` for setup issues
3. Check `API_EXAMPLES.md` for request examples
4. Check server console for error messages
5. Check PostgreSQL logs: `docker logs save-together-db`

---

**Keep this file handy!** Bookmark it for quick access. 🔖
