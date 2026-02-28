-- Drop outcome and team_member from client_calls (no longer used in the call form).

ALTER TABLE client_calls DROP COLUMN IF EXISTS outcome;
ALTER TABLE client_calls DROP COLUMN IF EXISTS team_member;
