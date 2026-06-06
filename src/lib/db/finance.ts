import { supabase } from "../supabase/client";

export interface FeeModifier {
  id: string;
  label: string;
  type: "percentage" | "fixed_amount";
  value: number; // e.g. 20 for percentage, 5000 for currency adjustments
  application: "charge" | "discount";
}

/**
 * Calculates the final outstanding balance based on base fee and stackable modifiers.
 */
export function calculateOutstandingBalance(baseFee: number, modifiers: FeeModifier[]): number {
  let positiveCharges = 0;
  let negativeDiscounts = 0;

  for (const mod of modifiers) {
    const amount = mod.type === "percentage" ? (mod.value / 100) * baseFee : mod.value;
    
    if (mod.application === "charge") {
      positiveCharges += amount;
    } else {
      negativeDiscounts += amount;
    }
  }

  const finalBalance = baseFee + positiveCharges - negativeDiscounts;
  return Math.max(0, Math.round(finalBalance)); // Rounded to nearest whole number, never negative
}

/**
 * Retrieves a student's current financial ledger information.
 */
export async function getStudentLedger(studentId: string): Promise<{
  baseFee: number;
  modifiers: FeeModifier[];
  outstandingBalance: number;
} | null> {
  try {
    const { data, error } = await supabase
      .from("students")
      .select(`
        id,
        fee_modifiers,
        profile:profiles!students_profile_id_fkey(outstanding_balance),
        class:classes!students_class_id_fkey(base_fee_amount)
      `)
      .eq("id", studentId)
      .single();

    if (error || !data) {
      console.error("Error reading student ledger from Supabase:", error);
      return null;
    }

    const baseFee = Number((data.class as any)?.base_fee_amount) || 0;
    const modifiers = (data.fee_modifiers as FeeModifier[]) || [];
    const outstandingBalance = (data.profile as any)?.outstanding_balance !== undefined && (data.profile as any)?.outstanding_balance !== null
      ? Number((data.profile as any).outstanding_balance)
      : calculateOutstandingBalance(baseFee, modifiers);

    return {
      baseFee,
      modifiers,
      outstandingBalance,
    };
  } catch (e) {
    console.error("Failed to fetch student ledger:", e);
    return null;
  }
}

/**
 * Updates a student's fee modifiers and computes the outstanding balance deterministically.
 */
export async function updateStudentLedger(studentId: string, modifiers: FeeModifier[]): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("students")
      .update({
        fee_modifiers: modifiers,
      })
      .eq("id", studentId);

    if (error) {
      console.error("Error writing student ledger update to Supabase:", error);
      return false;
    }
    return true;
  } catch (e) {
    console.error("Failed to update student ledger:", e);
    return false;
  }
}

export interface FeeTransaction {
  id: string;
  school_id: string;
  student_id: string;
  amount_paid: number;
  payment_mode: "cash" | "upi" | "bank_transfer";
  reference_number?: string;
  created_at: string;
}

/**
 * Records a successful payment transaction in the database.
 */
export async function recordPayment(payment: {
  schoolId: string;
  studentId: string; // references profile_id
  amountPaid: number;
  paymentMode: "cash" | "upi" | "bank_transfer";
  referenceNumber?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("fee_transactions")
      .insert({
        school_id: payment.schoolId,
        student_id: payment.studentId,
        amount_paid: payment.amountPaid,
        payment_mode: payment.paymentMode,
        reference_number: payment.referenceNumber || null,
      });

    if (error) {
      console.error("Error inserting fee transaction:", error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (e: any) {
    console.error("Failed to record payment:", e);
    return { success: false, error: e.message };
  }
}

/**
 * Fetches the transaction log history for a student profile.
 */
export async function fetchTransactionsForStudent(studentProfileId: string): Promise<FeeTransaction[]> {
  try {
    const { data, error } = await supabase
      .from("fee_transactions")
      .select("*")
      .eq("student_id", studentProfileId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching transactions:", error);
      return [];
    }
    return data || [];
  } catch (e) {
    console.error("Failed to fetch student transactions:", e);
    return [];
  }
}

