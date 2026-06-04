import { isFirebaseConfigured, db } from "../firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { getMockStudents, saveMockStudents, getBaseFee, Student } from "./mockDb";

export interface FeeModifier {
  id: string;
  label: string;
  type: "percentage" | "fixed_amount";
  value: number; // e.g., 20 for percentage, 5000 for currency adjustments
  application: "charge" | "discount";
}

/**
 * Calculates the final outstanding balance based on base fee and stackable modifiers
 * Formula:
 * - Start with base fee
 * - Apply charges (+ fixed, + percentage calculated from base fee)
 * - Apply discounts (- fixed, - percentage calculated from base fee)
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
 * Retrieves a student's current financial ledger information
 */
export async function getStudentLedger(studentId: string): Promise<{
  baseFee: number;
  modifiers: FeeModifier[];
  outstandingBalance: number;
} | null> {
  if (isFirebaseConfigured && db) {
    try {
      const studentDoc = await getDoc(doc(db, "students", studentId));
      if (studentDoc.exists()) {
        const data = studentDoc.data() as Student;
        const baseFee = getBaseFee(data.academic_mapping.current_grade);
        const modifiers = data.financial_ledger?.custom_modifiers || [];
        return {
          baseFee,
          modifiers,
          outstandingBalance: data.financial_ledger?.current_outstanding_balance ?? baseFee,
        };
      }
    } catch (error) {
      console.error("Error reading student ledger from Firestore:", error);
    }
  }

  // Fallback to Mock DB
  const students = getMockStudents();
  const student = students.find((s) => s._id === studentId);
  if (student) {
    const baseFee = getBaseFee(student.academic_mapping.current_grade);
    const modifiers = student.financial_ledger.custom_modifiers || [];
    return {
      baseFee,
      modifiers,
      outstandingBalance: student.financial_ledger.current_outstanding_balance,
    };
  }

  return null;
}

/**
 * Updates a student's fee modifiers and computes the outstanding balance deterministically
 */
export async function updateStudentLedger(studentId: string, modifiers: FeeModifier[]): Promise<boolean> {
  if (isFirebaseConfigured && db) {
    try {
      const studentDocRef = doc(db, "students", studentId);
      const studentDoc = await getDoc(studentDocRef);
      if (studentDoc.exists()) {
        const data = studentDoc.data() as Student;
        const baseFee = getBaseFee(data.academic_mapping.current_grade);
        const newBalance = calculateOutstandingBalance(baseFee, modifiers);
        
        await updateDoc(studentDocRef, {
          "financial_ledger.custom_modifiers": modifiers,
          "financial_ledger.current_outstanding_balance": newBalance,
        });
        return true;
      }
    } catch (error) {
      console.error("Error writing student ledger update to Firestore:", error);
      return false;
    }
  }

  // Fallback to Mock DB
  const students = getMockStudents();
  const index = students.findIndex((s) => s._id === studentId);
  if (index !== -1) {
    const student = students[index];
    const baseFee = getBaseFee(student.academic_mapping.current_grade);
    const newBalance = calculateOutstandingBalance(baseFee, modifiers);
    
    students[index] = {
      ...student,
      financial_ledger: {
        ...student.financial_ledger,
        custom_modifiers: modifiers,
        current_outstanding_balance: newBalance,
      },
    };
    saveMockStudents(students);
    return true;
  }

  return false;
}
