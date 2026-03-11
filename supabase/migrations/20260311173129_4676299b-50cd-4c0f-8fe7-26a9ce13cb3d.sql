
-- Function to generate suggested tasks when a transaction is created or state changes
CREATE OR REPLACE FUNCTION public.generate_transaction_suggested_tasks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _template RECORD;
  _record_type text;
  _due date;
BEGIN
  -- Determine record type
  IF NEW.buyer_id IS NOT NULL THEN
    _record_type := 'buyer';
  ELSIF NEW.listing_id IS NOT NULL THEN
    _record_type := 'listing';
  ELSE
    _record_type := 'general';
  END IF;

  -- Find matching templates for this state and record type
  FOR _template IN
    SELECT *
    FROM public.transaction_task_templates
    WHERE is_active = true
      AND trigger_state = NEW.state
      AND (
        conditions = '{}'::jsonb
        OR conditions->>'record_type' IS NULL
        OR conditions->>'record_type' = _record_type
      )
    ORDER BY sort_order
  LOOP
    -- Calculate due date
    IF _template.due_anchor = 'target_close' AND NEW.target_close_date IS NOT NULL THEN
      _due := NEW.target_close_date + (_template.due_offset_days * INTERVAL '1 day');
    ELSE
      _due := CURRENT_DATE + (_template.due_offset_days * INTERVAL '1 day');
    END IF;

    -- Insert suggested task (unique constraint prevents duplicates)
    INSERT INTO public.transaction_suggested_tasks (
      transaction_id, template_id, title, description, priority, due_date, rule_snapshot, status
    )
    VALUES (
      NEW.id,
      _template.id,
      _template.title,
      _template.description,
      _template.priority,
      _due,
      jsonb_build_object('trigger_state', _template.trigger_state, 'record_type', _record_type, 'due_anchor', _template.due_anchor, 'due_offset_days', _template.due_offset_days),
      'proposed'
    )
    ON CONFLICT (transaction_id, template_id) DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Trigger on INSERT
CREATE TRIGGER trg_generate_tasks_on_insert
  AFTER INSERT ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_transaction_suggested_tasks();

-- Trigger on state UPDATE
CREATE TRIGGER trg_generate_tasks_on_state_change
  AFTER UPDATE OF state ON public.transactions
  FOR EACH ROW
  WHEN (OLD.state IS DISTINCT FROM NEW.state)
  EXECUTE FUNCTION public.generate_transaction_suggested_tasks();
