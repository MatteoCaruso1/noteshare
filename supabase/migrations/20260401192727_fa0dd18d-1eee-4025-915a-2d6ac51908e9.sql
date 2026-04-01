CREATE OR REPLACE FUNCTION public.admin_note_counts(p_profile_ids uuid[])
RETURNS TABLE(profile_id uuid, note_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT author_id AS profile_id, count(*) AS note_count
  FROM public.notes
  WHERE author_id = ANY(p_profile_ids)
  GROUP BY author_id;
$$;