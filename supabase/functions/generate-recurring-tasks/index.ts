import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOOKAHEAD_COUNT = 3;

interface RecurrencePattern {
  pattern: string; // daily | weekly | biweekly | monthly
}

function getNextDueDate(currentDueDate: string, pattern: string, offset: number): string {
  const date = new Date(currentDueDate);
  for (let i = 0; i < offset; i++) {
    switch (pattern) {
      case "daily":
        date.setDate(date.getDate() + 1);
        break;
      case "weekly":
        date.setDate(date.getDate() + 7);
        break;
      case "biweekly":
        date.setDate(date.getDate() + 14);
        break;
      case "monthly":
        date.setMonth(date.getMonth() + 1);
        break;
    }
  }
  return date.toISOString();
}

function getNextStartDate(
  currentStartDate: string | null,
  currentDueDate: string,
  nextDueDate: string
): string | null {
  if (!currentStartDate) return null;
  // Preserve the same offset between start and due
  const startMs = new Date(currentStartDate).getTime();
  const dueMs = new Date(currentDueDate).getTime();
  const offset = dueMs - startMs;
  return new Date(new Date(nextDueDate).getTime() - offset).toISOString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const { parentTaskId, userId } = body;

    // Build query for parent recurring tasks that need instances
    let query = supabase
      .from("tasks")
      .select("*")
      .not("recurrence_pattern", "is", null)
      .is("parent_task_id", null); // Only parent/template tasks

    if (parentTaskId) {
      query = query.eq("id", parentTaskId);
    } else if (userId) {
      query = query.eq("user_id", userId);
    }
    // For cron: no filter = process all recurring parents

    const { data: parentTasks, error: fetchError } = await query;
    if (fetchError) throw fetchError;

    let totalGenerated = 0;

    for (const parent of parentTasks || []) {
      // Check recurrence end date
      if (parent.recurrence_end_date) {
        const endDate = new Date(parent.recurrence_end_date);
        if (endDate < new Date()) continue; // Past end date, skip
      }

      // Count existing non-completed future instances
      const { count, error: countError } = await supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("parent_task_id", parent.id)
        .neq("status", "completed");

      if (countError) {
        console.error(`Error counting instances for ${parent.id}:`, countError);
        continue;
      }

      const pendingCount = count || 0;
      const toGenerate = LOOKAHEAD_COUNT - pendingCount;

      if (toGenerate <= 0) continue;

      // Get the latest instance to determine the next due date
      const { data: latestInstances } = await supabase
        .from("tasks")
        .select("due_date, recurrence_index")
        .eq("parent_task_id", parent.id)
        .order("recurrence_index", { ascending: false })
        .limit(1);

      let lastDueDate = parent.due_date;
      let lastIndex = 0;

      if (latestInstances && latestInstances.length > 0) {
        lastDueDate = latestInstances[0].due_date;
        lastIndex = latestInstances[0].recurrence_index || 0;
      }

      const newTasks = [];
      for (let i = 1; i <= toGenerate; i++) {
        const nextDue = getNextDueDate(lastDueDate, parent.recurrence_pattern, i);
        const nextStart = getNextStartDate(parent.start_date, lastDueDate, nextDue);
        const nextIndex = lastIndex + i;

        // Check against end date
        if (parent.recurrence_end_date) {
          const nextDueDate = new Date(nextDue);
          const endDate = new Date(parent.recurrence_end_date);
          if (nextDueDate > endDate) break;
        }

        newTasks.push({
          user_id: parent.user_id,
          title: parent.title,
          date: parent.date,
          address: parent.address,
          assignee: parent.assignee,
          has_ai_assist: parent.has_ai_assist,
          priority: parent.priority,
          notes: parent.notes,
          status: "pending",
          start_date: nextStart,
          due_date: nextDue,
          due_time: parent.due_time,
          end_time: parent.end_time,
          buyer_id: parent.buyer_id,
          listing_id: parent.listing_id,
          contact_id: parent.contact_id,
          assignee_user_id: parent.assignee_user_id,
          show_on_calendar: parent.show_on_calendar,
          sync_to_external_calendar: parent.sync_to_external_calendar,
          parent_task_id: parent.id,
          recurrence_pattern: parent.recurrence_pattern,
          recurrence_index: nextIndex,
        });
      }

      if (newTasks.length > 0) {
        const { error: insertError } = await supabase
          .from("tasks")
          .insert(newTasks);

        if (insertError) {
          console.error(`Error inserting instances for ${parent.id}:`, insertError);
        } else {
          totalGenerated += newTasks.length;
          console.log(`Generated ${newTasks.length} instances for parent ${parent.id}`);
        }

        // Copy assignees from parent to new instances
        const { data: newTaskIds } = await supabase
          .from("tasks")
          .select("id")
          .eq("parent_task_id", parent.id)
          .order("recurrence_index", { ascending: false })
          .limit(newTasks.length);

        if (newTaskIds && newTaskIds.length > 0) {
          const { data: parentAssignees } = await supabase
            .from("task_assignees")
            .select("user_id, assigned_by")
            .eq("task_id", parent.id);

          if (parentAssignees && parentAssignees.length > 0) {
            const assigneeInserts = newTaskIds.flatMap((task) =>
              parentAssignees.map((a) => ({
                task_id: task.id,
                user_id: a.user_id,
                assigned_by: a.assigned_by,
              }))
            );

            await supabase.from("task_assignees").insert(assigneeInserts);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, generated: totalGenerated }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating recurring tasks:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
