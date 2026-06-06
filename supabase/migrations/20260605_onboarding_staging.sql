-- Migration: Add onboarding_staging table for Phase 1/2 deferred school onboarding.
-- Run this in your Supabase SQL Editor to apply this change.

-- 1. Create onboarding_staging Table
CREATE TABLE IF NOT EXISTS public.onboarding_staging (
    school_id UUID PRIMARY KEY REFERENCES public.schools(id) ON DELETE CASCADE,
    staged_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable Row-Level Security (RLS)
ALTER TABLE public.onboarding_staging ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS isolation policy
-- Admins/Users inside profiles can read/write their school's staging rows
DROP POLICY IF EXISTS onboarding_staging_policy ON public.onboarding_staging;
CREATE POLICY onboarding_staging_policy ON public.onboarding_staging
    FOR ALL USING (school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid()));

