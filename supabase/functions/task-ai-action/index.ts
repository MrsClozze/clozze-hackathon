import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const VALID_ACTIONS = [
  'create_task',
  'create_follow_up',
  'update_notes',
  'save_draft',
  'update_status',
  'save_to_listing',
  'batch_create_tasks',
] as const;
type ActionType = typeof VALID_ACTIONS[number];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { taskId, action, payload } = body;

    if (!taskId || typeof taskId !== 'string') {
      throw new Error('taskId is required');
    }
    if (!action || !VALID_ACTIONS.includes(action)) {
      throw new Error(`Invalid action. Must be one of: ${VALID_ACTIONS.join(', ')}`);
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const authHeader = req.headers.get('authorization');
    if (!authHeader) throw new Error('No authorization header');

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error('Authentication failed');

    // Verify the task exists and belongs to the user
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, user_id, listing_id, buyer_id, title, due_date')
      .eq('id', taskId)
      .single();

    if (taskError || !task) throw new Error('Task not found');
    if (task.user_id !== user.id) throw new Error('Unauthorized');

    let result: any = {};

    switch (action as ActionType) {
      case 'create_task': {
        const { title, notes, dueDate, priority, listingId, buyerId } = payload || {};
        if (!title || typeof title !== 'string') throw new Error('Task title is required');

        const { data: newTask, error } = await supabase
          .from('tasks')
          .insert({
            user_id: user.id,
            title: title.substring(0, 500),
            notes: notes?.substring(0, 5000) || null,
            due_date: dueDate || null,
            priority: ['high', 'medium', 'low'].includes(priority) ? priority : 'medium',
            status: 'pending',
            listing_id: listingId || task.listing_id || null,
            buyer_id: buyerId || task.buyer_id || null,
            has_ai_assist: true,
            show_on_calendar: true,
          })
          .select()
          .single();

        if (error) throw error;
        result = { taskId: newTask.id, title: newTask.title };
        break;
      }

      case 'create_follow_up': {
        const { title, notes, daysFromNow, priority } = payload || {};
        if (!title || typeof title !== 'string') throw new Error('Follow-up title is required');

        // Calculate due date relative to now or parent task due date
        const baseDate = task.due_date ? new Date(task.due_date) : new Date();
        const offsetDays = typeof daysFromNow === 'number' ? daysFromNow : 3;
        const dueDate = new Date(baseDate);
        dueDate.setDate(dueDate.getDate() + offsetDays);

        const { data: newTask, error } = await supabase
          .from('tasks')
          .insert({
            user_id: user.id,
            title: title.substring(0, 500),
            notes: notes?.substring(0, 5000) || null,
            due_date: dueDate.toISOString(),
            date: dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            priority: ['high', 'medium', 'low'].includes(priority) ? priority : 'medium',
            status: 'pending',
            listing_id: task.listing_id || null,
            buyer_id: task.buyer_id || null,
            parent_task_id: taskId,
            has_ai_assist: true,
            show_on_calendar: true,
          })
          .select()
          .single();

        if (error) throw error;
        result = { taskId: newTask.id, title: newTask.title, dueDate: dueDate.toISOString() };
        break;
      }

      case 'batch_create_tasks': {
        const { tasks: taskItems } = payload || {};
        if (!Array.isArray(taskItems) || taskItems.length === 0) throw new Error('Tasks array is required');
        if (taskItems.length > 20) throw new Error('Maximum 20 tasks per batch');

        const created: any[] = [];
        for (const item of taskItems) {
          if (!item.title || typeof item.title !== 'string') continue;

          const dueDate = item.dueDate ? new Date(item.dueDate) : null;
          const { data: newTask, error } = await supabase
            .from('tasks')
            .insert({
              user_id: user.id,
              title: item.title.substring(0, 500),
              notes: item.notes?.substring(0, 5000) || null,
              due_date: dueDate ? dueDate.toISOString() : null,
              date: dueDate ? dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null,
              priority: ['high', 'medium', 'low'].includes(item.priority) ? item.priority : 'medium',
              status: 'pending',
              listing_id: item.listingId || task.listing_id || null,
              buyer_id: item.buyerId || task.buyer_id || null,
              parent_task_id: taskId,
              has_ai_assist: true,
              show_on_calendar: true,
            })
            .select('id, title')
            .single();

          if (!error && newTask) {
            created.push({ taskId: newTask.id, title: newTask.title });
          }
        }
        result = { created, count: created.length };
        break;
      }

      case 'update_notes': {
        const { notes, append } = payload || {};
        if (!notes || typeof notes !== 'string') throw new Error('Notes content is required');

        let finalNotes = notes.substring(0, 5000);
        if (append) {
          const { data: current } = await supabase
            .from('tasks')
            .select('notes')
            .eq('id', taskId)
            .single();
          finalNotes = (current?.notes ? current.notes + '\n\n' : '') + finalNotes;
        }

        const { error } = await supabase
          .from('tasks')
          .update({ notes: finalNotes })
          .eq('id', taskId);

        if (error) throw error;
        result = { updated: true };
        break;
      }

      case 'save_draft': {
        const { content, label } = payload || {};
        if (!content || typeof content !== 'string') throw new Error('Draft content is required');

        const prefix = label ? `[${label}] ` : '[AI Draft] ';
        const { data: current } = await supabase
          .from('tasks')
          .select('notes')
          .eq('id', taskId)
          .single();

        const finalNotes = (current?.notes ? current.notes + '\n\n---\n\n' : '') + prefix + content.substring(0, 5000);

        const { error } = await supabase
          .from('tasks')
          .update({ notes: finalNotes })
          .eq('id', taskId);

        if (error) throw error;
        result = { saved: true };
        break;
      }

      case 'update_status': {
        const { status } = payload || {};
        if (!['pending', 'in-progress', 'completed'].includes(status)) {
          throw new Error('Invalid status');
        }

        const { error } = await supabase
          .from('tasks')
          .update({ status })
          .eq('id', taskId);

        if (error) throw error;
        result = { updated: true, status };
        break;
      }

      case 'save_to_listing': {
        // Save AI-generated content to the linked listing record
        const { field, content } = payload || {};
        if (!content || typeof content !== 'string') throw new Error('Content is required');
        if (!task.listing_id) throw new Error('Task is not linked to a listing');

        // Only allow updating safe fields on listings
        const allowedFields: Record<string, string> = {
          'description': 'notes', // we don't have a description column, so save to task notes with label
        };

        // For now, save listing-related content to the task notes with clear labeling
        const label = field === 'description' ? '[Listing Description]' : `[Listing: ${field || 'content'}]`;
        const { data: current } = await supabase
          .from('tasks')
          .select('notes')
          .eq('id', taskId)
          .single();

        const finalNotes = (current?.notes ? current.notes + '\n\n---\n\n' : '') + `${label}\n${content.substring(0, 5000)}`;

        const { error } = await supabase
          .from('tasks')
          .update({ notes: finalNotes })
          .eq('id', taskId);

        if (error) throw error;
        result = { saved: true, field: field || 'notes' };
        break;
      }
    }

    // Log the action
    await supabase.from('task_ai_actions_log').insert({
      task_id: taskId,
      user_id: user.id,
      action_type: action,
      action_payload: payload || {},
      result,
    });

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Task AI action error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
