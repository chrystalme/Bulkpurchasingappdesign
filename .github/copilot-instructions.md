# Copilot Instructions

## Build, Lint, and Test

### Frontend (root directory)

```bash
npm run build          # Vite production build (TypeScript + React)
npm run dev            # Dev server on http://localhost:3000
npm run lint           # ESLint (flat config, eslint.config.mts)
npm run lint:fix       # ESLint with auto-fix
```

### Backend (`backend/` directory)

```bash
npm run dev            # Nodemon dev server on http://localhost:3001
npm run test           # Jest (ESM mode, --forceExit --detectOpenHandles)
npm run test:watch     # Jest in watch mode
npm run migrate        # Run database migrations
npm run seed           # Seed database with sample data
npm run reset          # Reset database
```

Run a single backend test file:
```bash
cd backend && node --experimental-vm-modules node_modules/.bin/jest __tests__/chat.controller.test.js --forceExit --detectOpenHandles
```

### Pre-commit

A Husky pre-commit hook runs `npm test` (currently a no-op placeholder). The CI lint workflow runs on PRs to `main` and `develop`.

## Architecture

This is a full-stack bulk purchasing app ("Save Together, Buy Smarter") with two independent npm projects:

- **Frontend** (root): React 18 + TypeScript SPA built with Vite. Uses shadcn/ui (Radix primitives + Tailwind CSS).
- **Backend** (`backend/`): Node.js/Express REST API + Socket.IO server. ES Modules (`"type": "module"`). PostgreSQL via `pg` pool.

The frontend runs on port 3000, the backend on port 3001. The frontend API client (`src/lib/api.ts`) hardcodes `http://localhost:3001/api`.

### State Management

Redux Toolkit with `redux-persist` is the primary state layer. Key patterns:

- **Slices** live in `src/store/slices/` — one per domain (auth, groups, products, orders, escrow, chat, cart, navigation, users, vendors).
- **Typed hooks**: Always use `useAppDispatch` and `useAppSelector` from `src/store/hooks.ts`, never raw `useDispatch`/`useSelector`.
- **Persisted slices**: auth, navigation, cart, and chat are persisted to localStorage via `redux-persist`.
- **AuthContext** (`src/contexts/AuthContext.tsx`) is a thin wrapper over the Redux auth slice for backward compatibility. Use `useAuth()` for auth state.
- **Selectors** live in `src/store/selectors/` — use memoized selectors for derived data.

### Navigation

There is **no router library**. Navigation uses a Redux-managed `Screen` type (union of string literals defined in `App.tsx`). Screen switching is done via `dispatch(navigate({ screen: 'screen-name' }))`. The `navigationSlice` persists `currentScreen` and `selectedGroupId` across reloads.

### Authentication

- JWT-based with access + refresh tokens. Tokens stored in `localStorage` under keys `auth_token` and `refresh_token`.
- Backend auth middleware (`backend/middleware/auth.js`): `authenticateToken` verifies JWT and attaches `req.user`. `requireRole(...roles)` checks RBAC.
- Four roles: `superUser`, `admin`, `vendor`, `member`.
- Frontend authorization helpers in `src/lib/authorization.ts` mirror backend role checks for UI/UX only — backend always enforces.

### Real-time Chat

Socket.IO provides real-time messaging. Architecture:

- **Backend**: `backend/socket/chat.socket.js` handles events; `backend/controllers/chat.controller.js` has business logic; REST routes in `backend/routes/chat.routes.js`.
- **Frontend**: `src/lib/socket/chatSocket.ts` is the Socket.IO client wrapper; `src/store/middleware/chatSocketMiddleware.ts` is Redux middleware that bridges Socket.IO events to Redux actions; `src/hooks/useChat.ts` is the main hook for components.
- Two chat types: **group-internal** (all members read/write) and **group-vendor** (only group admin can message vendor; other members read-only).

### API Client

`src/lib/api.ts` exports a singleton `apiClient` class with namespaced methods (e.g., `apiClient.auth.login()`, `apiClient.products.getAll()`). It handles token refresh automatically on 401s. Chat-specific REST calls are in `src/lib/api/chatApi.ts`.

## Conventions

- **React imports**: Keep `import React` on line 1 of every React component file.
- **Path alias**: `@` maps to `src/` in Vite config (e.g., `import { Button } from '@/components/ui/button'`).
- **UI components**: shadcn/ui components live in `src/components/ui/`. These are generated files — edit with care.
- **Sanitization**: Use `sanitizeHTML` or `sanitizeText` from `src/lib/sanitizer.ts` (DOMPurify) for user-generated content.
- **Backend modules**: All backend files use ES Module syntax (`import`/`export`). Route files follow `*.routes.js` naming; controllers follow `*.controller.js`.
- **Database**: Raw SQL via `pg` pool (no ORM). Schema in `backend/db/schema.sql`, migrations in `backend/migrations/` (numbered sequentially).
- **Type definitions**: Frontend types are organized by domain in `src/lib/types/` (e.g., `auth.types.ts`, `chat.types.ts`, `group.types.ts`).
- **Security middleware**: Backend uses helmet, rate limiting (`express-rate-limit`), CSRF protection, request timeouts, and compression.


## Workflow Orchestration

### 1. Plan Mode Default

- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions).
- If something goes sideways, stop and re-plan immediately — don’t keep pushing.
- Use plan mode for verification steps, not just building.
- Write detailed specs upfront to reduce ambiguity.

### 2. Subagent Strategy

- Use subagents liberally to keep main context window clean.
- Offload research, exploration, and parallel analysis to subagents.
- For complex problems, throw more compute at it via subagents.
- One task per subagent for focused execution.

### 3. Self-Improvement Loop

- After ANY correction from the user: update `tasks/lessons.md` with the pattern.
- Write rules for yourself that prevent the same mistake.
- Ruthlessly iterate on these lessons until mistake rate drops.
- Review lessons at session start for relevant project.

### 4. Verification Before Done

- Never mark a task complete without proving it works.
- Diff behavior between main and your changes when relevant.
- Ask yourself: “Would a staff engineer approve this?”
- Run tests, check logs, demonstrate correctness.

### 5. Demand Elegance (Balanced)

- For non-trivial changes: pause and ask “is there a more elegant way?”
- If a fix feels hacky: “Knowing everything I know now, implement the elegant solution.”
- Skip this for simple, obvious fixes — don’t over-engineer.
- Challenge your own work before presenting it.

### 6. Autonomous Bug Fixing

- When given a bug report: just fix it. Don’t ask for hand-holding.
- Point at logs, errors, failing tests — then resolve them.
- Zero context switching required from the user.
- Go fix failing CI tests without being told how.

## Task Management

1. **Plan First**: Write plan to `tasks/todo.md` with checkable items.
2. **Verify Plan**: Check in before starting implementation.
3. **Track Progress**: Mark items complete as you go.
4. **Explain Changes**: High-level summary at each step.
5. **Document Results**: Add review section to `tasks/todo.md`.
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections.

### Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what’s necessary. Avoid introducing bugs.
