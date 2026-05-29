# Changelog

## v1.0.0 — 2026-05-29

First production release of **DASMOTICKET** — Iloilo City Government IT Helpdesk & Ticketing System.

### Features
- **Authentication** — PBKDF2 password hashing, HS256 JWT (8h), silent refresh with 5-min proactive timer and 401 interceptor, 1-hour grace-window refresh endpoint
- **Role-based access** — `employee`, `it_staff`, `admin` with enforced server-side guards on every route
- **Tickets** — full CRUD, category/priority/status filters, pagination, assignment to IT staff, input length validation (title ≤ 200, description ≤ 5000)
- **Ticket Notes** — internal/external threaded notes per ticket
- **Repair Schedules** — Onsite/Offsite scheduling with calendar view
- **Surveys** — post-resolution 1–5 star ratings with stats
- **Admin Panel** — user management, department management, audit log timeline
- **Audit Logs** — every create/update/login/refresh event recorded with actor, IP, old/new values
- **Dashboard** — live stats (open, in-progress, resolved today, critical)

### Security hardening
- CORS wildcard fallback removed — hard-fail if `CORS_ORIGIN` unset
- Rate limiter DDL moved from runtime to `schema.sql`
- Input length guards at both API and DB (`CHECK` constraints)
- Seed admin row removed — first admin created via `POST /api/setup` + `SETUP_KEY`
- Security headers on every response (HSTS, CSP, X-Frame-Options, etc.)
- Setup endpoint tombstoned (returns 404)

### Infrastructure
- Cloudflare Pages + D1 + Workers (edge functions)
- Vite + React + TypeScript frontend
- JetBrains Mono / neumorphic blueprint design system

### Known remaining items (post-v1.0)
- `POST /tickets` per-user rate limiting
- CSP nonce (currently uses `unsafe-inline`)
- `DELETE /departments` orphan-ticket guard
