
-- 1. Transactions table (no duplicated buyer/listing fields)
CREATE TABLE public.transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  buyer_id uuid REFERENCES public.buyers(id) ON DELETE SET NULL,
  listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  state text NOT NULL DEFAULT 'draft',
  target_close_date date,
  financing_type text,
  property_type text,
  has_hoa boolean DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_state CHECK (state IN ('draft','under_contract','in_escrow','pending_close','closed','fell_through')),
  CONSTRAINT must_link_buyer_or_listing CHECK (buyer_id IS NOT NULL OR listing_id IS NOT NULL)
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage their transactions" ON public.transactions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Team members can view team transactions" ON public.transactions FOR SELECT USING (shared_team(auth.uid(), user_id));
CREATE POLICY "Team members can update team transactions" ON public.transactions FOR UPDATE USING (shared_team(auth.uid(), user_id));

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. State history (auto-populated by trigger)
CREATE TABLE public.transaction_state_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  from_state text,
  to_state text NOT NULL,
  changed_by uuid NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  note text
);

ALTER TABLE public.transaction_state_history ENABLE ROW LEVEL SECURITY;

-- Owner + team can view and insert history
CREATE POLICY "Owner can view state history" ON public.transaction_state_history FOR SELECT USING (
  transaction_id IN (SELECT id FROM public.transactions WHERE user_id = auth.uid())
);
CREATE POLICY "Team can view state history" ON public.transaction_state_history FOR SELECT USING (
  transaction_id IN (SELECT id FROM public.transactions WHERE shared_team(auth.uid(), user_id))
);
CREATE POLICY "Owner can insert state history" ON public.transaction_state_history FOR INSERT WITH CHECK (
  transaction_id IN (SELECT id FROM public.transactions WHERE user_id = auth.uid())
);
CREATE POLICY "Team can insert state history" ON public.transaction_state_history FOR INSERT WITH CHECK (
  transaction_id IN (SELECT id FROM public.transactions WHERE shared_team(auth.uid(), user_id))
);

-- 3. Trigger: auto-log state changes to history
CREATE OR REPLACE FUNCTION public.log_transaction_state_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.state IS DISTINCT FROM NEW.state THEN
    INSERT INTO public.transaction_state_history (transaction_id, from_state, to_state, changed_by)
    VALUES (NEW.id, OLD.state, NEW.state, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_transaction_state_change
AFTER UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.log_transaction_state_change();

-- 4. Task templates
CREATE TABLE public.transaction_task_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  trigger_state text NOT NULL,
  due_anchor text NOT NULL DEFAULT 'state_entry',
  due_offset_days integer NOT NULL DEFAULT 0,
  priority text NOT NULL DEFAULT 'medium',
  conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_trigger_state CHECK (trigger_state IN ('draft','under_contract','in_escrow','pending_close','closed','fell_through')),
  CONSTRAINT valid_due_anchor CHECK (due_anchor IN ('state_entry','target_close')),
  CONSTRAINT valid_priority CHECK (priority IN ('high','medium','low'))
);

ALTER TABLE public.transaction_task_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Templates are readable by authenticated users" ON public.transaction_task_templates FOR SELECT USING (auth.uid() IS NOT NULL);

