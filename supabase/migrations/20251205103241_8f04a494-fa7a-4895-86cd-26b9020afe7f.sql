-- Add address column to client_profiles for SafetyWidget home functionality
ALTER TABLE public.client_profiles 
ADD COLUMN IF NOT EXISTS address text;