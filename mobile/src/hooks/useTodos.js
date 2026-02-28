import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import {
  scheduleNotification,
  cancelNotification,
} from '../components/NotificationService';

// ── Constants ────────────────────────────────────────────────────────────────
const CACHE_KEY = '@taskastic/todos_v1';
const QUEUE_KEY = '@taskastic/queue_v1';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** A task is "done" if EITHER the boolean OR the status string says so. */
export function isTaskDone(todo) {
  return !!todo.completed || todo.status === 'completed';
}

/** Unique temporary ID for optimistic items created while offline. */
function makeTmpId() {
  return 'tmp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

/** Tells us if a thrown error is a network-level failure vs. a server error. */
function isNetworkError(err) {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  return (
    err.name === 'TypeError' ||
    msg.includes('network') ||
    msg.includes('failed to fetch') ||
    msg.includes('fetch') ||
    msg.includes('timeout') ||
    msg.includes('socket') ||
    msg.includes('offline')
  );
}

// ── AsyncStorage helpers ─────────────────────────────────────────────────────

async function loadCached() {
  try {
    const json = await AsyncStorage.getItem(CACHE_KEY);
    return json ? JSON.parse(json) : null;
  } catch { return null; }
}

async function saveCache(todos) {
  try { await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(todos)); } catch {}
}

async function loadQueue() {
  try {
    const json = await AsyncStorage.getItem(QUEUE_KEY);
    return json ? JSON.parse(json) : [];
  } catch { return []; }
}

