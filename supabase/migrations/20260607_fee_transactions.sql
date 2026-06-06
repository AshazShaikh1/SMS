-- ============================================================================
-- SQL Migration: Provision public.fee_transactions and Sync Outstanding Balance
-- ============================================================================

-- 1. Create fee_transactions Table
CREATE TABLE IF NOT EXISTS public.fee_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount_paid NUMERIC NOT NULL CHECK (amount_paid > 0),
    payment_mode TEXT NOT NULL CHECK (payment_mode IN ('cash', 'upi', 'bank_transfer')),
    reference_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Add outstanding_balance Column to Profiles Table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS outstanding_balance NUMERIC NOT NULL DEFAULT 0;

-- 3. Enable RLS and Configure Policies
ALTER TABLE public.fee_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fee_transaction_isolation_policy ON public.fee_transactions;
CREATE POLICY fee_transaction_isolation_policy ON public.fee_transactions
    FOR ALL USING (school_id = public.get_user_school(auth.uid()));

DROP POLICY IF EXISTS dev_god_mode ON public.fee_transactions;
CREATE POLICY dev_god_mode ON public.fee_transactions
    FOR ALL USING (public.get_user_role(auth.uid()) = 'developer');

-- 4. Grant Permissions to API Gateways
GRANT ALL ON TABLE public.fee_transactions TO postgres, anon, authenticated, service_role;

-- 5. Helper function to calculate student outstanding balance dynamically
CREATE OR REPLACE FUNCTION public.calculate_student_outstanding(student_record public.students)
RETURNS NUMERIC AS $$
DECLARE
    base_fee NUMERIC;
    mod RECORD;
    positive_charges NUMERIC := 0;
    negative_discounts NUMERIC := 0;
    total_paid NUMERIC := 0;
    final_balance NUMERIC;
BEGIN
    -- Get class base fee amount
    SELECT COALESCE(base_fee_amount, 0) INTO base_fee
    FROM public.classes
    WHERE id = student_record.class_id;

    -- Loop over modifier JSONB objects
    FOR mod IN 
        SELECT * FROM jsonb_to_recordset(student_record.fee_modifiers) 
        AS x(type TEXT, value NUMERIC, application TEXT)
    LOOP
        DECLARE
            amount NUMERIC;
        BEGIN
            IF mod.type = 'percentage' THEN
                amount := (mod.value / 100.0) * base_fee;
            ELSE
                amount := mod.value;
            END IF;

            IF mod.application = 'charge' THEN
                positive_charges := positive_charges + amount;
            ELSE
                negative_discounts := negative_discounts + amount;
            END IF;
        END;
    END LOOP;

    -- Sum up payments from fee_transactions
    SELECT COALESCE(SUM(amount_paid), 0) INTO total_paid
    FROM public.fee_transactions
    WHERE student_id = student_record.profile_id;

    -- Compute final remaining balance
    final_balance := base_fee + positive_charges - negative_discounts - total_paid;
    IF final_balance < 0 THEN
        final_balance := 0;
    END IF;

    RETURN ROUND(final_balance);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Trigger Function for Students Table Modifications
CREATE OR REPLACE FUNCTION public.sync_student_outstanding_trigger()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.profiles
    SET outstanding_balance = public.calculate_student_outstanding(NEW)
    WHERE id = NEW.profile_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS student_outstanding_sync ON public.students;
CREATE TRIGGER student_outstanding_sync
AFTER INSERT OR UPDATE OF fee_modifiers, class_id ON public.students
FOR EACH ROW
EXECUTE FUNCTION public.sync_student_outstanding_trigger();

-- 7. Trigger Function for Fee Transactions Table Modifications
CREATE OR REPLACE FUNCTION public.sync_transaction_outstanding_trigger()
RETURNS TRIGGER AS $$
DECLARE
    s_rec RECORD;
BEGIN
    -- Find student record associated with transaction student_id
    SELECT * INTO s_rec FROM public.students WHERE profile_id = COALESCE(NEW.student_id, OLD.student_id);
    
    IF s_rec.id IS NOT NULL THEN
        UPDATE public.profiles
        SET outstanding_balance = public.calculate_student_outstanding(s_rec)
        WHERE id = s_rec.profile_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS transaction_outstanding_sync ON public.fee_transactions;
CREATE TRIGGER transaction_outstanding_sync
AFTER INSERT OR UPDATE OR DELETE ON public.fee_transactions
FOR EACH ROW
EXECUTE FUNCTION public.sync_transaction_outstanding_trigger();

-- 8. Populate outstanding_balance for all existing profiles of role = 'student'
UPDATE public.profiles p
SET outstanding_balance = public.calculate_student_outstanding(s)
FROM public.students s
WHERE s.profile_id = p.id;
