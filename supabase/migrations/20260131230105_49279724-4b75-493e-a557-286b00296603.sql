-- Fix member_count default: should start at 0, trigger will set to 1 when owner joins
ALTER TABLE public.groups ALTER COLUMN member_count SET DEFAULT 0;

-- Fix existing groups that have incorrect member counts
UPDATE public.groups g
SET member_count = (
  SELECT COUNT(*) 
  FROM public.group_members gm 
  WHERE gm.group_id = g.id AND gm.status = 'active'
);