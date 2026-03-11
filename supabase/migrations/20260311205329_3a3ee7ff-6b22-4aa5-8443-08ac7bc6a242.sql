-- Remove calendar_events that were incorrectly created from task creation.
-- These have event_type='task', source='manual', and no calendar_connection_id
-- (real connected calendar events have a calendar_connection_id or source like 'google'/'apple').
DELETE FROM calendar_events
WHERE event_type = 'task'
  AND source = 'manual'
  AND calendar_connection_id IS NULL;