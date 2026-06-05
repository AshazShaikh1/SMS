import { isFirebaseConfigured, db } from "../firebase";
import { collection, query, where, getDocs, doc, setDoc } from "firebase/firestore";
import { getMockAttendance, saveMockAttendance, AttendanceRecord } from "./mockDb";

/**
 * Fetch attendance list for a specific class and date
 */
export async function fetchAttendance(
  grade: string,
  section: string,
  date: string
): Promise<AttendanceRecord | null> {
  if (isFirebaseConfigured && db) {
    try {
      const attendanceRef = collection(db, "attendance");
      const q = query(
        attendanceRef,
        where("grade_level", "==", grade),
        where("section", "==", section),
        where("date", "==", date)
      );
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const docSnap = querySnapshot.docs[0];
        return { _id: docSnap.id, ...docSnap.data() } as unknown as AttendanceRecord;
      }
      return null;
    } catch (error) {
      console.error("Error fetching attendance from Firestore:", error);
    }
  }

  // Fallback to Mock DB
  const list = getMockAttendance();
  const found = list.find(
    (record) =>
      record.grade_level === grade && record.section === section && record.date === date
  );
  return found || null;
}

/**
 * Persists an attendance sheet (defaulting absent/late status mapping)
 */
export async function saveAttendance(
  grade: string,
  section: string,
  date: string,
  records: Record<string, "present" | "absent" | "late">
): Promise<boolean> {
  const docId = `ATT_${date}_G${grade}_S${section}`;

  if (isFirebaseConfigured && db) {
    try {
      const attendanceRef = doc(db, "attendance", docId);
      await setDoc(attendanceRef, {
        date,
        grade_level: grade,
        section: section.toUpperCase(),
        records,
      });
      return true;
    } catch (error) {
      console.error("Error saving attendance to Firestore:", error);
      return false;
    }
  }

  // Fallback to Mock DB
  const list = getMockAttendance();
  const index = list.findIndex(
    (r) => r.grade_level === grade && r.section === section && r.date === date
  );
  const newRecord: AttendanceRecord = {
    date,
    grade_level: grade,
    section: section.toUpperCase(),
    records,
  };

  if (index !== -1) {
    list[index] = newRecord;
  } else {
    list.push(newRecord);
  }

  saveMockAttendance(list);
  return true;
}

/**
 * Fetch all attendance records for a specific class to compute historical averages
 */
export async function fetchClassAttendanceHistory(
  grade: string,
  section: string
): Promise<AttendanceRecord[]> {
  if (isFirebaseConfigured && db) {
    try {
      const attendanceRef = collection(db, "attendance");
      const q = query(
        attendanceRef,
        where("grade_level", "==", grade),
        where("section", "==", section)
      );
      const querySnapshot = await getDocs(q);
      const records: AttendanceRecord[] = [];
      querySnapshot.forEach((docSnap) => {
        records.push({ _id: docSnap.id, ...docSnap.data() } as unknown as AttendanceRecord);
      });
      return records;
    } catch (error) {
      console.error("Error fetching class attendance history from Firestore:", error);
    }
  }

  // Fallback to Mock DB
  const list = getMockAttendance();
  return list.filter(
    (record) => record.grade_level === grade && record.section === section
  );
}
