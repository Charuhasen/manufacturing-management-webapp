# Claude Code Instructions — Next.js + Supabase Web Application

## Role & Engineering Standard
You are acting as a **Senior Software Engineer** with real-world production experience.

You must:
- Design systems for correctness, security, scalability, and maintainability
- Follow modern industry best practices
- Make explicit architectural decisions
- Avoid shortcuts that introduce technical debt

You must **push back** against:
- Insecure patterns
- Poor abstractions
- Anti-patterns
- Unnecessary complexity

---

## Core Tech Stack
- Framework: **Next.js 16.1.6 (App Router, Turbopack)**
- Language: **TypeScript (strict)**
- Backend & DB: **Supabase (PostgreSQL, Auth, Storage, RLS)**
- UI Components: **shadcn/ui (New York style)**
- Styling: **Tailwind CSS v4**
- Runtime: Node.js
- Auth: **Supabase Auth via `@supabase/ssr`**

Assume a **production-grade SaaS-style application** unless explicitly stated otherwise.

---

## Project Structure & Architecture

### Actual Project Layout
```
/app
  /login                          # Login page (client component, email/password)
  /dashboard
    layout.tsx                    # Protected layout — auth check, sidebar, idle timeout
    page.tsx                      # Dashboard welcome page
    loading.tsx                   # Loading skeleton
    sidebar-nav.tsx               # Role-based sidebar navigation (client)
    logout-button.tsx             # Logout handler (client)
    idle-timeout.tsx              # 20s warning + 10s auto-logout on inactivity (client)
    /production-run
      page.tsx                    # Server — fetches products, machines, run history
      production-run-client.tsx   # Client — tabs, charts, run list
      new-production-run-dialog.tsx
      production-run-detail-dialog.tsx
    /inventory
      page.tsx                    # Server — stock with filtering and reorder alerts
      inventory-table.tsx         # Client — categorized stock display
      stock-adjustment-dialog.tsx
      stock-type-filter.tsx
      reorder-alerts.tsx
    /stock-ledger
      page.tsx                    # Server — last 100 stock transactions
    /machinery
      page.tsx                    # Server — machines + events with role-based permissions
      machinery-client.tsx        # Client — tabs for machines and events
      log-event-dialog.tsx        # Dialog for creating machine events
      event-detail-dialog.tsx     # Dialog for event details + resolution
    /product-manager              # ADMIN only
      page.tsx                    # Server — lists all products
      product-table.tsx
      edit-product-dialog.tsx
    /machine-manager              # ADMIN only
      page.tsx                    # Server — lists all machines
      machine-table.tsx
      edit-machine-dialog.tsx
  /api
    /machines/route.ts            # PATCH — edit machines (ADMIN only)
    /products/route.ts            # PATCH — edit products (ADMIN only)
    /production-runs/route.ts     # POST — create production runs (validates stock, creates ledger entries)
    /machine-events/route.ts      # GET/POST/PATCH/DELETE — machine events (POST/PATCH/DELETE require ADMIN or SUPERVISOR)
    /stock-adjust/route.ts        # POST — manual stock adjustments with ledger trail
/lib
  /auth
    role.ts                       # UserRole type, getUserRole(), isAdmin(), isAdminOrSupervisor()
  /supabase
    server.ts                     # Server-side Supabase client with cookies
    client.ts                     # Browser-side Supabase client (anon key)
    proxy.ts                      # updateSession() for proxy.ts — uses getClaims()
  utils.ts                        # cn() — clsx + tailwind-merge
/components
  /ui                             # shadcn/ui primitives (do not modify directly)
  /shared
    print-button.tsx              # Print icon button (client)
/types
  production-run.ts               # FinishedGoodProduct, RawMaterialProduct, MasterBatchProduct, Machine, ProductionRunRow
/proxy.ts                         # Next.js 16 request proxy (replaces middleware.ts)
/schema.sql                       # Full database schema — must be kept in sync with DB
```

### App Router Rules
- Use `/app` directory exclusively
- Default to **Server Components**
- Use `"use client"` only when required (forms, interactivity, browser APIs)

