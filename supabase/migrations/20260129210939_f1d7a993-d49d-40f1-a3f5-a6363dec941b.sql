-- Add missing DELETE policy to team_member_slots table
CREATE POLICY "Users can delete their own team member slots"
ON public.team_member_slots
FOR DELETE
USING (auth.uid() = user_id);