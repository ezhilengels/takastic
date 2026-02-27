import { useState, useEffect, useCallback } from "react";
import axios from "axios";

const API = "/api/todos";

export function useTodos() {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTodos = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(API);
      setTodos(data);
      setError(null);
    } catch (err) {
      setError("Failed to load todos. Is the server running?");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  const addTodo = async (text, priority, status) => {
    const { data } = await axios.post(API, { text, priority, status });
    setTodos((prev) => [...prev, data]);
  };

  const toggleTodo = async (id) => {
    const { data } = await axios.patch(`${API}/${id}/toggle`);
    setTodos((prev) => prev.map((t) => (t.id === id ? data : t)));
  };

  const updateTodo = async (id, updates) => {
    const { data } = await axios.put(`${API}/${id}`, updates);
    setTodos((prev) => prev.map((t) => (t.id === id ? data : t)));
  };

  const deleteTodo = async (id) => {
    await axios.delete(`${API}/${id}`);
    setTodos((prev) => prev.filter((t) => t.id !== id));
  };

  const clearCompleted = async () => {
    await axios.delete(`${API}/completed/clear`);
    setTodos((prev) => prev.filter((t) => !t.completed));
  };

  return {
    todos,
    loading,
    error,
    addTodo,
    toggleTodo,
    updateTodo,
    deleteTodo,
    clearCompleted,
  };
}
