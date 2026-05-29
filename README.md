# DASMO Ticket System

IT Ticketing System for the **Iloilo City Government**, built on Cloudflare Pages + D1.

## Tech Stack

- **Frontend:** React 18 + Vite + TypeScript
- **Backend:** Cloudflare Functions (Pages Functions)
- **Database:** Cloudflare D1 (Serverless SQLite)
- **Auth:** JWT-based RBAC (Employee / IT Staff / Admin)
- **Deployment:** Cloudflare Pages via GitHub CI/CD

## Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Create a D1 database
```bash
wrangler d1 create dasmoticket-db
```
Copy the `database_id` output and paste it into `wrangler.toml`.

### 3. Initialize the database schema
```bash
npm run db:init
```

### 4. Set up local environment variables
```bash
cp .env.example .dev.vars
# Edit .dev.vars with your values
```

### 5. Run locally
```bash
npm run dev       # Frontend (http://localhost:5173)
npm run pages:dev # Full stack with Functions + D1
```

## Deployment

1. Push to GitHub
2. Connect repo to Cloudflare Pages in the dashboard
3. Set environment variables in Cloudflare Pages settings
4. Run `npm run db:init:remote` to initialize the production D1 database

## Project Phases

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1 | ✅ Complete | Project foundation, schema, config, base UI |
| Phase 2 | 🔜 Pending | Authentication & RBAC |
| Phase 3 | 🔜 Pending | Ticket CRUD & Dashboard |
| Phase 4 | 🔜 Pending | Repair Scheduling & Surveys |
| Phase 5 | 🔜 Pending | Security Hardening & Domain Readiness |

## Roles

| Role | Access |
|------|--------|
| `employee` | Submit & track own tickets |
| `it_staff` | Manage assigned tickets, scheduling |
| `admin` | Full access, user management, reports |
