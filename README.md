# WB Kanban

A role-based Kanban task and project management system for a team.

## Overview

WB Kanban is a role-based Kanban task and project management system for a
team. It enables Supervisors to create tickets, assign tickets, and monitor
progress, while Employees can view their assigned projects and manage their
own task workflow through an interactive drag-and-drop Kanban board.

The system is intentionally scoped to a single organization setup: one
Supervisor account, one team, and one project with a single Kanban board.

| Role | Capabilities |
|---|---|
| **Supervisor** | Full access: manage employees (add / activate / deactivate / delete), create, edit, assign, move and delete tickets |
| **Employee** | Kanban board only: view, filter, edit and drag tickets through the workflow (no ticket creation or deletion, no employee management) |

## Live Demo

> **Live link:** [https://workbridge-kanban.web.app/](url)

## Test Credentials

> **Credentials:** 

| Role | Email | Password |
|---|---|---|
| Supervisor | `admin@wbkanban.com` | `admin123` |
| Employee | `user@wbkanban.com` | `user1234` |
| Employee | `user2@wbkanban.com` | `user1234` |

Can't create another admin acc using client side.
But server-server allows it, but still need supervisor role auth
endpoint: POST /api/auth/register

---

## Getting Started (Run Locally)

### Prerequisites

- **Node.js 18+** (developed on Node v22)
- **npm**
- A SQL Server database (local SSMS or Azure SQL)

### 1. Environment variables

The `.env` files for both `server/` and `client/` are **not committed** to the
repository. If you want to run the app locally, contact me and I will provide
the environment variables.

> **Contact:**
 _Cell: 09196473239_
 _Email: edwarddanieleviri@gmail.com
 
 Or create your own

`server/.env` contains: `DB_USER`, `DB_PASSWORD`, `DB_SERVER`, `DB_DATABASE`,
`DB_PORT`, `PORT`, `JWT_SECRET`.
`client/.env` contains: `VITE_API` (e.g. `http://localhost:5000/api`).

### 2. Run the backend

```bash
cd server
npm install
npm run dev        # nodemon — API on http://localhost:5000
```

### 3. Run the frontend

```bash
cd client
npm install
npm run dev        # Vite — app on http://localhost:5173
```

### Database note (auto-pause)

The hosted Azure SQL database is serverless and **auto-pauses after ~1 hour of
inactivity**. The first request after a pause can take up to a minute while it
wakes up. The UI detects this automatically ("Database is waking up…"),
retries in the background, and replays your request — no action needed. You
can check readiness anytime at `GET /api/v1/health`.

---

## How to Test the Application

Open the live link `https://workbridge-kanban.web.app` (or `http://localhost:5173` locally) and sign in from the
login page.

### As a Supervisor

1. **Log in** with the Supervisor credentials — you land on the **Dashboard**,
   and the sidebar shows the full menu (Dashboard, Kanban Board, Employees).
2. Go to **Employees**:
   - Add an employee with the **Add Employee** modal (name, email, password).
   - Toggle an employee's active status (deactivated users cannot log in).
   - Delete an employee with confirmation.
3. Open the **Kanban Board**:
   - Click **New Ticket**, fill in title / description / status / priority /
     assignee, and create it — it appears in its column.
   - Use the filter bar to filter by status, priority, assignee, or search.
   - **Drag cards between columns** — the status change persists (refresh to
     confirm) and is recorded in the ticket's history log.
   - Click a card to open its detail modal: view info + history timeline,
     **Edit**, **Assign**, or **Delete** the ticket (delete asks for
     confirmation).
4. Log out from the Avatar Icon in the Header.

### As an Employee

1. **Log in** with Employee credentials — you land **directly on the Kanban
   board**; there is no dashboard.
2. The sidebar shows only the limited employee menu (no Employees page).
3. On the board you can:
   - View all tickets and filter them (including your own assignments).
   - **Drag cards between columns** to move work through the workflow.
   - Open a ticket and **edit** its details.
   - See the full history timeline of each ticket.
4. Note that there is **no New Ticket button and no Delete button** — those
   actions are Supervisor-only, enforced both in the UI and by the backend
   API (the server rejects unauthorized calls even if hit directly).

> Every pull request in this repository includes documentation in its comment
> Initialize frontEnd/BackEnd #7 
> Auth #9
> Employees crud api endpoints(backend) #16
> Team members supervisor's UI #12 #17
> Admin main layout #14 #18
> Tickets crud (backend) #20 #24
> Ticket logs integration #21 #25
> Kanban UI #23 #26

---

## API Documentation

Base URL: `/api` (frontend talks to `VITE_API`, e.g.
`http://localhost:5000/api`).

- All responses follow one format:

  ```json
  { "success": true, "data": { } }
  { "success": false, "message": "Error description." }
  ```

- Authentication uses a **JWT stored in an httpOnly cookie** (`token`), set
  on login and validated by auth middleware on protected routes.
- Role enforcement happens in role middleware on the server.

### Health

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/v1/health` | Public | Liveness probe; verifies DB connectivity (no auth) |

### Users / Auth — `/api/auth`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Supervisor | Create a new user account |
| POST | `/api/auth/login` | Public | Authenticate; sets the JWT cookie |
| POST | `/api/auth/logout` | Authenticated | Clear the session cookie |
| GET | `/api/auth/me` | Authenticated | Get the current logged-in user |

### Employees — `/api/employees` _(Supervisor only)_

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/employees` | Supervisor | List all team members |
| POST | `/api/employees` | Supervisor | Add an employee (creates user + team member). Body: `{ name, email, password }` |
| PATCH | `/api/employees/:id` | Supervisor | Toggle employee active/inactive status (`id` = userId) |
| DELETE | `/api/employees/:id` | Supervisor | Permanently delete the user (`id` = userId) |

### Tickets — `/api/tickets`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/tickets` | Authenticated | List tickets with filtering, sorting, pagination. Query params: `status`, `priority`, `assignee`, `unassigned`, `search`, `sortBy`, `sortDir`, `skip`, `take` |
| POST | `/api/tickets` | Authenticated | Create a ticket. Body: `{ title (3–255 chars), description? (≤5000), status?, priority?, assignedTo? }`. Defaults: status `Backlog`, priority `Medium` |
| GET | `/api/tickets/:id` | Authenticated | Get a single ticket |
| GET | `/api/tickets/:id/history` | Authenticated | Get the ticket's audit log (newest first) |
| PUT | `/api/tickets/:id` | Authenticated | Update ticket details (title, description, priority) |
| PATCH | `/api/tickets/:id/status` | Authenticated | Move a ticket between statuses (drag & drop) |
| PATCH | `/api/tickets/:id/assign` | Authenticated | Assign / unassign a team member |
| DELETE | `/api/tickets/:id` | **Supervisor** | Permanently delete a ticket and its logs |

Valid statuses: `Backlog`, `To Do`, `In Progress`, `In Review`, `Done`.
Valid priorities: `Low`, `Medium`, `High`.

Every mutation (create / update / status / assign / delete) writes an entry to
the `ticketLogs` audit table
---

## Architecture

### Tech Stack

**Frontend**

| Technology | Purpose |
|---|---|
| React 18 + Vite | SPA framework & build tooling |
| React Router v7 | Client-side routing with protected routes |
| Ant Design 5 (+ icons) | UI component library |
| Tailwind CSS v4 | Utility-first styling alongside antd |
| @dnd-kit | Drag-and-drop for the Kanban board |
| Axios | HTTP client (+ wake-database retry interceptor) |
| React Context + useReducer | Auth state & ticket board state |
| Recharts | Charts for reports |
| ESLint | Code quality |

**Backend**

| Technology | Purpose |
|---|---|
| Express (Node.js, ES modules) | REST API |
| mssql | Azure SQL / SQL Server driver with connection pooling |
| jsonwebtoken + bcryptjs | JWT auth & password hashing |
| cookie-parser | httpOnly JWT cookie handling |
| helmet, cors, dotenv | Security headers, CORS, environment config |

**Database:** Azure SQL Serverless (auto-pause), 4 tables:
`users`, `teamMembers`, `tickets`, `ticketLogs`.

### File Structure

```
server/
├── src/
│   ├── server.js              # entry point — DB connect then listen (:5000)
│   ├── app.js                 # Express app — middleware + route mounting
│   ├── api/
│   │   ├── auth/              # login / logout / me / register
│   │   │   ├── authRoute.js
│   │   │   ├── authController.js
│   │   │   └── authServices.js
│   │   ├── employees/         # team member management (Supervisor)
│   │   │   ├── employeesRoute.js
│   │   │   ├── employeesController.js
│   │   │   └── employeesServices.js
│   │   ├── tickets/           # tickets CRUD + audit logs
│   │   │   ├── ticketsRoute.js
│   │   │   ├── ticketsController.js
│   │   │   ├── ticketServices.js
│   │   │   └── ticketLogServices.js
│   │   └── health/
│   │       └── healthRoute.js # GET /api/v1/health (no auth)
│   ├── config/
│   │   ├── db.js              # pool config, connect retry, wake logic
│   │   └── jwt.js             # JWT secret/expiry
│   └── middlewares/
│       ├── authMiddleware.js  # JWT verification (cookie)
│       ├── roleMiddleware.js  # role checks (Supervisor/Employee)
│       └── errorMiddleware.js # central errors + DB-wake 503 handling
├── package.json
└── .env

client/
├── src/
│   ├── main.jsx               # React root
│   ├── App.jsx
│   ├── index.css              # Tailwind entry
│   ├── routes/
│   │   └── AppRouter.jsx      # routes + role-based redirects
│   ├── pages/
│   │   ├── LoginPage.jsx
│   │   ├── KanbanPage.jsx
│   │   └── EmployeesPage.jsx
│   ├── context/
│   │   ├── AuthContext.jsx    # current user, login/logout
│   │   └── TicketContext.jsx  # board state + optimistic updates
│   ├── services/              # all API calls live here
│   │   ├── authService.js
│   │   ├── employeesService.js
│   │   └── ticketsService.js
│   ├── utils/
│   │   └── axiosInstance.js   # axios instance + DB-waking interceptor
│   └── components/
│       ├── ProtectedRoute.jsx
│       ├── LogoutButton.jsx
│       ├── AddEmployeeModal.jsx
│       ├── common/Button.jsx
│       ├── layout/            # MainLayout, Sidebar, Header
│       └── kanban/            # KanbanBoard, KanbanColumn, TicketCard,
│                              # FilterBar, Create/EditTicketModal,
│                              # TicketDetailModal, StatusBadge, PriorityBadge
├── package.json
└── .env
```

### Request flow

```
Browser (React SPA, :5173)
  → axios instance (VITE_API, credentials: include)
    → Express middlewares: helmet → cors → json → cookieParser
      → authMiddleware (JWT cookie) → roleMiddleware (route-level roles)
        → route → controller (validation) → services (SQL via pooled connection)
          → Azure SQL (users / teamMembers / tickets / ticketLogs)
```

Business logic lives in controllers/services; React components only compose
UI and call service functions. All table names are lowercase, all columns
camelCase, matching the JS conventions end-to-end.

---

# Development Challenges

---

Real problems I hit while building WB Kanban. what went wrong, what I tried, and how I fixed it.

## Learning MSSQL with Zero SQL Server Experience
 
**Situation:** Tech stack required MSSQL — a relational database I haven't used for a long time. My background was mostly with NoSQL (MongoDB). Used relational database during college(MySql). Deploying to Azure SQL added production pressure: unfamiliar technology + production environment.
 
**Task:** Build the database layer correctly without breaking production or incurring unexpected Azure charges.
 
**Action:** Started with research. Discovered two local SQL engines — SQL Server Express and the pro or developer stuff... evaluated both and chose Express but ended up using Azure SQL because of remote accessibility and production easy setup. Installed SSMS (SQL Server Management Studio) locally to test queries and schema design.
 
Researched Azure SQL setup carefully, focusing on free-tier limitations and cost controls. Used AI to assist with account setup and configuration. Reviewed Azure firewall rules, connection pooling settings, and auto-pause behavior to prevent surprise charges (similar process to configuring MongoDB Atlas, but with different concerns — auto-pause vs. connection limits instead of bandwidth).
 
Configured SSMS to connect to Azure SQL via firewall rules. Tested schema and seed data against production database before deploying backend code.
 
**Result:** Successfully migrated from local SQL Server to Azure SQL. Database layer is stable, properly indexed, and operates within free-tier constraints. Zero unexpected charges.
 
**Lesson:** Relational databases require different thinking than NoSQ. But the fundamentals (connection pooling, credential management, testing) transfer from MongoDB. Research + careful configuration + testing beats trial-and-error.
 
---

## Over-engineering the initial scope

**Situation:** Started with an ambitious Kanban system design. Used AI to help me draft comprehensive documentation about my idea, scope, tech stack, architecture. I initialized the repo, the frontend and backend. Went backend-first with auth, database setup, all the enterprise patterns.

**Task:** Get the core product built without endless feature creep.

**Action:** About halfway through, I realized the initial scope was bloated. Supervisor, multiple teams, complex project hierarchies, advanced role matrix. Stuff that sounded good on paper but wasn't actually needed. I made the cut: simplified to 1 team, 1 project, 4 tables max (`users`, `teamMembers`, `tickets`, `ticketLogs`). Killed the "nice-to-haves."

**Result:** The smaller surface area made everything faster. Fewer database joins, simpler permissions, easier to test and ship. Done is better than perfect, and the simplified version shipped.

**Lesson:** AI planning is great but can pull you toward over-building. Cut scope aggressively. You can always add later.

---

## Navigating Required Tech Stack: Ant Design vs. ShadcnUI
 
**Situation:** Tech stack mandated Ant Design for the frontend UI. No prior experience with it. Familiar with ShadcnUI from past projects, but unsure if they were interchangeable or if Ant Design had a steeper learning curve.
 
**Task:** Assess Ant Design's fit for the project and develop proficiency quickly without derailing the timeline.
 
**Action:** Researched Ant Design's scope and capabilities vs. ShadcnUI. Found key differences: ShadcnUI is a reusable component library (buttons, inputs, cards). Ant Design is broader — components plus built-in icons, toast notifications, modal dialogs, form validation, date pickers, and a complete design system.
 
Realized Ant Design's scope meant fewer external dependencies but required learning their conventions (controlled components, form validation patterns, theming). Used AI to provide working examples of unfamiliar components, debug unexpected behavior, and understand best practices.
 
Built the first few UI screens (auth pages, user management) to practice. By screen 3–4, patterns became clear and development speed increased. Learned to leverage Ant Design's built-in features instead of building workarounds.
 
**Result:** Successfully integrated Ant Design with Tailwind v4. UI shipped with consistent design, built-in accessibility, and all required components. Development actually accelerated after initial learning curve.
 
**Lesson:** Broader frameworks (like Ant Design) have steeper ramps but pay off with time — fewer bugs, built-in patterns, better long-term maintainability. Spending time to understand conventions beats copying examples.
 
---

## Azure SQL auto-pause killing the app

**Situation:** Production database is Azure SQL Serverless (free tier). To save costs, it auto-pauses after ~1 hour of no activity. The problem: backend connected at startup and expected the connection pool to stay open forever. When the database paused, the server crashed trying to reconnect.

**Task:** Keep the database accessible without constantly paying to keep it warm.

**Action:** Stopped fighting the pause. Instead, designed around it:

1. **Connection pool strategy**: Set pool minimum to 0, maximum to 10, idle timeout to 5 minutes. This means no permanent sessions — connections close when idle, database reaches zero sessions faster, and Azure actually pauses it (which is free).

2. **Startup resilience**: Wrapped startup connection in `connectWithRetry()` — up to 10 attempts with exponential backoff + jitter (2s base, 15s cap ≈ 3–4 minute window). Only retries transient errors (timeouts, Azure "resuming" codes); fails fast on bad credentials.

3. **Runtime wake**: When a request hits a paused database, the error middleware detects the transient failure, returns `503` + `Retry-After: 30`, and triggers a single-flight wake attempt (concurrent callers share one attempt, no thundering herd). Frontend axios interceptor catches this, shows "Database waking up…", polls health every 3 seconds for 90 seconds, then replays the request.

**Result:** Database costs nearly nothing while idle, wakes reliably when needed, and users see a graceful message instead of a hard error.

**Lesson:** Work with cloud constraints, not against them. A little extra resilience on the client side beats trying to keep expensive resources alive 24/7.

---

## Key Takeaways

- **Scope creep is the real enemy.** AI makes it easy to plan for features you don't need yet. Cut ruthlessly.
- **Invest time learning your tooling.** Ant Design had a learning curve, but paid off immediately.
- **Design for failure modes.** Database pause isn't a bug; it's a feature. Build around it.