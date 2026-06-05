import { supabase, getActiveUserSchoolId } from "../supabase/client";
import { Student } from "./mockDb";
import { calculateOutstandingBalance } from "./finance";

/**
 * Fetch students, filtered optionally by grade level and section mapping.
 */
export async function fetchStudents(grade?: string, section?: string): Promise<Student[]> {
  try {
    const schoolId = await getActiveUserSchoolId();
    if (!schoolId) return [];

    let queryBuilder = supabase
      .from("students")
      .select(`
        id,
        roll_number,
        fee_modifiers,
        parent_id,
        profile:profiles!students_profile_id_fkey(full_name, email),
        class:classes!students_class_id_fkey(id, grade_level, section, base_fee_amount)
      `)
      .eq("school_id", schoolId);

    // Apply grade level filter
    if (grade) {
      queryBuilder = queryBuilder.or(`grade_level.eq.${grade},grade_level.eq.Grade ${grade}`, { foreignTable: "class" });
    }
    // Apply section filter
    if (section) {
      queryBuilder = queryBuilder.eq("class.section", section);
    }

    const { data, error } = await queryBuilder;
    if (error || !data) {
      console.error("Error fetching students from Supabase:", error);
      return [];
    }

    return data.map((row: any) => {
      const fullName = row.profile?.full_name || "";
      const parts = fullName.trim().split(/\s+/);
      const first_name = parts[0] || "";
      const last_name = parts.slice(1).join(" ") || "";
      
      const current_grade = row.class?.grade_level?.replace("Grade ", "") || "";
      const sectionVal = row.class?.section || "";
      const baseFee = Number(row.class?.base_fee_amount) || 0;
      const modifiers = row.fee_modifiers || [];
      const outstanding = calculateOutstandingBalance(baseFee, modifiers);

      return {
        _id: row.id,
        personal_details: {
          first_name,
          last_name,
          roll_number: row.roll_number,
          parent_id: row.parent_id || undefined,
        },
        academic_mapping: {
          current_grade,
          section: sectionVal,
          assigned_subjects: ["MATH_101", "SCI_202", "ENG_303"], // default suite
        },
        financial_ledger: {
          base_fee_package_id: `PKG_GRADE_${current_grade}`,
          base_fee: baseFee,
          custom_modifiers: modifiers,
          current_outstanding_balance: outstanding,
        },
      };
    });
  } catch (e) {
    console.error("Failed to execute students fetch from Supabase:", e);
    return [];
  }
}

/**
 * Bulk ingestion of student records via parsed CSV rows.
 * Automatically provisions classes, profiles, parents, and student references.
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
  try {
    const schoolId = await getActiveUserSchoolId();
    if (!schoolId) return { success: false, count: 0 };

    // 1. Load active classes for this school
    const { data: classesData, error: classesError } = await supabase
      .from("classes")
      .select("id, grade_level, section")
      .eq("school_id", schoolId);

    if (classesError) {
      console.error("Error fetching classes cache:", classesError);
      return { success: false, count: 0 };
    }

    const classesCache = [...(classesData || [])];

    let successCount = 0;

    for (const row of rows) {
      const normalizedGrade = row.current_grade.replace("Grade ", "");
      const normalizedSection = row.section.toUpperCase();

      // Find class in cache or insert it
      let classObj = classesCache.find(
        (c) =>
          c.grade_level.replace("Grade ", "") === normalizedGrade &&
          c.section === normalizedSection
      );

      if (!classObj) {
        // Class doesn't exist, create it with a default tuition amount (60,000 INR)
        const { data: newClass, error: newClassError } = await supabase
          .from("classes")
          .insert({
            school_id: schoolId,
            grade_level: `Grade ${normalizedGrade}`,
            section: normalizedSection,
            base_fee_amount: 60000.0,
          })
          .select("id, grade_level, section")
          .single();

        if (newClassError || !newClass) {
          console.error("Failed to provision missing class:", newClassError);
          continue;
        }

        classObj = newClass;
        classesCache.push(newClass);
      }

      // Generate entity IDs
      const studentProfileId = crypto.randomUUID();
      const parentProfileId = crypto.randomUUID();
      const studentId = crypto.randomUUID();

      const fullName = `${row.first_name} ${row.last_name}`.trim();
      const studentEmail = `${row.first_name.toLowerCase()}.${row.last_name.toLowerCase()}.${Math.floor(100 + Math.random() * 900)}@school.edu`;
      const parentEmail = `parent.${studentEmail}`;

      // A. Create Parent Profile
      const { error: pError } = await supabase.from("profiles").insert({
        id: parentProfileId,
        school_id: schoolId,
        email: parentEmail,
        full_name: `${fullName}'s Parent`,
        role: "parent",
      });

      if (pError) {
        console.error("Failed to insert parent profile:", pError);
        continue;
      }

      // B. Create Student Profile
      const { error: sProfileError } = await supabase.from("profiles").insert({
        id: studentProfileId,
        school_id: schoolId,
        email: studentEmail,
        full_name: fullName,
        role: "student",
      });

      if (sProfileError) {
        console.error("Failed to insert student profile:", sProfileError);
        continue;
      }

      // C. Create Student Linkage Record
      const { error: sError } = await supabase.from("students").insert({
        id: studentId,
        school_id: schoolId,
        profile_id: studentProfileId,
        parent_id: parentProfileId,
        class_id: classObj.id,
        roll_number: Number(row.roll_number) || Math.floor(1 + Math.random() * 50),
        fee_modifiers: [],
      });

      if (sError) {
        console.error("Failed to link student roster record:", sError);
        continue;
      }

      successCount++;
    }

    return { success: successCount > 0, count: successCount };
  } catch (e) {
    console.error("Bulk CSV ingestion failed:", e);
    return { success: false, count: 0 };
  }
}
