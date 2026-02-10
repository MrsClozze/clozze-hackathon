

## Task Assignment Visibility and Admin Calendar Sync Controls

### Problem Summary
1. **Tasks assigned to teammates don't appear in their views** -- The RLS policies on `tasks` already allow team-wide SELECT, but the UPDATE policy is owner-only (`auth.uid() = user_id`), so assignees can't update tasks assigned to them (e.g., mark complete, edit status).
2. **Dashboard calendar needs assignment-aware filtering** -- CalendarView shows all team tasks with `showOnCalendar`, not just tasks assigned to the current user.
3. **No admin controls for calendar sync targets** -- When syncing tasks to external calendars, there's no way to choose which team member calendars receive the sync.

---

### Phase 1: Fix Task Visibility and Assignee Permissions

**Database Migration** -- Update the `tasks` UPDATE policy so assignees (not just creators) can update tasks assigned to them:

```sql
DROP POLICY IF EXISTS "Users can update their own tasks" ON public.tasks;

CREATE POLICY "Users can update owned or assigned tasks"
ON public.tasks
FOR UPDATE
USING (
  auth.uid() = user_id
  OR id IN (
    SELECT task_id FROM public.task_assignees
    WHERE user_id = auth.uid()
  )
);
```

Similarly for DELETE (so assignees can at minimum manage their assigned tasks):

```sql
DROP POLICY IF EXISTS "Users can delete their own tasks" ON public.tasks;

CREATE POLICY "Users can delete owned or assigned tasks"
ON public.tasks
FOR DELETE
USING (
  auth.uid() = user_id
  OR id IN (
    SELECT task_id FROM public.task_assignees
    WHERE user_id = auth.uid()
  )
);
```

No frontend changes needed for task list visibility -- the existing `isAssignedToMe` logic in `Tasks.tsx` and `TasksSidebar.tsx` already checks `assigneeUserIds`.

---

### Phase 2: Assignment-Aware Dashboard Calendar

**File: `src/components/dashboard/CalendarView.tsx`**

Update the `taskEvents` memo to filter tasks shown on the dashboard calendar to only include:
- Tasks where the current user is the creator (`task.userId === user.id`)
- Tasks where the current user is an assignee (`task.assigneeUserIds?.includes(user.id)`)
- Tasks with no assignees that belong to the user

This prevents a teammate from seeing every team task on their calendar -- only their own assigned tasks.

---

### Phase 3: Admin-Only Calendar Sync Target Controls

This is the largest change. It adds a new concept: when an admin creates/edits a task and enables "Sync to connected calendar(s)", they are prompted to choose sync targets.

#### 3a. Database: Add sync target metadata to tasks

New column on `tasks` table:
- `calendar_sync_targets` (jsonb, nullable) -- Stores which team member calendars this task should sync to. Format: `{ "mode": "all" | "selected", "userIds": ["uuid1", "uuid2"] }`. When null, defaults to syncing to the creator's connected calendars only (backward compatible).

#### 3b. UI: Sync Target Selector (Admin Only)

**File: `src/components/dashboard/AddTaskModal.tsx`**
- When `syncToExternalCalendar` is toggled ON and the current user is an admin/owner:
  - Show a new section: "Sync to:" with radio options:
    - "My calendar only" (default)
    - "All team member calendars"
    - "Selected team member calendars" (shows a multi-select of team members who have calendar connections)
- Non-admin users see the existing toggle behavior unchanged.

**File: `src/components/dashboard/TaskDetailsModal.tsx`**
- Same sync target selector in edit mode for admin users.

#### 3c. Backend: Multi-Target Calendar Sync

**File: `src/contexts/TasksContext.tsx`**
- When saving a task with `syncToExternalCalendar: true` and `calendarSyncTargets`:
  - If mode is "all": call the sync edge function for each team member's calendar connection
  - If mode is "selected": call sync only for specified user IDs
  - Pass the target user ID to the edge function so it uses that user's OAuth tokens

**File: `supabase/functions/sync-google-calendar/index.ts`**
- Accept an optional `targetUserId` parameter
- When provided, look up that user's calendar connection tokens instead of the requesting user's
- This requires the caller to be an admin (verify via `shared_team` or team ownership check)

**File: `supabase/functions/sync-apple-calendar/index.ts`**
- Same `targetUserId` support as Google Calendar sync.

#### 3d. Access Control

- Only team owners/admins can set sync targets for other team members
- The `useTeamRole` hook already provides `isTeamOwner` -- use this to conditionally show the sync target UI
- Edge functions validate that the requesting user has admin authority over the target user via `shared_team()` check

---

### Changes Summary

| Area | File(s) | Change |
|------|---------|--------|
| Database | Migration | UPDATE/DELETE policies for assignees; `calendar_sync_targets` column |
| Task list visibility | No changes needed | Already works via RLS + frontend filtering |
| Dashboard calendar | `CalendarView.tsx` | Filter to assigned/owned tasks only |
| Sync target UI | `AddTaskModal.tsx`, `TaskDetailsModal.tsx` | Admin-only sync target selector |
| Task context | `TasksContext.tsx` | Handle multi-target sync on save |
| Edge functions | `sync-google-calendar`, `sync-apple-calendar` | Accept `targetUserId` for cross-user sync |
| Task interface | `TasksContext.tsx` | Add `calendarSyncTargets` to Task interface |

