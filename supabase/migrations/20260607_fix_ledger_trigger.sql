-- Fix calculate_student_outstanding to accept student_profile_id instead of a students table record
DROP FUNCTION IF EXISTS public.calculate_student_outstanding(public.students) CASCADE;

CREATE OR REPLACE FUNCTION public.calculate_student_outstanding(student_profile_id UUID)
RETURNS NUMERIC AS $$
DECLARE
    student_record RECORD;
    base_fee NUMERIC;
    mod RECORD;
    positive_charges NUMERIC := 0;
    negative_discounts NUMERIC := 0;
    total_paid NUMERIC := 0;
    final_balance NUMERIC;
BEGIN
    -- Fetch student row
    SELECT * INTO student_record FROM public.students WHERE profile_id = student_profile_id;
    
    IF student_record.id IS NULL THEN
        RETURN 0;
    END IF;

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
    WHERE student_id = student_profile_id;

    -- Compute final remaining balance
    final_balance := base_fee + positive_charges - negative_discounts - total_paid;
    IF final_balance < 0 THEN
        final_balance := 0;
    END IF;

    RETURN ROUND(final_balance);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger function for students table
CREATE OR REPLACE FUNCTION public.sync_student_outstanding_trigger()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.profiles
    SET outstanding_balance = public.calculate_student_outstanding(NEW.profile_id)
    WHERE id = NEW.profile_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS student_outstanding_sync ON public.students;
CREATE TRIGGER student_outstanding_sync
AFTER INSERT OR UPDATE OF fee_modifiers, class_id ON public.students
FOR EACH ROW
EXECUTE FUNCTION public.sync_student_outstanding_trigger();

-- Recreate trigger function for fee_transactions table
CREATE OR REPLACE FUNCTION public.sync_transaction_outstanding_trigger()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.profiles
    SET outstanding_balance = public.calculate_student_outstanding(COALESCE(NEW.student_id, OLD.student_id))
    WHERE id = COALESCE(NEW.student_id, OLD.student_id);
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS transaction_outstanding_sync ON public.fee_transactions;
CREATE TRIGGER transaction_outstanding_sync
AFTER INSERT OR UPDATE OR DELETE ON public.fee_transactions
FOR EACH ROW
EXECUTE FUNCTION public.sync_transaction_outstanding_trigger();

-- Re-calculate and sync outstanding balance for all student profiles
UPDATE public.profiles p
SET outstanding_balance = public.calculate_student_outstanding(s.profile_id)
FROM public.students s
WHERE s.profile_id = p.id;
