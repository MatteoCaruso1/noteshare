-- Add gig_id column to notifications table for gig reminders
ALTER TABLE public.notifications
ADD COLUMN gig_id uuid REFERENCES public.promo_posts(id) ON DELETE CASCADE;