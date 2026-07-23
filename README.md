# ToDoApp

A modern task management application with neumorphic UI design.

## Features

- **Task Management** — Create, edit, delete, pin, duplicate tasks
- **Tags** — Organize tasks with color-coded tags (many-to-many)
- **Subtasks** — Break tasks into smaller items with progress tracking
- **Comments** — Add notes to tasks
- **Time Tracking** — Start/stop timer on tasks, log time manually
- **Templates** — Save task presets for quick creation
- **Recurring Tasks** — Daily/weekly/monthly auto-renewal
- **Priority System** — Low/Medium/High with color coding
- **Multiple Views** — List, Kanban Board, Calendar, Gantt, Today
- **Search & Filters** — Search by text, filter by priority/status/tag
- **Bulk Select** — Select multiple tasks for batch actions
- **Drag & Drop** — Reorder tasks in list and kanban views
- **Import/Export** — JSON export/import for backup
- **Keyboard Shortcuts** — N (new), / (search), ? (help)
- **Dark Mode** — Light/Dark/System theme toggle
- **Responsive** — Mobile-friendly with collapsible sidebar

## Tech Stack

**Frontend:** Next.js 16, TypeScript, Tailwind CSS, shadcn/ui, @dnd-kit, Recharts

**Backend:** FastAPI, SQLAlchemy, SQLite, JWT auth (python-jose, bcrypt)

## Getting Started

### Quick Start (Windows)

```bash
# Double-click run.bat or run from terminal:
run.bat
```

### Manual Start

**Backend:**
```bash
cd backend
python -m venv venv
venv\Scripts\activate   # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**Requires Node.js >= 20**

## Project Structure

```
ToDoApp/
├── backend/
│   └── app/
│       ├── main.py          # FastAPI app + CORS
│       ├── config.py        # Settings
│       ├── database.py      # SQLAlchemy setup
│       ├── models.py        # User, Tag, Task, Subtask, Comment, TimeEntry, Template
│       ├── schemas.py       # Pydantic schemas
│       ├── auth.py          # JWT + bcrypt
│       ├── dependencies.py  # Auth dependencies
│       └── routers/         # API route handlers
│
├── frontend/
│   └── src/
│       ├── app/             # Next.js App Router pages
│       ├── components/      # React components
│       ├── hooks/           # Custom hooks
│       └── lib/             # API client, types, utils
│
└── run.bat                  # One-click startup script
```

## API Documentation

Interactive API docs available at: http://localhost:8000/docs

## Production Deployment

### Environment Variables

Create a `.env` file in `backend/` with:

```env
SECRET_KEY=<generate-a-strong-random-key>
DATABASE_URL=postgresql://user:password@localhost:5432/todoapp
ACCESS_TOKEN_EXPIRE_MINUTES=1440
CORS_ORIGINS=["https://yourdomain.com"]
FORCE_HTTPS=true
```

### Hardcoded Values to Replace

| File | Value | Production Action |
|------|-------|-------------------|
| `backend/.env` | `SECRET_KEY=your-secret-key-change-in-production` | Generate random 32+ char secret |
| `backend/.env` | `DATABASE_URL=sqlite:///./todoapp.db` | Use PostgreSQL connection string |
| `backend/app/config.py` | Fallback `SECRET_KEY` default | Remove default, require env var |
| `backend/app/main.py` | `CORS_ORIGINS` default `localhost:3000` | Set via env var |
| `frontend/src/lib/api.ts` | `baseURL: "http://localhost:8000"` | Use production API URL with HTTPS |

### Security Features

- **Rate Limiting** — 100 requests/minute per IP (configurable in `main.py`)
- **HTTPS Redirect** — Set `FORCE_HTTPS=true` in `.env` to enforce HTTPS
- **CORS** — Restrict origins via `CORS_ORIGINS` env var
- **JWT Auth** — Tokens expire after `ACCESS_TOKEN_EXPIRE_MINUTES`

### Database Migration (SQLite → PostgreSQL)

1. Install PostgreSQL and create database
2. Update `DATABASE_URL` in `.env`
3. Run `alembic upgrade head` (if using Alembic) or let SQLAlchemy create tables
4. Export data from SQLite: `sqlite3 todoapp.db .dump > backup.sql`
5. Import to PostgreSQL: `psql todoapp < backup.sql`

### Deployment Checklist

- [ ] Generate strong `SECRET_KEY` (e.g., `openssl rand -hex 32`)
- [ ] Switch to PostgreSQL
- [ ] Set `FORCE_HTTPS=true`
- [ ] Configure `CORS_ORIGINS` with production domain
- [ ] Update frontend `baseURL` to HTTPS API endpoint
- [ ] Set up reverse proxy (nginx/Caddy) with SSL certificate
- [ ] Configure firewall to only allow ports 80/443
- [ ] Set up automated backups for PostgreSQL
- [ ] Monitor rate limiting logs for abuse
