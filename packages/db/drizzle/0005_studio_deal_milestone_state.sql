-- Milestone-level workflow state for studio deals. The plan snapshot stays
-- immutable (it's the signed quote); `milestone_state` tracks per-milestone
-- progress against that snapshot: status, who finished it, when, due date,
-- and free-form notes.

ALTER TABLE "studio_deal"
  ADD COLUMN IF NOT EXISTS "milestone_state" jsonb NOT NULL DEFAULT '{}'::jsonb;
