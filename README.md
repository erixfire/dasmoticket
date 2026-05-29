# DASMO Ticket System

IT Support Ticketing Portal for the **Iloilo City Government — DASMO Office**, built on Cloudflare Pages + D1.

> **v1.0** — All phases complete. Full-stack, production-ready.

---

## Features

### By role

| Feature | Employee | IT Staff | Admin |
|---|:---:|:---:|:---:|
| Submit & track own tickets | ✅ | ✅ | ✅ |
| View & manage all tickets | — | ✅ | ✅ |
| Add internal/public notes | — | ✅ | ✅ |
| Repair scheduling | — | ✅ | ✅ |
| Customer satisfaction surveys | — | ✅ | ✅ |
| Survey analytics | — | ✅ | ✅ |
| User management | — | — | ✅ |
| Department management | — | — | ✅ |
| Audit log viewer | — | — | ✅ |
| Notifications | ✅ | ✅ | ✅ |

### Application pages

- **Dashboard** — live ticket stats, recent activity, quick actions
- **Tickets** — paginated list with filters (status, category, priority, search)
- **Ticket Detail** — full-page view with notes timeline, status controls, assignment
- **Create Ticket** — structured full-page form with drag-and-drop attachment support
- **Schedule** — repair scheduling calendar (Onsite / Offsite), confirm / cancel flows
- **Survey Stats** — rating distribution, average score, response history
- **Notifications** — system-wide alerts per user
- **Settings** — profile, password change
- **Admin Panel** — Users tab, Departments tab, Audit Logs tab

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Routing | React Router v6 |
| Backend | Cloudflare Pages Functions (edge Workers) |
| Database | Cloudflare D1 (serverless SQLite) |
| Auth | JWT — HS256, RBAC (Employee / IT Staff / Admin) |
| Styling | CSS Modules — neumorphic design system |
| Deployment | Cloudflare Pages via GitHub push |

---

## Project Structure

```
dasmoticket/
├── functions/              # Cloudflare Pages Functions (backend)
│   ├── _middleware.ts      # CORS + env typing
│   ├── lib/
│   │   ├── auth.ts         # JWT verify, requireAuth, requireRole
│   │   ├── db.ts           # All D1 query helpers
│   │   ├── crypto.ts       # bcrypt-compatible password hashing (Web Crypto)
│   │   ├── response.ts     # jsonResponse / errorResponse helpers
│   │   └── rateLimit.ts    # KV-based rate limiting
│   └── api/
│       ├── auth/           # POST /login, POST /logout, POST /change-password
│       ├── tickets/        # GET|POST /tickets, GET|PATCH /tickets/:id
│       ├── tickets/[id]/notes/  # GET|POST /tickets/:id/notes
│       ├── users/          # GET|POST /users, PATCH /users/:id
│       ├── departments/    # GET|POST /departments, PATCH|DELETE /departments/:id
│       ├── schedules/      # Scheduling CRUD
│       ├── surveys/        # Survey submit + stats
│       ├── dashboard/      # Aggregated stats endpoint
│       └── setup/          # One-time admin bootstrap
├── src/                    # React frontend
│   ├── components/         # Shared UI components
│   │   └── ui/             # PageHeader, EmptyState, SkeletonTable, toast, etc.
│   ├── pages/              # One file per route
│   ├── context/            # AuthContext (JWT decode, login/logout)
│   ├── lib/
│   │   ├── api.ts          # Typed fetch wrapper for all endpoints
│   │   └── utils.ts        # Helpers
│   └── types/              # Shared TypeScript interfaces
├── schema.sql              # Full D1 schema
├── migrations/             # Schema migration files
├── wrangler.toml           # Cloudflare Pages + D1 binding config
└── .env.example            # Required environment variables
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) — `npm i -g wrangler`
- A Cloudflare account

### 1. Clone and install

```bash
git clone https://github.com/erixfire/dasmoticket.git
cd dasmoticket
npm install
```

### 2. Create a D1 database

```bash
wrangler d1 create dasmoticket-db
```

Copy the `database_id` from the output and paste it into `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "dasmoticket-db"
database_id = "PASTE_YOUR_ID_HERE"
```

### 3. Initialize the schema

```bash
npm run db:init
```

### 4. Set up local environment variables

```bash
cp .env.example .dev.vars
```

Edit `.dev.vars`:

```env
JWT_SECRET=your-super-secret-key-min-32-chars
CORS_ORIGIN=http://localhost:5173
ENVIRONMENT=development
```

### 5. Run locally (full-stack)

```bash
npm run build        # Build frontend first
npm run pages:dev    # Serve with Pages Functions + D1 on :8788
```

Or run frontend only (no backend):

```bash
npm run dev          # Vite dev server on :5173
```

### 6. Bootstrap the first admin user

After `pages:dev` is running, visit:

```
http://localhost:8788/api/setup
```

This one-time endpoint creates the initial `admin` account and sample departments. Check `functions/api/setup.ts` for the default credentials and change them immediately after first login.

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Vite frontend dev server |
| `npm run build` | TypeScript check + Vite production build |
| `npm run preview` | Preview production build locally |
| `npm run typecheck` | TypeScript type-check only (no emit) |
| `npm run pages:dev` | Full-stack local dev (Functions + D1) |
| `npm run db:init` | Apply `schema.sql` to local D1 |
| `npm run db:init:remote` | Apply `schema.sql` to production D1 |

---

## Deployment

1. Push to `main` on GitHub
2. In [Cloudflare Pages](https://pages.cloudflare.com/), connect the repo
3. Set build command: `npm run build`, output directory: `dist`
4. Add environment variables in Pages → Settings → Environment Variables:
   - `JWT_SECRET` — strong random secret (min 32 chars)
   - `CORS_ORIGIN` — your production domain (e.g. `https://ticket.iloilocity.gov.ph`)
   - `ENVIRONMENT` — `production`
5. Bind the D1 database under Pages → Settings → Functions → D1 bindings (`DB`)
6. Run `npm run db:init:remote` to apply the schema to production D1

Subsequent pushes to `main` auto-deploy via Cloudflare's GitHub integration.

---

## Roles & Permissions

| Role | Description |
|---|---|
| `employee` | City staff — submits and tracks their own tickets |
| `it_staff` | DASMO IT technicians — manages tickets, schedules, surveys |
| `admin` | Full access including user, department, and audit log management |

Role is set at the user level in the database. Admins can promote/demote users via the Admin Panel.

---

## API Overview

All endpoints are under `/api/`. Authentication uses `Authorization: Bearer <token>` headers.

| Method | Path | Role | Description |
|---|---|---|---|
| POST | `/api/auth/login` | Public | Get JWT token |
| GET | `/api/tickets` | Any | List tickets (scoped by role) |
| POST | `/api/tickets` | Any | Create ticket |
| GET | `/api/tickets/:id` | Any | Get ticket + notes |
| PATCH | `/api/tickets/:id` | IT Staff+ | Update status/assignment |
| GET | `/api/users` | Admin | List users |
| POST | `/api/users` | Admin | Create user |
| PATCH | `/api/users/:id` | Admin | Update role / active status |
| GET | `/api/departments` | Any | List departments |
| POST | `/api/departments` | Admin | Create department |
| PATCH | `/api/departments/:id` | Admin | Rename department |
| DELETE | `/api/departments/:id` | Admin | Delete department |
| GET | `/api/dashboard` | Any | Aggregated stats |
| GET | `/api/surveys/stats` | IT Staff+ | Survey analytics |

---

## License

Internal use — Iloilo City Government, DASMO Office.
