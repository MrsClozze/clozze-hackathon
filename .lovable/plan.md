## Task Assignment Visibility and Admin Calendar Sync Controls

### Status: ✅ IMPLEMENTED

All three phases have been implemented:

#### Phase 1: ✅ Task Visibility and Assignee Permissions
- Updated RLS policies: assignees can now UPDATE and DELETE tasks assigned to them
- Added `calendar_sync_targets` jsonb column to tasks table

#### Phase 2: ✅ Assignment-Aware Dashboard Calendar
- CalendarView now filters tasks to only show those owned by or assigned to the current user

#### Phase 3: ✅ Admin Calendar Sync Target Controls
- Added `CalendarSyncTargets` interface to TasksContext
- AddTaskModal shows sync target selector (My calendar / All / Selected) for admin users when sync is enabled
- Edge functions (sync-google-calendar, sync-apple-calendar) accept `targetUserIds` and `syncMode` for cross-user sync
- TasksContext passes sync targets through to edge functions
