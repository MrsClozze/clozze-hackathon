

## AI Natural Language Task Creation

### Overview
Add an AI-powered input bar to the Tasks page that lets users type (or speak) natural language instructions like *"Create a task for John to send the inspection report by Friday for listing 123 Main St"*. The AI extracts structured fields and feeds them into the **exact same `addTask()` function** used by the manual Add Task Modal -- no separate backend path.

### Architecture

```text
+------------------+       +-------------------------+       +-------------------+
| AI Input Bar     | ----> | Edge Function           | ----> | Client receives   |
| (Tasks page UI)  |       | parse-task-input        |       | structured task    |
|                  |       | (Lovable AI / Gemini)   |       | object             |
+------------------+       +-------------------------+       +-------------------+
                                                                     |
                                                              calls addTask()
                                                              (TasksContext)
                                                                     |
                                                          Same creation flow:
                                                          - DB insert
                                                          - Assignees junction
                                                          - Calendar sync
                                                          - Recurrence engine
                                                          - Notifications
```

### What Gets Built

**1. Edge Function: `supabase/functions/parse-task-input/index.ts`**

- Accepts: `{ input: string, teamMembers: [...], buyers: [...], listings: [...] }`
- Uses Lovable AI (`google/gemini-3-flash-preview`) with tool calling to extract structured output
- Tool schema returns: `title`, `description`, `dueDate`, `startDate`, `dueTime`, `priority`, `assigneeUserIds[]`, `buyerId`, `listingId`
- Entity resolution: the prompt includes the full list of team members (id + name), buyers (id + name), and listings (id + address) so the model can fuzzy-match names to real IDs
- Date parsing: the prompt includes today's date so the model can resolve "Friday", "next week", "end of month" to `YYYY-MM-DD`
- Validation: if the model cannot confidently resolve a field, it returns `null` and the client displays what was parsed with an option to edit before confirming
- Error handling: 429/402 rate limit errors are surfaced back to the client

**2. UI Component: `src/components/dashboard/AITaskInput.tsx`**

- A collapsible input bar placed above the task list on the Tasks page
- Contains a text input with a sparkle/AI icon and a submit button
- Flow on submit:
  1. Show loading spinner
  2. Call the edge function with the user's text + context arrays
  3. Receive parsed task object
  4. Open a **confirmation preview** showing all extracted fields (title, due date, assignee names, linked buyer/listing, priority)
  5. User can edit any field inline or click "Create Task"
  6. On confirm, call `addTask()` from `TasksContext` with the structured object -- identical to the manual modal flow
- Ambiguity handling: if AI returns `null` for required fields (e.g., no due date detected), highlight those fields in the preview with a warning
- Error toasts for rate limits (429) and payment required (402)

**3. Confirmation Preview: `src/components/dashboard/AITaskPreview.tsx`**

- A card/modal showing the parsed task fields in an editable form
- Pre-filled with AI-extracted values; user can adjust before final creation
- "Create Task" button calls `addTask()` directly
- "Cancel" discards the parsed result

**4. Tasks Page Updates: `src/pages/Tasks.tsx`**

- Import and render `AITaskInput` above the filters section
- Pass required context: team members, buyers, listings, and the `addTask` function

**5. Config: `supabase/config.toml`**

- Add `[functions.parse-task-input]` entry (default JWT verification)

### Technical Details

**Edge function prompt strategy:**
- System prompt instructs the model to act as a task parser for a real estate CRM
- Includes today's date and timezone for relative date resolution
- Uses tool calling (not JSON mode) for reliable structured extraction
- The tool schema maps directly to the `Task` interface fields

**Entity resolution approach:**
- Team members sent as `[{ id, name }]` -- model matches "John" to the closest team member
- Buyers sent as `[{ id, firstName, lastName }]` -- model matches "the Smiths" to buyer
- Listings sent as `[{ id, address }]` -- model matches "123 Main St" or "the Oak Street listing"
- If no match found, field returns `null` and user can manually select

**Required fields validation:**
- Title: always extracted (uses the core action from the input)
- Due date: required -- if AI can't determine one, the preview highlights it as missing
- All other fields are optional and follow existing task defaults

**No new database changes required** -- the AI output maps to the existing `Task` interface and flows through `addTask()`.