async function persistQueue(q) {
  try { await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(q)); } catch {}
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useTodos() {
  const [todos, setTodos]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [isOnline, setIsOnline]     = useState(true);
  const [pendingCount, setPending]  = useState(0);

  // Keep a ref so callbacks always see the latest todos without stale closure
  const todosRef = useRef([]);
  todosRef.current = todos;

  // ── Cache write helpers ───────────────────────────────────────────────────

  const updateCache = useCallback(async (newTodos) => {
    await saveCache(newTodos);
  }, []);

  const enqueue = useCallback(async (op) => {
    const q = await loadQueue();
    q.push({ ...op, _qid: makeTmpId() });
    await persistQueue(q);
    setPending(q.length);
  }, []);

  // ── Fetch from server ─────────────────────────────────────────────────────

  const fetchTodos = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('todos')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const fresh = data || [];
      setTodos(fresh);
      setError(null);
      setIsOnline(true);
      await updateCache(fresh);
    } catch (err) {
      if (isNetworkError(err)) {
        setIsOnline(false);
        // Don't wipe the error if it's already set; just silently fail the refresh
      } else {
        setError('Failed to load tasks.');
      }
    }
  }, [updateCache]);

  // ── Replay offline queue ──────────────────────────────────────────────────

  const replayQueue = useCallback(async () => {
    const q = await loadQueue();
    if (!q.length) return;

    let current = [...todosRef.current];
    const failed = [];

    for (const item of q) {
      try {
        if (item.op === 'add') {
          const { data: { user } } = await supabase.auth.getUser();
          const { data, error: e } = await supabase
            .from('todos')
            .insert([{ ...item.payload, user_id: user.id }])
            .select()
            .single();
          if (e) throw e;
          // Replace the temporary item in local state with the real server record
          current = current.map((t) => (t.id === item.tmpId ? data : t));
          if (data.due_date && !isTaskDone(data)) {
            await scheduleNotification(data.id, data.text, new Date(data.due_date));
          }
        } else if (item.op === 'toggle' || item.op === 'update') {
          const { data, error: e } = await supabase
            .from('todos')
            .update(item.payload)
            .eq('id', item.id)
            .select()
            .single();
          if (e) throw e;
          current = current.map((t) => (t.id === item.id ? data : t));
        } else if (item.op === 'delete') {
          // tmp_ items never reached the server — nothing to delete remotely
          if (!item.id.startsWith('tmp_')) {
            const { error: e } = await supabase
              .from('todos').delete().eq('id', item.id);
            if (e) throw e;
          }
          current = current.filter((t) => t.id !== item.id);
        } else if (item.op === 'clearCompleted') {
          const realIds = (item.ids || []).filter((id) => !id.startsWith('tmp_'));
          if (realIds.length) {
            const { error: e } = await supabase
              .from('todos').delete().in('id', realIds);
            if (e) throw e;
          }
          current = current.filter((t) => !item.ids.includes(t.id));
        }
      } catch (err) {
        if (isNetworkError(err)) {
          // Still offline — put the remaining items back and stop
          failed.push(item, ...q.slice(q.indexOf(item) + 1));
          break;
        }
        // Server-side error — drop the bad op so it doesn't block others
      }
    }

    setTodos(current);
    await updateCache(current);
    await persistQueue(failed);
    setPending(failed.length);

    if (!failed.length) {
      // All replayed — do a clean server fetch to reconcile
      setIsOnline(true);
      await fetchTodos();
    }
  }, [fetchTodos, updateCache]);

  // ── Init: cache first, then server ───────────────────────────────────────

  useEffect(() => {
    (async () => {
      // 1. Paint the screen immediately with cached data
      const cached = await loadCached();
      if (cached) setTodos(cached);
      setLoading(false);

      // 2. Load pending queue count
      const q = await loadQueue();
      setPending(q.length);

      // 3. Fetch fresh data from server
      await fetchTodos();

      // 4. Replay any queued ops (in case app was closed with pending writes)
      if (q.length) await replayQueue();
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Realtime subscription ─────────────────────────────────────────────────
  // Filter by user_id so we only react to the current user's own changes,
  // not every other user's writes to the same table.

  useEffect(() => {
    let channel;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      channel = supabase
        .channel('todos-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'todos', filter: `user_id=eq.${user.id}` },
          fetchTodos,
        )
        .subscribe();
    })();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [fetchTodos]);

  // ── AppState: replay queue when app comes to foreground ───────────────────

  useEffect(() => {
    const sub = AppState.addEventListener('change', async (state) => {
      if (state === 'active') {
        const q = await loadQueue();
        if (q.length) {
          await replayQueue();
        } else {
          await fetchTodos();
        }
      }
    });
    return () => sub.remove();
  }, [fetchTodos, replayQueue]);

  // ── Periodic retry when there are pending ops ─────────────────────────────

  useEffect(() => {
    if (!pendingCount) return;
    const timer = setInterval(async () => {
      const q = await loadQueue();
      if (q.length) await replayQueue();
    }, 30_000); // retry every 30 s
    return () => clearInterval(timer);
  }, [pendingCount, replayQueue]);

  // ─── Add ─────────────────────────────────────────────────────────────────

  const addTodo = async (text, priority, status, dueDate) => {
    const isDone = status === 'completed';
    const tmpId  = makeTmpId();

    // Build an optimistic record that looks like a real server row
    const optimistic = {
      id:         tmpId,
      text,
      priority,
      status,
      completed:  isDone,
      due_date:   dueDate ? new Date(dueDate).toISOString() : null,
      created_at: new Date().toISOString(),
      _offline:   true,   // flag so UI can show a "pending" indicator if desired
    };

    const newList = [optimistic, ...todosRef.current];
    setTodos(newList);
    await updateCache(newList);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error: insertError } = await supabase
        .from('todos')
        .insert([{
          text, priority, status,
          completed: isDone,
          due_date:  optimistic.due_date,
          user_id:   user.id,
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      // Swap optimistic record with the real server record
      const confirmed = todosRef.current.map((t) => (t.id === tmpId ? data : t));
      setTodos(confirmed);
      await updateCache(confirmed);
      setIsOnline(true);

      if (dueDate && !isDone) {
        await scheduleNotification(data.id, text, new Date(dueDate));
      }
      return data;

    } catch (err) {
      if (isNetworkError(err)) {
        setIsOnline(false);
        await enqueue({
          op:      'add',
          tmpId,
          payload: {
            text, priority, status,
            completed: isDone,
            due_date:  optimistic.due_date,
          },
        });
      } else {
        // Server error — remove the optimistic item and rethrow
        const reverted = todosRef.current.filter((t) => t.id !== tmpId);
        setTodos(reverted);
        await updateCache(reverted);
        throw err;
      }
      return optimistic;
    }
  };

  // ─── Toggle checkbox ──────────────────────────────────────────────────────

  const toggleTodo = async (id) => {
    const todo = todosRef.current.find((t) => t.id === id);
    if (!todo) return;

    const nowDone = !isTaskDone(todo);
    const payload = {
      completed: nowDone,
      status:    nowDone ? 'completed' : 'not-started',
    };

    // Optimistic update
    const updated = todosRef.current.map((t) => (t.id === id ? { ...t, ...payload } : t));
    setTodos(updated);
    await updateCache(updated);

    try {
      const { data, error: updateError } = await supabase
        .from('todos')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      if (nowDone) await cancelNotification(id);

      const confirmed = todosRef.current.map((t) => (t.id === id ? data : t));
      setTodos(confirmed);
      await updateCache(confirmed);
      setIsOnline(true);

    } catch (err) {
      if (isNetworkError(err)) {
        setIsOnline(false);
        // Only queue if this is a real server record (tmp items haven't been saved yet)
        if (!id.startsWith('tmp_')) {
          await enqueue({ op: 'toggle', id, payload });
        }
      } else {
        // Revert on server error
        setTodos(todosRef.current.map((t) => (t.id === id ? todo : t)));
        await updateCache(todosRef.current);
        throw err;
      }
    }
  };

  // ─── Update (from edit form) ──────────────────────────────────────────────

  const updateTodo = async (id, updates) => {
    const original = todosRef.current.find((t) => t.id === id);

    const payload = { ...updates };
    if ('due_date' in payload) {
      payload.due_date = payload.due_date
        ? new Date(payload.due_date).toISOString()
        : null;
    }
    if ('status' in payload) {
      payload.completed = payload.status === 'completed';
    }
    if ('completed' in payload && !('status' in payload)) {
      payload.status = payload.completed ? 'completed' : 'not-started';
    }

    // Optimistic update
    const updated = todosRef.current.map((t) => (t.id === id ? { ...t, ...payload } : t));
    setTodos(updated);
    await updateCache(updated);

    try {
      const { data, error: updateError } = await supabase
        .from('todos')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      const isDone = payload.status === 'completed' || payload.completed === true;
      if (isDone) {
        await cancelNotification(id);
      } else if ('due_date' in updates) {
        await cancelNotification(id);
        if (payload.due_date) {
          await scheduleNotification(id, data.text, new Date(payload.due_date));
        }
      }

      const confirmed = todosRef.current.map((t) => (t.id === id ? data : t));
      setTodos(confirmed);
      await updateCache(confirmed);
      setIsOnline(true);

    } catch (err) {
      if (isNetworkError(err)) {
        setIsOnline(false);
        if (!id.startsWith('tmp_')) {
          await enqueue({ op: 'update', id, payload });
        }
      } else {
        // Revert
        setTodos(todosRef.current.map((t) => (t.id === id ? original : t)));
        await updateCache(todosRef.current);
        throw err;
      }
    }
  };

  // ─── Delete ───────────────────────────────────────────────────────────────

  const deleteTodo = async (id) => {
    await cancelNotification(id);

    // Optimistic remove
    const updated = todosRef.current.filter((t) => t.id !== id);
    setTodos(updated);
    await updateCache(updated);

    // If this was an offline-only tmp item, also remove it from the add-queue
    if (id.startsWith('tmp_')) {
      const q = await loadQueue();
      await persistQueue(q.filter((item) => item.tmpId !== id));
      setPending((prev) => Math.max(0, prev - 1));
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from('todos').delete().eq('id', id);
      if (deleteError) throw deleteError;
      setIsOnline(true);

    } catch (err) {
      if (isNetworkError(err)) {
        setIsOnline(false);
        await enqueue({ op: 'delete', id });
      } else {
        // Revert — put it back
        setTodos(todosRef.current); // already has the item removed, so re-fetch
        await fetchTodos();
        throw err;
      }
    }
  };

  // ─── Clear completed ──────────────────────────────────────────────────────

  const clearCompleted = async () => {
    const completedIds = todosRef.current
      .filter((t) => isTaskDone(t))
      .map((t) => t.id);
    if (!completedIds.length) return;

    await Promise.all(completedIds.map((id) => cancelNotification(id)));

    // Optimistic remove
    const updated = todosRef.current.filter((t) => !isTaskDone(t));
    setTodos(updated);
    await updateCache(updated);

    // Remove any offline tmp items from the add-queue too
    const tmpIds  = completedIds.filter((id) => id.startsWith('tmp_'));
    const realIds = completedIds.filter((id) => !id.startsWith('tmp_'));

    if (tmpIds.length) {
      const q = await loadQueue();
      await persistQueue(q.filter((item) => !tmpIds.includes(item.tmpId)));
    }

    if (!realIds.length) return;

    try {
      const { error: deleteError } = await supabase
        .from('todos').delete().in('id', realIds);
      if (deleteError) throw deleteError;
      setIsOnline(true);

    } catch (err) {
      if (isNetworkError(err)) {
        setIsOnline(false);
        await enqueue({ op: 'clearCompleted', ids: realIds });
      } else {
        await fetchTodos(); // reconcile
        throw err;
      }
    }
  };

  // ─── Public API ───────────────────────────────────────────────────────────

  return {
    todos,
    loading,
    error,
    isOnline,
    pendingCount,
    addTodo,
    toggleTodo,
    updateTodo,
    deleteTodo,
    clearCompleted,
  };
}
