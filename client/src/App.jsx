import { useState, useMemo } from "react";
import { useTodos } from "./hooks/useTodos";
import "./index.css";

const PRIORITY_CONFIG = {
  high: { label: "High", color: "#ff4d4d", bg: "#ff4d4d18" },
  medium: { label: "Medium", color: "#f5a623", bg: "#f5a62318" },
  low: { label: "Low", color: "#4caf50", bg: "#4caf5018" },
};

const STATUS_CONFIG = {
  "not-started": { label: "Not Started", color: "#c0c0d0", bg: "#c0c0d030" },
  "active":      { label: "Active",      color: "#a89af7", bg: "#7c6af730" },
  "completed":   { label: "Completed",   color: "#6fda74", bg: "#4caf5030" },
};

const FILTER_LABELS = {
  "all":         "All",
  "not-started": "Not Started",
  "active":      "Active",
  "completed":   "Completed",
};

function TodoItem({ todo, onToggle, onDelete, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(todo.text);
  const p = PRIORITY_CONFIG[todo.priority];

  const saveEdit = () => {
    if (editText.trim() && editText !== todo.text) {
      onUpdate(todo.id, { text: editText.trim() });
    }
    setEditing(false);
  };

  return (
    <div className={`todo-item ${todo.completed ? "completed" : ""}`}>
      <button
        className={`check-btn ${todo.completed ? "checked" : ""}`}
        onClick={() => onToggle(todo.id)}
        aria-label="Toggle complete"
      >
        {todo.completed && (
          <svg viewBox="0 0 12 10" fill="none">
            <path
              d="M1 5l3.5 3.5L11 1"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      <div className="todo-body">
        {editing ? (
          <input
            className="edit-input"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveEdit();
              if (e.key === "Escape") setEditing(false);
            }}
            autoFocus
          />
        ) : (
          <span className="todo-text" onDoubleClick={() => setEditing(true)}>
            {todo.text}
          </span>
        )}

        <span
          className="priority-badge"
          style={{ color: p.color, background: p.bg }}
        >
          {p.label}
        </span>
        <select
          className="status-select"
          value={todo.status || "not-started"}
          style={{
            color: STATUS_CONFIG[todo.status || "not-started"].color,
            background: STATUS_CONFIG[todo.status || "not-started"].bg,
          }}
          onChange={(e) => onUpdate(todo.id, { status: e.target.value })}
        >
          <option value="not-started">⚪ Not Started</option>
          <option value="active">🟣 Active</option>
          <option value="completed">🟢 Completed</option>
        </select>
      </div>

      <div className="todo-actions">
        <button
          className="icon-btn edit-btn"
          onClick={() => setEditing(true)}
          title="Edit"
        >
          ✏️
        </button>
        <button
          className="icon-btn delete-btn"
          onClick={() => onDelete(todo.id)}
          title="Delete"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}

function AddTodoForm({ onAdd }) {
  const [text, setText] = useState("");
  const [priority, setPriority] = useState("medium");
  const [status, setStatus] = useState("not-started");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    await onAdd(text, priority, status);
    setText("");
    setStatus("not-started");
  };

  return (
    <form className="add-form" onSubmit={handleSubmit}>
      <input
        className="add-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What needs to be done?"
      />
      <select
        className="priority-select"
        value={priority}
        onChange={(e) => setPriority(e.target.value)}
      >
        <option value="high">🔴 High</option>
        <option value="medium">🟡 Medium</option>
        <option value="low">🟢 Low</option>
      </select>
      <select
        className="status-select"
        value={status}
        onChange={(e) => setStatus(e.target.value)}
      >
        <option value="not-started">⚪ Not Started</option>
        <option value="active">🟣 Active</option>
        <option value="completed">🟢 Completed</option>
      </select>
      <button className="add-btn" type="submit">
        Add
      </button>
    </form>
  );
}

export default function App() {
  const [filter, setFilter] = useState("all");
  const { todos, loading, error, addTodo, toggleTodo, updateTodo, deleteTodo, clearCompleted } = useTodos();

  const filtered = useMemo(() => {
    if (filter === "not-started") return todos.filter((t) => (t.status || "not-started") === "not-started");
    if (filter === "active")      return todos.filter((t) => (t.status || "not-started") === "active");
    if (filter === "completed")   return todos.filter((t) => (t.status || "not-started") === "completed");
    return todos;
  }, [todos, filter]);

  const activeCount = todos.filter((t) => !t.completed).length;
  const completedCount = todos.filter((t) => t.completed).length;

  return (
    <div className="app">
      <div className="bg-orb orb1" />
      <div className="bg-orb orb2" />

      <div className="container">
        <header className="header">
          <h1 className="title">
            <span className="title-icon">◈</span> Taskastic
          </h1>
          <p className="subtitle">Stay focused. Get things done.</p>
        </header>

        <AddTodoForm onAdd={addTodo} />

        <div className="filter-bar">
          {["all", "not-started", "active", "completed"].map((f) => (
            <button
              key={f}
              className={`filter-btn ${filter === f ? "active" : ""}`}
              onClick={() => setFilter(f)}
            >
              {FILTER_LABELS[f]}
            </button>
          ))}
        </div>

        <div className="stats">
          <span>{activeCount} task{activeCount !== 1 ? "s" : ""} left</span>
          {completedCount > 0 && (
            <button className="clear-btn" onClick={clearCompleted}>
              Clear completed ({completedCount})
            </button>
          )}
        </div>

        {error && <div className="error-msg">⚠️ {error}</div>}

        {loading ? (
          <div className="loading">
            <div className="spinner" />
            <span>Loading tasks...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty">
            <span className="empty-icon">✦</span>
            <p>{filter === "all" ? "No tasks yet. Add one above!" : `No ${FILTER_LABELS[filter]} tasks.`}</p>
          </div>
        ) : (
          <div className="todo-list">
            {filtered.map((todo) => (
              <TodoItem
                key={todo.id}
                todo={todo}
                onToggle={toggleTodo}
                onDelete={deleteTodo}
                onUpdate={updateTodo}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
