-- Add goal_id column to notes table
ALTER TABLE public.notes ADD COLUMN goal_id uuid REFERENCES public.goals(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_notes_goal_id ON public.notes(goal_id);

-- Add RLS policy for notes linked to goals
CREATE POLICY "Users can view notes linked to their goals"
ON public.notes
FOR SELECT
USING (
  goal_id IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM goals 
    WHERE goals.id = notes.goal_id 
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = goals.user_id 
      AND profiles.user_id = auth.uid()
    )
  )
);