### Rules
- **No business logic in React components**
- **No database calls inside components**
- All Supabase access must go through `/lib` or `/services`
- UI components must remain presentational

---

## Authentication & Authorization

### Authentication Flow
1. User logs in at `/login` (client component, email/password via Supabase Auth)
2. Session stored in cookies via `@supabase/ssr`
3. `proxy.ts` validates session on every request using `getClaims()`
4. Dashboard layout checks `getUser()` server-side and redirects if unauthenticated

### Authorization Model
- User roles stored in `users_profile` table
- Roles: `ADMIN`, `OPERATOR`, `SUPERVISOR`, `MAINTENANCE`
- Helpers in `lib/auth/role.ts`: `getUserRole()`, `isAdmin()`, `isAdminOrSupervisor()`

### Access Control Matrix
| Resource | ADMIN | SUPERVISOR | OPERATOR | MAINTENANCE |
|---|---|---|---|---|
| Dashboard, Production Runs, Inventory, Stock Ledger | ✅ | ✅ | ✅ | ✅ |
| Machinery page (view) | ✅ | ✅ | ✅ | ✅ |
| Machine events (create/edit/delete) | ✅ | ✅ | ❌ | ❌ |
| Product Manager | ✅ | ❌ | ❌ | ❌ |
| Machine Manager | ✅ | ❌ | ❌ | ❌ |

### Rules
- Never trust client claims alone
- Revalidate sessions server-side
- Authorization enforced in **both** API layer and RLS
- Deny access by default

---

## Supabase Usage Rules

### Supabase Clients
- **Server**: `lib/supabase/server.ts` — `createClient()` with cookie management
- **Browser**: `lib/supabase/client.ts` — `createClient()` with anon key
- **Proxy**: `lib/supabase/proxy.ts` — `updateSession()` using `getClaims()`
- Never expose service role keys to the client

### Database Access
- Treat Supabase as the **source of truth**
- Prefer typed queries
- Centralize database logic in `/lib/db` or `/services`

Never:
- Query Supabase directly inside route handlers or components
- Duplicate query logic
- Bypass Row Level Security (RLS)

---

## Database Schema Reference

### Enums
| Enum | Values |
|---|---|
| `machine_status` | ACTIVE, MAINTENANCE, RETIRED, BREAKDOWN, IDLE |
| `process_type` | BLOW_MOULDING, INJECTION_MOULDING, EXTRUSION, THERMOFORMING |
| `product_type` | RAW_MATERIAL, FINISHED_GOOD, MASTER_BATCH, REGRIND_MATERIAL |
| `shift_type` | DAY, NIGHT |
| `unit_of_measure` | pcs, bags |
| `user_role` | ADMIN, OPERATOR, SUPERVISOR, MAINTENANCE |
| `machine_event_type` | FAULT, BREAKDOWN, MAINTENANCE, STATUS_CHANGE |
| `severity_level` | LOW, MEDIUM, HIGH, CRITICAL |
| `incident_type` | FAULT, BREAKDOWN, MAINTENANCE |
| `incident_severity` | LOW, MEDIUM, HIGH, CRITICAL |

### Tables
| Table | Purpose |
|---|---|
| `machines` | Inventory of manufacturing machines |
| `users_profile` | Extended profile data + role for app users |
| `products` | All product types (FG, Raw Material, Master Batch, Regrind) |
| `products_stock` | Current stock levels per product |
| `stock_ledger` | Centralized ledger for all stock movements |
| `production_runs` | Historical production runs and material usage |
| `machine_events` | Machine faults, breakdowns, maintenance, status changes (RLS enabled) |
| `machine_incidents` | Fault/breakdown/maintenance incident records with root cause tracking |
| `machine_status_log` | Audit log of every machine status transition |

### RLS Policies
- `machine_events`: Full CRUD for `authenticated` users

### Functions
- `adjust_stock()` — Atomic stock adjustment with ledger entry (SECURITY DEFINER)

---

## Row Level Security (RLS)
RLS is **mandatory**, not optional.

You must:
- Assume RLS is enabled on all tables
- Design queries that work *with* RLS, not around it
- Enforce authorization at the database level

