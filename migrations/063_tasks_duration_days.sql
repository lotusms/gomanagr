-- Time to complete (in days) for Gantt: task bar spans from (due_at - duration_days) to due_at.
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS duration_days INTEGER;

COMMENT ON COLUMN tasks.duration_days IS 'Estimated days to complete; used in Gantt to span the bar. Bar ends on due_at.';
