-- Add new columns to goals table for enhanced goals system
ALTER TABLE public.goals 
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS progress_type TEXT DEFAULT 'checkbox',
ADD COLUMN IF NOT EXISTS target_steps INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS current_steps INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS target_minutes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_minutes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reflection TEXT;

-- Migrate existing content to title
UPDATE public.goals SET title = content WHERE title IS NULL;