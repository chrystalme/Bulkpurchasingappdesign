# 🚀 Quick Setup Guide

Get your PostgreSQL + Express backend running in 5 minutes!

## Option 1: Docker (Easiest - Recommended) ⭐

### Step 1: Install Docker
- Download from [docker.com](https://www.docker.com/get-started)
- Install and start Docker Desktop

### Step 2: Start PostgreSQL
```bash
cd server
docker-compose up -d
```

This starts:
- **PostgreSQL** on `localhost:5432`
- **pgAdmin** (optional) on `http://localhost:5050`

### Step 3: Install Dependencies
```bash
npm install
```

### Step 4: Create Tables & Seed Data
```bash
npm run migrate
npm run seed
```

### Step 5: Start Server
```bash
npm run dev
```

✅ **Done!** Backend running on `http://localhost:3001`

---

## Option 2: Native PostgreSQL Installation

### Step 1: Install PostgreSQL

**macOS (Homebrew):**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Windows:**
- Download installer from [postgresql.org](https://www.postgresql.org/download/windows/)
- Run installer (remember the password you set!)

### Step 2: Create Database
```bash
# macOS/Linux
psql -U postgres

# Windows (use SQL Shell from Start Menu)
# Then in psql:
CREATE DATABASE save_together;
\q
```

### Step 3: Configure Environment
```bash
cd server
cp .env.example .env
# Edit .env if you used a different password
```

### Step 4: Install Dependencies
```bash
npm install
```

### Step 5: Create Tables & Seed Data
```bash
npm run migrate
npm run seed
```

### Step 6: Start Server
```bash
npm run dev
```

✅ **Done!** Backend running on `http://localhost:3001`

---

## Verify Installation

### Test 1: Health Check
```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "ok",
  "message": "Save Together API is running"
}
```

### Test 2: Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"afam@example.com","password":"password123"}'
```

Expected response:
```json
{
  "success": true,
  "token": "eyJhbGc...",
  "user": {
    "id": 7,
    "email": "afam@example.com",
    "name": "Afam",
    "role": "member"
  }
}
```

### Test 3: Get Products
```bash
curl http://localhost:3001/api/products
```

Should return an array of 20 products.

---

## Demo Accounts

After running `npm run seed`, these accounts are available:

| Email | Password | Role | Description |
|-------|----------|------|-------------|
| super@admin.com | password123 | superUser | Full system access |
| admin@savetogether.com | password123 | admin | User management |
| vendor@solartech.com | password123 | vendor | SolarTech vendor |
| vendor@powercell.com | password123 | vendor | PowerCell vendor |
| afam@example.com | password123 | member | Regular user |
| chioma@example.com | password123 | member | Regular user |

---

## pgAdmin (Database UI)

If you used Docker Compose, pgAdmin is available at `http://localhost:5050`

**Login:**
- Email: `admin@savetogether.com`
- Password: `admin123`

**Add Server:**
1. Right-click "Servers" → Register → Server
2. **General tab:**
   - Name: `Save Together`
3. **Connection tab:**
   - Host: `postgres` (if using Docker) or `localhost`
   - Port: `5432`
   - Database: `save_together`
   - Username: `postgres`
   - Password: `dev123`

---

## Common Commands

```bash
# Start database (Docker)
docker-compose up -d

# Stop database (Docker)
docker-compose down

# View database logs
docker-compose logs postgres

# Reset database (WARNING: Deletes all data!)
npm run reset

# Start backend in dev mode (auto-restart)
npm run dev

# Start backend in production mode
npm start

# Run migrations only
npm run migrate

# Seed data only
npm run seed
```

---

## Troubleshooting

### ❌ "ECONNREFUSED" or "Connection refused"

**Problem:** PostgreSQL is not running

**Solution:**
```bash
# Docker
docker-compose up -d

# Native macOS
brew services start postgresql@15

# Native Linux
sudo systemctl start postgresql
```

---

### ❌ "database does not exist"

**Problem:** Database not created

**Solution:**
```bash
psql -U postgres -c "CREATE DATABASE save_together;"
```

---

### ❌ "password authentication failed"

**Problem:** Wrong password in `.env`

**Solution:** Check your PostgreSQL password and update `.env`:
```env
DB_PASSWORD=your_actual_password
```

---

### ❌ "Port 5432 already in use"

**Problem:** Another PostgreSQL instance is running

**Solution:**
```bash
# Find what's using port 5432
lsof -i :5432

# Stop other PostgreSQL instance or change port in .env
DB_PORT=5433
```

---

### ❌ "relation does not exist"

**Problem:** Tables not created

**Solution:**
```bash
npm run migrate
```

---

## Next Steps

1. ✅ Backend is running
2. 🎨 Update your React frontend to call the API
3. 🔧 Customize endpoints for your needs
4. 📚 Read `README.md` for API documentation
5. 🚀 Build amazing features!

---

## Need Help?

- Check `README.md` for full API documentation
- View `src/db/schema.sql` to see database structure
- Look at `src/routes/*.js` to see all endpoints
- Examine `src/db/seed.js` to see sample data

**You have complete control over every line of code!** 🎉
