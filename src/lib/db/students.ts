import { isFirebaseConfigured, db } from "../firebase";
import { collection, query, where, getDocs, writeBatch, doc } from "firebase/firestore";
import { getMockStudents, saveMockStudents, getBaseFee, Student } from "./mockDb";

/**
 * Fetch students, filtered optional by grade level and section mapping
 */
export async function fetchStudents(grade?: string, section?: string): Promise<Student[]> {
  if (isFirebaseConfigured && db) {
    try {
      const studentsRef = collection(db, "students");
      let q = query(studentsRef);
      
      if (grade && section) {
        q = query(studentsRef, 
          where("academic_mapping.current_grade", "==", grade),
          where("academic_mapping.section", "==", section)
        );
      } else if (grade) {
        q = query(studentsRef, where("academic_mapping.current_grade", "==", grade));
      }

      const querySnapshot = await getDocs(q);
      const list: Student[] = [];
      querySnapshot.forEach((docSnap) => {
        list.push({ _id: docSnap.id, ...docSnap.data() } as Student);
      });
      return list;
    } catch (error) {
      console.error("Error fetching students from Firestore:", error);
    }
  }

  // Fallback to Mock DB
  let list = getMockStudents();
  if (grade) {
    list = list.filter((s) => s.academic_mapping.current_grade === grade);
  }
  if (section) {
    list = list.filter((s) => s.academic_mapping.section === section);
  }
  return list;
}

/**
 * Bulk ingestion of student records via parsed CSV rows
 * Processes elements in transactions or batch operations
 */
export async function importStudentsCSV(
  rows: {
    first_name: string;
    last_name: string;
    roll_number: number;
    current_grade: string;
    section: string;
    parent_id?: string;
  }[]
): Promise<{ success: boolean; count: number }> {
  const processedStudents: Student[] = rows.map((row, idx) => {
    const studentId = `STU_${Math.floor(100000 + Math.random() * 900000)}`;
    const baseFee = getBaseFee(row.current_grade);
    
    return {
      _id: studentId,
      personal_details: {
        first_name: row.first_name,
        last_name: row.last_name,
        roll_number: Number(row.roll_number) || (idx + 1),
        parent_id: row.parent_id || `PAR_${Math.floor(100000 + Math.random() * 900000)}`,
      },
      academic_mapping: {
        current_grade: row.current_grade,
        section: row.section.toUpperCase(),
        assigned_subjects: ["MATH_101", "SCI_202", "ENG_303"], // Default subject suite
      },
      financial_ledger: {
        base_fee_package_id: `PKG_GRADE_${row.current_grade}`,
        custom_modifiers: [],
        current_outstanding_balance: baseFee,
      },
    };
  });

  if (isFirebaseConfigured && db) {
    try {
      const batch = writeBatch(db);
      processedStudents.forEach((student) => {
        const studentRef = doc(db, "students", student._id);
        const { _id, ...rest } = student;
        batch.set(studentRef, rest);
      });
      await batch.commit();
      return { success: true, count: processedStudents.length };
    } catch (error) {
      console.error("Error during Firestore batch student import:", error);
      return { success: false, count: 0 };
    }
  }

  // Fallback to Mock DB
  const currentStudents = getMockStudents();
  const updatedStudents = [...currentStudents, ...processedStudents];
  saveMockStudents(updatedStudents);
  return { success: true, count: processedStudents.length };
}