Rules:
- Auth logic ≠ Authorization logic
- Authorization must exist in **both** API/service layer and RLS
- Deny access by default

---

## API Design (Next.js Route Handlers)

### API Philosophy
- RESTful, predictable, minimal
- One responsibility per endpoint
- Clear and consistent response shapes

### Response Shape
```ts
{
  success: boolean
  data?: T
  error?: string
}
```

### Rules
- Validate all input (Zod or equivalent)
- Use correct HTTP status codes
- Handle errors explicitly
- Log server-side errors safely

Never:
- Return raw Supabase errors to clients
- Leak stack traces or internal identifiers
- Mix database logic directly into route handlers

---

## Security Best Practices
Security is non-negotiable.

You must:
- Validate and sanitize all inputs
- Use secure cookies and headers
- Protect API routes properly
- Prevent XSS, CSRF, injection attacks

Never:
- Store secrets in client code
- Hardcode API keys
- Expose Supabase service role keys
- Rely on obscurity for security

---

## Server vs Client Components
Default to Server Components.

Use Client Components only for:
- Forms and controlled inputs
- Animations
- Browser-only APIs

Rules:
- Sensitive data must never reach the client unnecessarily
- Data fetching belongs on the server
- Minimize client-side JavaScript

---

## shadcn/ui Usage Rules
- Use shadcn/ui components where appropriate
- Compose components instead of rewriting base primitives
- Do not modify shadcn/ui source files directly
- Extend via composition and wrappers
- Keep UI logic separate from business logic
- Use accessible components correctly
- Maintain consistent spacing, typography, and layout

---

## Performance & Optimization
You must:
- Use caching and revalidation appropriately
- Avoid unnecessary re-fetching
- Optimize images and assets
- Use streaming and loading states where useful

Never:
- Fetch the same data multiple times without reason
- Block rendering with avoidable synchronous work
- Push heavy logic to the client

---

## Error Handling
- Handle expected errors explicitly
- Fail gracefully
- Provide user-friendly messages
- Log internal errors securely
- Use error boundaries where applicable
- Do not expose implementation details to users

---

## Code Quality & TypeScript
- Use descriptive names
- Keep functions small and focused
- Prefer composition over inheritance
- No dead code or commented-out logic

TypeScript rules:
- No `any`
- Strongly type Supabase responses
- Explicit return types for public functions

---

## Testing Expectations
Where applicable:
- Unit test business logic
- Test API routes independently
- Avoid testing UI implementation details

---

## Dependency Management
- Introduce new dependencies only with justification
- Prefer native or existing solutions
- Avoid large libraries for trivial problems

---

## Documentation
- Comment why, not what
- Document non-obvious decisions
- Keep architectural notes accurate

---

## Mandatory Self-Update Rules

### On any logic or code change:
After every feature addition, bug fix, refactor, or behavioral change to the codebase, you **must** update this `CLAUDE.md` file to reflect the change. This includes but is not limited to:
- New or modified API routes
- New or modified pages/components with business logic
- Changes to authentication or authorization flows
- New services, hooks, or utility functions with meaningful logic
- Changes to the project structure or architectural patterns

Add or update relevant entries in the sections above, or append to the **Change Log** section below.

### On any database schema change:
Whenever a migration is applied or the database schema is modified (new tables, columns, enums, indexes, RLS policies, functions), you **must**:
1. Update the local `schema.sql` file at the project root to match the current DB state
2. Update this `CLAUDE.md` file to document the change

These updates are **not optional** — they are part of completing the task.

---

## Change Log
<!-- Append entries here in reverse-chronological order: newest first -->
<!-- Format: **YYYY-MM-DD** — Brief description of what changed -->

**2026-02-17** — Synced CLAUDE.md with full codebase state: added project layout, auth flow, access control matrix, DB schema reference, all API routes, and all pages/components.

**2026-02-17** — Added `machine_incidents` table, `machine_status_log` table, `incident_type` and `incident_severity` enums, extended `machine_status` enum with `BREAKDOWN` and `IDLE`, added RLS policies on `machine_events`, and synced `schema.sql` to match current DB state.
