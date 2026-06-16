-- Database Migration: Add Separate Father Name and Mother Name Columns
-- Restructures schema to hold separate parent identity strings directly.

ALTER TABLE public.students 
  ADD COLUMN IF NOT EXISTS father_name TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS mother_name TEXT DEFAULT NULL;
