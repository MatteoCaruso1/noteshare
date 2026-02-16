
-- Allow collaborators to update projects they're added to
CREATE POLICY "Collaborators can update their projects"
ON public.projects
FOR UPDATE
USING (
  (auth.uid())::text IN (
    SELECT (p.user_id)::text
    FROM profiles p
    WHERE p.id = ANY (projects.collaborator_ids)
  )
);

-- Allow collaborators to view notes in their collaborated projects
CREATE POLICY "Collaborators can view notes in collaborated projects"
ON public.notes
FOR SELECT
USING (
  project_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = notes.project_id
    AND (
      (auth.uid())::text IN (
        SELECT (p.user_id)::text
        FROM profiles p
        WHERE p.id = ANY (projects.collaborator_ids)
      )
    )
  )
);
