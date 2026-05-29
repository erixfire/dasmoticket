# DASMO IT Ticketing System

> Iloilo City Government — IT Support Portal  
> Powered by **Cloudflare Pages** + **Cloudflare Functions** + **Cloudflare D1**

---

## Repository Structure

```
dasmoticket/
├── functions/                   # Cloudflare Functions (serverless API)
│   ├── api/
│   │   ├── _middleware.js       # JWT auth + CORS middleware
│   │   ├── auth/
│   │   │   └── login.js         # POST /api/auth/login
│   │   ├── tickets/
│   │   │   ├── index.js         # GET/POST /api/tickets
│   │   │   └── [id].js          # GET/PATCH /api/tickets/:id
│   │   ├── schedules/
│   │   │   └── index.js         # POST /api/schedules
│   │   ├── surveys/
│   │   │   └── index.js         # GET/POST /api/surveys
│   │   └── dashboard/
│   │       └── stats.js         # GET /api/dashboard/stats
│   └── utils/
│       ├── auth.js              # JWT sign/verify helpers
│       └── db.js                # D1 query abstractions
├── src/                         # Frontend (Vanilla JS, no build step)
│   ├── index.html
│   ├── style.css
│   ├── main.js                  # Router entry point
│   ├── components/
│   │   └── layout.js            # Sidebar + topbar shell
│   ├── pages/
│   │   ├── login.js
│   │   ├── dashboard.js
│   │   ├── tickets.js
│   │   ├── newTicket.js
│   │   └── ticketDetail.js      # Schedule + survey UIs
│   └── utils/
│       └── auth.js              # Token management + apiFetch
├── schema.sql                   # D1 database schema
├── wrangler.toml                # Cloudflare Workers/Pages config
└── README.md
```

---

## Quick Start

### 1. Install Wrangler
```bash
npm install -g wrangler
wrangler login
```

### 2. Create D1 Database
```bash
wrangler d1 create dasmoticket-db
# Copy the database_id into wrangler.toml
```

### 3. Apply Schema
```bash
wrangler d1 execute dasmoticket-db --file=./schema.sql
```

### 4. Run Locally
```bash
wrangler pages dev ./src --d1=DB=dasmoticket-db
```

### 5. Deploy to Cloudflare Pages
```bash
# Connect this GitHub repo to Cloudflare Pages dashboard
# Build output directory: src (no build step required)
# Set Environment Variables: JWT_SECRET, CORS_ORIGIN
```

---

## RBAC Roles

| Role | Permissions |
|------|-------------|
| `employee` | Submit tickets, view own tickets, propose schedules, submit surveys |
| `it_staff` | View all tickets, update status, add notes, confirm schedules |
| `admin` | Full access including dashboard stats and user management |

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `JWT_SECRET` | Strong secret key for JWT signing |
| `CORS_ORIGIN` | Production domain (e.g. `https://it-support.iloilocity.gov.ph`) |
| `EXPIRY_HOURS` | JWT expiry in hours (default: 8) |

---

## Domain Readiness

To deploy under `it-support.iloilocity.gov.ph` or `iloilocity.app`:
1. Add a custom domain in **Cloudflare Pages → Custom Domains**
2. Update `CORS_ORIGIN` environment variable
3. HTTPS is handled automatically by Cloudflare

---

*Built for DASMO — Iloilo City Government IT Division*
