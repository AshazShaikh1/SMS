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
    const outstandingBalance = calculateOutstandingBalance(baseFee, modifiers);

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
