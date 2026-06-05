-- ============================================================================
-- Multi-Tenant School Management System Database Schema (Supabase/PostgreSQL)
-- ============================================================================
-- Optimized for production. All creations use IF NOT EXISTS / check-guard patterns
-- to prevent transaction crashes during multi-stage redeployments.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 🏛️ 1. Table Definitions
-- ----------------------------------------------------------------------------

-- 1.1 schools Table
CREATE TABLE IF NOT EXISTS public.schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_name TEXT NOT NULL,
    subscription_tier TEXT NOT NULL CHECK (subscription_tier IN ('trial', 'premium', 'enterprise')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 1.2 profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'student', 'parent', 'developer')),
    phone_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 1.3 classes Table
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    grade_level TEXT NOT NULL,
    section TEXT NOT NULL,
    base_fee_amount NUMERIC(12, 2) NOT NULL CHECK (base_fee_amount >= 0),
    instructor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_grade_section_per_school UNIQUE (school_id, grade_level, section)
);

-- 1.4 students Table
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    parent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
    roll_number INT4 NOT NULL,
    fee_modifiers JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_roll_per_class UNIQUE (class_id, roll_number)
);

-- 1.5 gradebooks Table
CREATE TABLE IF NOT EXISTS public.gradebooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    assessment_name TEXT NOT NULL,
    assessment_type TEXT NOT NULL CHECK (assessment_type IN ('mock_test', 'formal_exam')),
    total_marks NUMERIC(5, 2) NOT NULL CHECK (total_marks > 0),
    weight_percentage NUMERIC(5, 2) NOT NULL CHECK (weight_percentage >= 0 AND weight_percentage <= 100),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    scores JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 1.6 exam_notices Table
CREATE TABLE IF NOT EXISTS public.exam_notices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    subject_name TEXT NOT NULL,
    exam_title TEXT NOT NULL,
    exam_date DATE NOT NULL,
    exam_time TIME NOT NULL,
    room_number TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 1.7 onboarding_staging Table
CREATE TABLE IF NOT EXISTS public.onboarding_staging (
    school_id UUID PRIMARY KEY REFERENCES public.schools(id) ON DELETE CASCADE,
    staged_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ----------------------------------------------------------------------------
-- ⚡ 2. Helper Functions to Prevent Infinite RLS Recursion Loops
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_user_school(user_id UUID)
RETURNS UUID AS $$
  SELECT school_id FROM public.profiles WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- ----------------------------------------------------------------------------
-- 🔐 3. Row-Level Security (RLS) Configuration & Policies
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gradebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_staging ENABLE ROW LEVEL SECURITY;

-- 3.1 Standard Multi-Tenant Isolation Policies
DROP POLICY IF EXISTS profile_isolation_policy ON public.profiles;
CREATE POLICY profile_isolation_policy ON public.profiles
    FOR ALL USING (school_id = public.get_user_school(auth.uid()));

DROP POLICY IF EXISTS class_isolation_policy ON public.classes;
CREATE POLICY class_isolation_policy ON public.classes
    FOR ALL USING (school_id = public.get_user_school(auth.uid()));

DROP POLICY IF EXISTS student_isolation_policy ON public.students;
CREATE POLICY student_isolation_policy ON public.students
    FOR ALL USING (school_id = public.get_user_school(auth.uid()));

DROP POLICY IF EXISTS gradebook_read_policy ON public.gradebooks;
CREATE POLICY gradebook_read_policy ON public.gradebooks
    FOR SELECT USING (
        school_id = public.get_user_school(auth.uid()) 
        AND (status = 'published' OR public.get_user_role(auth.uid()) IN ('admin', 'teacher'))
    );

DROP POLICY IF EXISTS gradebook_modify_policy ON public.gradebooks;
CREATE POLICY gradebook_modify_policy ON public.gradebooks
    FOR ALL USING (
        school_id = public.get_user_school(auth.uid()) 
        AND public.get_user_role(auth.uid()) IN ('admin', 'teacher')
    );

DROP POLICY IF EXISTS exam_notice_policy ON public.exam_notices;
CREATE POLICY exam_notice_policy ON public.exam_notices
    FOR ALL USING (school_id = public.get_user_school(auth.uid()));

DROP POLICY IF EXISTS onboarding_staging_policy ON public.onboarding_staging;
CREATE POLICY onboarding_staging_policy ON public.onboarding_staging
    FOR ALL USING (school_id = public.get_user_school(auth.uid()));

-- 3.2 Developer God-Mode Whitelist Policies (Bypasses School Isolation)
DROP POLICY IF EXISTS dev_god_mode ON public.profiles;
CREATE POLICY dev_god_mode ON public.profiles FOR ALL USING 
    (public.get_user_role(auth.uid()) = 'developer');

DROP POLICY IF EXISTS dev_god_mode ON public.classes;
CREATE POLICY dev_god_mode ON public.classes FOR ALL USING 
    (public.get_user_role(auth.uid()) = 'developer');

DROP POLICY IF EXISTS dev_god_mode ON public.students;
CREATE POLICY dev_god_mode ON public.students FOR ALL USING 
    (public.get_user_role(auth.uid()) = 'developer');

DROP POLICY IF EXISTS dev_god_mode ON public.gradebooks;
CREATE POLICY dev_god_mode ON public.gradebooks FOR ALL USING 
    (public.get_user_role(auth.uid()) = 'developer');

DROP POLICY IF EXISTS dev_god_mode ON public.exam_notices;
CREATE POLICY dev_god_mode ON public.exam_notices FOR ALL USING 
    (public.get_user_role(auth.uid()) = 'developer');

DROP POLICY IF EXISTS dev_god_mode ON public.onboarding_staging;
CREATE POLICY dev_god_mode ON public.onboarding_staging FOR ALL USING 
    (public.get_user_role(auth.uid()) = 'developer');

-- ----------------------------------------------------------------------------
-- ⚡ 4. Performance Optimization Indexes
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_profiles_school ON public.profiles(school_id);
CREATE INDEX IF NOT EXISTS idx_classes_school_instructor ON public.classes(school_id, instructor_id);
CREATE INDEX IF NOT EXISTS idx_students_class ON public.students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_parent ON public.students(parent_id);
CREATE INDEX IF NOT EXISTS idx_gradebooks_class_status ON public.gradebooks(class_id, status);
CREATE INDEX IF NOT EXISTS idx_exam_notices_class_date ON public.exam_notices(class_id, exam_date);

-- ----------------------------------------------------------------------------
-- 🔑 5. API Gateway Role Permissions Config
-- ----------------------------------------------------------------------------
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 🏛️ 6. Default Developer Placeholder School Configuration
-- ----------------------------------------------------------------------------
INSERT INTO public.schools (id, school_name, subscription_tier, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'System Developer Operations',
  'enterprise',
  true
)
ON CONFLICT (id) DO NOTHING;
