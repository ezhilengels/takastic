const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = 5001;
const DATA_FILE = path.join(__dirname, "todos.json");

app.use(cors());
app.use(express.json());

// Helper: read todos from disk
function readTodos() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([]));
  }
  const data = fs.readFileSync(DATA_FILE, "utf-8");
  return JSON.parse(data);
}

// Helper: write todos to disk
function writeTodos(todos) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(todos, null, 2));
}

// GET all todos
app.get("/api/todos", (req, res) => {
  const todos = readTodos();
  res.json(todos);
});

// POST create todo
app.post("/api/todos", (req, res) => {
  const { text, priority, status } = req.body;
  if (!text || text.trim() === "") {
    return res.status(400).json({ error: "Text is required" });
  }
  const todos = readTodos();
  const newTodo = {
    id: uuidv4(),
    text: text.trim(),
    completed: false,
    priority: priority || "medium",
    status: status || "not-started",
    createdAt: new Date().toISOString(),
  };
  todos.push(newTodo);
  writeTodos(todos);
  res.status(201).json(newTodo);
});

// PUT update todo (edit text / priority)
app.put("/api/todos/:id", (req, res) => {
  const todos = readTodos();
  const index = todos.findIndex((t) => t.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Todo not found" });

  todos[index] = { ...todos[index], ...req.body, id: todos[index].id };
  writeTodos(todos);
  res.json(todos[index]);
});

// PATCH toggle complete
app.patch("/api/todos/:id/toggle", (req, res) => {
  const todos = readTodos();
  const index = todos.findIndex((t) => t.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Todo not found" });

  todos[index].completed = !todos[index].completed;
  writeTodos(todos);
  res.json(todos[index]);
});

// DELETE todo
app.delete("/api/todos/:id", (req, res) => {
  let todos = readTodos();
  const exists = todos.find((t) => t.id === req.params.id);
  if (!exists) return res.status(404).json({ error: "Todo not found" });

  todos = todos.filter((t) => t.id !== req.params.id);
  writeTodos(todos);
  res.json({ message: "Deleted successfully" });
});

// DELETE all completed
app.delete("/api/todos/completed/clear", (req, res) => {
  let todos = readTodos();
  todos = todos.filter((t) => !t.completed);
  writeTodos(todos);
  res.json({ message: "Cleared completed todos" });
});

app.listen(PORT, () => {
  console.log(`✅ Todo server running at http://localhost:${PORT}`);
});
