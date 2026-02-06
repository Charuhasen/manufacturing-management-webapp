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
- Framework: **Next.js (App Router)**
- Language: **TypeScript (strict)**
- Backend & DB: **Supabase (PostgreSQL, Auth, Storage, RLS)**
- UI Components: **shadcn/ui**
- Styling: Tailwind CSS
- Runtime: Node.js

Assume a **production-grade SaaS-style application** unless explicitly stated otherwise.

---

## Project Structure & Architecture

### App Router Rules
- Use `/app` directory exclusively
- Default to **Server Components**
- Use `"use client"` only when required (forms, interactivity, browser APIs)

### Recommended Structure
/app
/(auth)
/(marketing)
/(dashboard)
/api
/lib
/supabase
/auth
/db
/services
/utils
/components
/ui # shadcn/ui (do not modify directly)
/shared # reusable composed components
/hooks
/types
/config


Rules:
- **No business logic in React components**
- **No database calls inside components**
- All Supabase access must go through `/lib` or `/services`
- UI components must remain presentational

---

## Supabase Usage Rules

### Supabase Clients
- Use **separate Supabase clients** for:
  - Server-side (service role or server client)
  - Client-side (anon public client)
- Never expose service role keys to the client
- Always scope clients correctly (server vs browser)

### Database Access
- Treat Supabase as the **source of truth**
- Prefer typed queries
- Centralize database logic in `/lib/db` or `/services`

Never:
- Query Supabase directly inside route handlers or components
- Duplicate query logic
- Bypass Row Level Security (RLS)

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

## Authentication & Authorization
- Use Supabase Auth for authentication
- Never trust client claims alone
- Revalidate sessions server-side when required

Authorization:
- Must be explicit
- Role-based or permission-based
- Enforced before data access

Never:
- Assume logged-in users are authorized
- Perform authorization checks only in the UI

---

## API Design (Next.js Route Handlers)

### API Philosophy
- RESTful, predictable, minimal
- One responsibility per endpoint
- Clear and consistent response shapes

Rules:
- Validate all input (Zod or equivalent)
- Use correct HTTP status codes
- Handle errors explicitly
- Log server-side errors safely

Response shape:
```ts
{
  success: boolean
  data?: T
  error?: string
}
Never:

Return raw Supabase errors to clients

Leak stack traces or internal identifiers

Mix database logic directly into route handlers

Security Best Practices
Security is non-negotiable.

You must:

Validate and sanitize all inputs

Use secure cookies and headers

Protect API routes properly

Prevent XSS, CSRF, injection attacks

Never:

Store secrets in client code

Hardcode API keys

Expose Supabase service role keys

Rely on obscurity for security

Server vs Client Components
Default to Server Components

Use Client Components only for:

Forms

Controlled inputs

Animations

Browser-only APIs

Rules:

Sensitive data must never reach the client unnecessarily

Data fetching belongs on the server

Minimize client-side JavaScript

shadcn/ui Usage Rules
Use shadcn/ui components where appropriate

Compose components instead of rewriting base primitives

Do not modify shadcn/ui source files directly

Extend via composition and wrappers

Rules:

Keep UI logic separate from business logic

Use accessible components correctly

Maintain consistent spacing, typography, and layout

Performance & Optimization
You must:

Use caching and revalidation appropriately

Avoid unnecessary re-fetching

Optimize images and assets

Use streaming and loading states where useful

Never:

Fetch the same data multiple times without reason

Block rendering with avoidable synchronous work

Push heavy logic to the client

Error Handling
Handle expected errors explicitly

Fail gracefully

Provide user-friendly messages

Log internal errors securely

Rules:

Use error boundaries where applicable

Do not expose implementation details to users

Code Quality & TypeScript
Use descriptive names

Keep functions small and focused

Prefer composition over inheritance

No dead code

No commented-out logic

TypeScript rules:

No any

Strongly type Supabase responses

Explicit return types for public functions

Testing Expectations
Where applicable:

Unit test business logic

Test API routes independently

Avoid testing UI implementation details

Dependency Management
Introduce new dependencies only with justification

Prefer native or existing solutions

Avoid large libraries for trivial problems

Documentation
Comment why, not what

Document non-obvious decisions

Keep architectural notes accurate