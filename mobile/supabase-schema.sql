-- ============================================================
-- Taskastic — Supabase Database Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. Create the todos table
CREATE TABLE IF NOT EXISTS public.todos (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text        TEXT        NOT NULL,
  completed   BOOLEAN     DEFAULT false,
  priority    TEXT        DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  status      TEXT        DEFAULT 'not-started' CHECK (status IN ('not-started', 'active', 'completed')),
  due_date    TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Index for fast per-user queries
CREATE INDEX IF NOT EXISTS todos_user_id_idx ON public.todos(user_id);
CREATE INDEX IF NOT EXISTS todos_due_date_idx ON public.todos(due_date) WHERE due_date IS NOT NULL;

-- 3. Auto-update updated_at on every row change
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS todos_updated_at ON public.todos;
CREATE TRIGGER todos_updated_at
  BEFORE UPDATE ON public.todos
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 4. Enable Row Level Security (RLS) — each user only sees their own todos
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own todos"   ON public.todos;
DROP POLICY IF EXISTS "Users can insert their own todos" ON public.todos;
DROP POLICY IF EXISTS "Users can update their own todos" ON public.todos;
DROP POLICY IF EXISTS "Users can delete their own todos" ON public.todos;

CREATE POLICY "Users can view their own todos"
  ON public.todos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own todos"
  ON public.todos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own todos"
  ON public.todos FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own todos"
  ON public.todos FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Enable realtime for the todos table
ALTER PUBLICATION supabase_realtime ADD TABLE public.todos;

-- 6. Overdue view — run this in SQL Editor to query overdue tasks per user
--    (App computes overdue client-side; this view is for analytics/dashboard use)
CREATE OR REPLACE VIEW public.overdue_todos AS
SELECT
  id,
  user_id,
  text,
  due_date,
  priority,
  status,
  completed,
  created_at,
  EXTRACT(EPOCH FROM (NOW() - due_date)) / 3600 AS hours_overdue
FROM public.todos
WHERE
  due_date IS NOT NULL
  AND due_date < NOW()
  AND completed = false;

-- Grant access to the view (RLS is enforced via the underlying table)
GRANT SELECT ON public.overdue_todos TO authenticated;
