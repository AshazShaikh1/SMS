-- Migration: Provision teacher allocations junction table
-- Bypasses error if table already exists since it has been pre-run.

CREATE TABLE IF NOT EXISTS public.teacher_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    subject_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_teacher_class_subject UNIQUE (teacher_id, class_id, subject_name)
);

ALTER TABLE public.teacher_allocations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'teacher_allocation_policy' 
          AND tablename = 'teacher_allocations'
    ) THEN
        CREATE POLICY teacher_allocation_policy ON public.teacher_allocations
            FOR ALL USING (school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid()));
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_teacher_allocations_teacher ON public.teacher_allocations(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_allocations_class ON public.teacher_allocations(class_id);
