-- Create exam_notices table
CREATE TABLE IF NOT EXISTS exam_notices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL, -- references classes(id)
    subject_name TEXT NOT NULL,
    exam_title TEXT NOT NULL,
    exam_date DATE NOT NULL,
    exam_time TIME NOT NULL,
    room_number TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- If classes table exists, add foreign key constraint
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name = 'classes'
    ) THEN
        ALTER TABLE exam_notices 
        ADD CONSTRAINT fk_exam_notices_class 
        FOREIGN KEY (class_id) REFERENCES classes(id) 
        ON DELETE CASCADE;
    END IF;
END $$;

-- Update gradebooks table with status column
ALTER TABLE gradebooks 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft' 
CHECK (status IN ('draft', 'published'));
