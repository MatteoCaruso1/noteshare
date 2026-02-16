
-- Add optional column to store how many days before the event to repost as a reminder
ALTER TABLE public.promo_posts
ADD COLUMN repost_reminder_days integer DEFAULT NULL;

-- Add a comment for clarity
COMMENT ON COLUMN public.promo_posts.repost_reminder_days IS 'Number of days before event_date to repost gig on timeline as reminder to followers. NULL means no repost reminder.';
