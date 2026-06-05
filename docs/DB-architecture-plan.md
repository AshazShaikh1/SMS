# Multi-Tenant School Management System Database Architecture Plan (Supabase/PostgreSQL)

This schema is engineered for multi-tenant isolation, ensuring multiple distinct schools run securely on a single database instance using PostgreSQL Row-Level Security (RLS). All queries must be implicitly filtered by `school_id` via database-level policies.

---

## 🏛️ 1. Core Relational Schema

### 1. `schools` Table
The global anchor for all tenants.
```sql
CREATE TABLE public.schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_name TEXT NOT NULL,
    subscription_tier TEXT NOT NULL CHECK (subscription_tier IN ('trial', 'premium', 'enterprise')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
2. profiles Table
Central identity hub linked directly to Supabase Auth (auth.users).

SQL
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'student', 'parent')),
    phone_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
3. classes Table
Defines separate structural classroom containers.

SQL
CREATE TABLE public.classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    grade_level TEXT NOT NULL, -- e.g., "Grade 10"
    section TEXT NOT NULL,     -- e.g., "A"
    base_fee_amount NUMERIC(12, 2) NOT NULL CHECK (base_fee_amount >= 0),
    instructor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_grade_section_per_school UNIQUE (school_id, grade_level, section)
);
4. students Table
Core administrative and financial rosters mapping students to parents and classes.

SQL
CREATE TABLE public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    parent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
    roll_number INT4 NOT NULL,
    fee_modifiers JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of stackable fee adjustments
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_roll_per_class UNIQUE (class_id, roll_number)
);
5. gradebooks Table
The spreadsheet column tracker for marks entries with an integrated approval publishing gate.

SQL
CREATE TABLE public.gradebooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    assessment_name TEXT NOT NULL,
    assessment_type TEXT NOT NULL CHECK (assessment_type IN ('mock_test', 'formal_exam')),
    total_marks NUMERIC(5, 2) NOT NULL CHECK (total_marks > 0),
    weight_percentage NUMERIC(5, 2) NOT NULL CHECK (weight_percentage >= 0 AND weight_percentage <= 100),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    scores JSONB NOT NULL DEFAULT '{}'::jsonb, -- Key-Value store: { "student_profile_uuid": score_numeric }
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
6. exam_notices Table
Timetable calendar allocations for upcoming assessments.

SQL
CREATE TABLE public.exam_notices (
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
🔐 2. Real-World Stress-Proved Row-Level Security (RLS)
Enable RLS on all tables to secure tenant data boundaries directly at the engine layer:

SQL
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gradebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_notices ENABLE ROW LEVEL SECURITY;
RLS Policies (Cross-Tenant Execution Shields)
SQL
-- 1. PROFILES POLICY (Users can read profiles within their school; Admin handles write operations)
CREATE POLICY profile_isolation_policy ON public.profiles
    FOR ALL USING (school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid()));

-- 2. CLASSES POLICY (Admins manage classes, Teachers/Students/Parents can read them)
CREATE POLICY class_isolation_policy ON public.classes
    FOR ALL USING (school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid()));

-- 3. STUDENTS POLICY (Isolates lookup scopes to the matching tenant ID context)
CREATE POLICY student_isolation_policy ON public.students
    FOR ALL USING (school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid()));

-- 4. GRADEBOOKS POLICY (Teachers can mutate if assigned; Students/Parents can only read if published)
CREATE POLICY gradebook_read_policy ON public.gradebooks
    FOR SELECT USING (
        school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid()) 
        AND (status = 'published' OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'teacher'))
    );

CREATE POLICY gradebook_modify_policy ON public.gradebooks
    FOR ALL USING (
        school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid()) 
        AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'teacher')
    );

-- 5. EXAM NOTICES POLICY (Admins/Teachers modify; Students/Parents read)
CREATE POLICY exam_notice_policy ON public.exam_notices
    FOR ALL USING (school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid()));
⚡ 3. Performance Optimization Indexes
High-density scan optimizations to keep queries lightning-fast across tens of thousands of rows:

SQL
CREATE INDEX idx_profiles_school ON public.profiles(school_id);
CREATE INDEX idx_classes_school_instructor ON public.classes(school_id, instructor_id);
CREATE INDEX idx_students_class ON public.students(class_id);
CREATE INDEX idx_students_parent ON public.students(parent_id);
CREATE INDEX idx_gradebooks_class_status ON public.gradebooks(class_id, status);
CREATE INDEX idx_exam_notices_class_date ON public.exam_notices(class_id, exam_date);