-- 5. Suggested tasks with unique guard (adjustment #4)
CREATE TABLE public.transaction_suggested_tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.transaction_task_templates(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  due_date date,
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'proposed',
  rule_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  accepted_task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_suggested_status CHECK (status IN ('proposed','accepted','dismissed')),
  CONSTRAINT valid_suggested_priority CHECK (priority IN ('high','medium','low')),
  CONSTRAINT uq_transaction_template UNIQUE (transaction_id, template_id)
);

ALTER TABLE public.transaction_suggested_tasks ENABLE ROW LEVEL SECURITY;

-- Owner policies
CREATE POLICY "Owner can manage suggested tasks" ON public.transaction_suggested_tasks FOR ALL USING (
  transaction_id IN (SELECT id FROM public.transactions WHERE user_id = auth.uid())
) WITH CHECK (
  transaction_id IN (SELECT id FROM public.transactions WHERE user_id = auth.uid())
);
-- Team SELECT + UPDATE (adjustment #1)
CREATE POLICY "Team can view suggested tasks" ON public.transaction_suggested_tasks FOR SELECT USING (
  transaction_id IN (SELECT id FROM public.transactions WHERE shared_team(auth.uid(), user_id))
);
CREATE POLICY "Team can update suggested tasks" ON public.transaction_suggested_tasks FOR UPDATE USING (
  transaction_id IN (SELECT id FROM public.transactions WHERE shared_team(auth.uid(), user_id))
);

CREATE TRIGGER update_suggested_tasks_updated_at BEFORE UPDATE ON public.transaction_suggested_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Seed templates: Under Contract
INSERT INTO public.transaction_task_templates (title, description, trigger_state, due_anchor, due_offset_days, priority, conditions, sort_order) VALUES
('Send executed contract to title company', NULL, 'under_contract', 'state_entry', 1, 'high', '{}', 1),
('Open escrow', NULL, 'under_contract', 'state_entry', 2, 'high', '{}', 2),
('Submit earnest money deposit', NULL, 'under_contract', 'state_entry', 3, 'high', '{}', 3),
('Order home inspection', NULL, 'under_contract', 'state_entry', 3, 'high', '{}', 4),
('Order appraisal', 'Only for financed deals', 'under_contract', 'state_entry', 5, 'high', '{"financing_type":["conventional","fha","va","usda"]}', 5),
('Confirm HOA documents requested', 'Only for HOA properties', 'under_contract', 'state_entry', 3, 'medium', '{"has_hoa":true}', 6),
('Schedule termite/pest inspection', NULL, 'under_contract', 'state_entry', 5, 'medium', '{}', 7),
('Verify loan application submitted', 'Only for financed deals', 'under_contract', 'state_entry', 5, 'medium', '{"financing_type":["conventional","fha","va","usda"]}', 8),
('Send introduction to lender', 'Only for financed deals', 'under_contract', 'state_entry', 1, 'medium', '{"financing_type":["conventional","fha","va","usda"]}', 9),
('Confirm title search ordered', NULL, 'under_contract', 'state_entry', 3, 'medium', '{}', 10);

-- Seed templates: In Escrow
INSERT INTO public.transaction_task_templates (title, description, trigger_state, due_anchor, due_offset_days, priority, conditions, sort_order) VALUES
('Review inspection report with client', NULL, 'in_escrow', 'state_entry', 2, 'high', '{}', 1),
('Submit repair requests if applicable', NULL, 'in_escrow', 'state_entry', 3, 'high', '{}', 2),
('Confirm appraisal completed', 'Only for financed deals', 'in_escrow', 'state_entry', 5, 'high', '{"financing_type":["conventional","fha","va","usda"]}', 3),
('Review preliminary title report', NULL, 'in_escrow', 'state_entry', 5, 'medium', '{}', 4),
('Confirm loan approval / clear to close', 'Only for financed deals', 'in_escrow', 'target_close', -10, 'high', '{"financing_type":["conventional","fha","va","usda"]}', 5),
('Review HOA documents with buyer', 'Only for HOA properties', 'in_escrow', 'state_entry', 7, 'medium', '{"has_hoa":true}', 6),
('Schedule final walkthrough', NULL, 'in_escrow', 'target_close', -3, 'high', '{}', 7),
('Confirm closing date and time with all parties', NULL, 'in_escrow', 'target_close', -5, 'high', '{}', 8),
('Review closing disclosure', 'Only for financed deals', 'in_escrow', 'target_close', -3, 'high', '{"financing_type":["conventional","fha","va","usda"]}', 9),
('Coordinate utility transfers', NULL, 'in_escrow', 'target_close', -2, 'low', '{}', 10);
