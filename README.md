# Taskflow – Todo App

A full-stack Todo app built with React + Vite (frontend) and Node.js + Express (backend).
Data is stored in a local `todos.json` file on disk — no database required.

## Project Structure

```
todo-app/
├── client/          # React + Vite frontend
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/useTodos.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   └── package.json
├── server/
│   ├── index.js     # Express API
│   ├── todos.json   # Auto-created on first run
│   └── package.json
└── README.md
```

## Setup & Run

### 1. Start the Backend

```bash
cd server
npm install
npm run dev       # uses nodemon for auto-reload
# OR
npm start         # production start
```

Server runs at: http://localhost:5000

### 2. Start the Frontend

```bash
cd client
npm install
npm run dev
```

Frontend runs at: http://localhost:3000

## API Endpoints

| Method | Endpoint                      | Description           |
|--------|-------------------------------|-----------------------|
| GET    | /api/todos                    | Get all todos         |
| POST   | /api/todos                    | Create a new todo     |
| PUT    | /api/todos/:id                | Update todo text/priority |
| PATCH  | /api/todos/:id/toggle         | Toggle complete       |
| DELETE | /api/todos/:id                | Delete a todo         |
| DELETE | /api/todos/completed/clear    | Clear all completed   |

## Features

- Add todos with priority (High / Medium / Low)
- Toggle complete / incomplete
- Inline edit (double-click todo text)
- Delete individual todos
- Filter by All / Active / Completed
- Clear all completed at once
- Data persisted to `server/todos.json`
# takastic
