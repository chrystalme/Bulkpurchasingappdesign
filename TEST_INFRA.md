# E2E Test Infra: Bulk Purchasing App

## Test Philosophy
- Opaque-box, requirement-driven.
- Automated Jest test suites verifying REST API endpoints, real-time Socket.IO synchronization, permission boundaries, and database integrity.

## Feature Inventory Coverage
| # | Feature | Source | Automated Test Suite |
|---|---------|--------|----------------------|
| 1 | Group Cart Persistence | ORIGINAL_REQUEST §R1 | `backend/__tests__/cart.test.js` |
| 2 | Group Cart Multi-Member Sync | ORIGINAL_REQUEST §R1 | `backend/__tests__/cart.test.js` |
| 3 | Group-Vendor Chat Visibility | ORIGINAL_REQUEST §R2 | `backend/__tests__/chat.visibility.test.js` |
| 4 | Group-Vendor Send Permissions | ORIGINAL_REQUEST §R2 | `backend/__tests__/chat.visibility.test.js` |
| 5 | Seed Realignment & Integrity | ORIGINAL_REQUEST §R3 | `backend/__tests__/seed.integrity.test.js` |
| 6 | Frontend Compilation | Acceptance Criteria | `npm run build` |

## Test Architecture
- Test Runner: Jest (ESM mode: `node --experimental-vm-modules node_modules/.bin/jest`)
- Database Environment: PostgreSQL database managed via `npm run reset`
- Socket.IO Test Harness: Real in-memory HTTP and Socket.IO server utilizing `socket.io-client` with JWT auth (mirroring `chat.socket.test.js`)
