-- Start date for Gantt: task bar runs from start_date (day 1) through start_date + (duration_days - 1).
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS start_date DATE;

COMMENT ON COLUMN tasks.start_date IS 'First day of the task; with duration_days the bar spans start_date through start_date + duration_days - 1.';
