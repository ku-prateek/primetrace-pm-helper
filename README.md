## Task Management App

Minimal task management system with a Node/Express/MySQL backend and a React/Vite/Tailwind frontend.

### Requirements
- **Node.js**: 18.x
- **MySQL**: running instance and a database (e.g. `primetrace_pm_helper`)

### 1. Backend Setup

- **Configure environment**
  - Create `backend/.env`:

```bash
DB_HOST=localhost
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_NAME=primetrace_pm_helper
PORT=3000
```

- **Install & init**

```bash
cd backend
npm install
node init-db.js     # creates tables and seeds PM/Dev/QA users
node index.js       # starts API on http://localhost:3000
```

Main API endpoints:
- `GET /api/users`
- `GET /api/tasks`
- `POST /api/tasks`
- `PUT /api/tasks/:id/assign`
- `PUT /api/tasks/:id`
- `GET /api/tasks/:id/history`

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev         # opens React app (default http://localhost:5173)
```

The UI lets you:
- View all tasks
- Create tasks (PM → Dev/QA)
- Assign tasks (PM → Dev → QA)
- Update task status, notes, and due date

### 3. Usage Notes
- Backend must be running on **http://localhost:3000** before starting the frontend.
- Initial users (from seeding):
  - `pm_user` (PM)
  - `dev_user` (Dev)
  - `qa_user` (QA)

