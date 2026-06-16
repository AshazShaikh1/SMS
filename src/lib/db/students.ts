import { supabase, getActiveUserSchoolId } from "../supabase/client";
import { Student } from "./mockDb";
import { calculateOutstandingBalance } from "./finance";

/**
 * Fetch students, filtered optionally by grade level and section mapping.
 */
export async function fetchStudents(grade?: string, section?: string, includeDemographics: boolean = false): Promise<Student[]> {
  try {
    const schoolId = await getActiveUserSchoolId();
    if (!schoolId) return [];

    let selectQuery = "";
    if (includeDemographics) {
      selectQuery = `
        id,
        roll_number,
        fee_modifiers,
        parent_id,
        profile_id,
        first_name,
        surname,
        register_no,
        gender,
        birth_date,
        dob_in_words,
        birth_place,
        phones,
        address,
        country,
        state,
        dist,
        taluka,
        colony,
        distance,
        admit_in_class,
        last_class,
        last_school_attended,
        admission_date,
        father_name,
        father_occupation,
        father_qualification,
        father_uid_no,
        mother_name,
        mother_occupation,
        mother_qualification,
        mother_uid_no,
        mother_tongue,
        guardian,
        sibling,
        single_parent,
        orphan,
        aadhar_number,
        aapar_id,
        pen_number,
        saral_id,
        nationality,
        religion,
        caste,
        sub_caste,
        progress,
        conduct,
        reason_for_leaving,
        leaving_date,
        remarks,
        bloodgroup,
        height,
        weight,
        handicap,
        login_email,
        muman,
        qrcode,
        rfid,
        profile:profiles!students_profile_id_fkey(full_name, email, outstanding_balance),
        parent:profiles!students_parent_id_fkey(full_name, phone_number, email),
        class:classes!students_class_id_fkey(id, grade_level, section, base_fee_amount)
      `;
    } else {
      selectQuery = `
        id,
        roll_number,
        fee_modifiers,
        parent_id,
        profile_id,
        first_name,
        surname,
        profile:profiles!students_profile_id_fkey(full_name, email, outstanding_balance),
        parent:profiles!students_parent_id_fkey(full_name, phone_number, email),
        class:classes!students_class_id_fkey(id, grade_level, section, base_fee_amount)
      `;
    }

    let queryBuilder = supabase
      .from("students")
      .select(selectQuery)
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
      
      // Use profiles.outstanding_balance if available, fallback to calculateOutstandingBalance
      const outstanding = row.profile?.outstanding_balance !== undefined && row.profile?.outstanding_balance !== null
        ? Number(row.profile.outstanding_balance)
        : calculateOutstandingBalance(baseFee, modifiers);

      return {
        _id: row.id,
        personal_details: {
          first_name: row.first_name || first_name,
          last_name: row.surname || last_name,
          roll_number: row.roll_number,
          parent_id: row.parent_id || undefined,
          student_profile_id: row.profile_id,
          parent_name: row.parent?.full_name || undefined,
          parent_phone: row.parent?.phone_number || undefined,
          // Demographic fields
          register_no: row.register_no || undefined,
          gender: row.gender || undefined,
          birth_date: row.birth_date || undefined,
          dob_in_words: row.dob_in_words || undefined,
          birth_place: row.birth_place || undefined,
          phones: row.phones || undefined,
          address: row.address || undefined,
          country: row.country || undefined,
          state: row.state || undefined,
          dist: row.dist || undefined,
          taluka: row.taluka || undefined,
          colony: row.colony || undefined,
          distance: row.distance || undefined,
          admit_in_class: row.admit_in_class || undefined,
          last_class: row.last_class || undefined,
          last_school_attended: row.last_school_attended || undefined,
          admission_date: row.admission_date || undefined,
          father_name: row.father_name || undefined,
          father_occupation: row.father_occupation || undefined,
          father_qualification: row.father_qualification || undefined,
          father_uid_no: row.father_uid_no || undefined,
          mother_name: row.mother_name || undefined,
          mother_occupation: row.mother_occupation || undefined,
          mother_qualification: row.mother_qualification || undefined,
          mother_uid_no: row.mother_uid_no || undefined,
          mother_tongue: row.mother_tongue || undefined,
          guardian: row.guardian || undefined,
          sibling: row.sibling || undefined,
          single_parent: row.single_parent || false,
          orphan: row.orphan || false,
          aadhar_number: row.aadhar_number || undefined,
          aapar_id: row.aapar_id || undefined,
          pen_number: row.pen_number || undefined,
          saral_id: row.saral_id || undefined,
          nationality: row.nationality || undefined,
          religion: row.religion || undefined,
          caste: row.caste || undefined,
          sub_caste: row.sub_caste || undefined,
          progress: row.progress || undefined,
          conduct: row.conduct || undefined,
          reason_for_leaving: row.reason_for_leaving || undefined,
          leaving_date: row.leaving_date || undefined,
          remarks: row.remarks || undefined,
          bloodgroup: row.bloodgroup || undefined,
          height: row.height || undefined,
          weight: row.weight || undefined,
          handicap: row.handicap || false,
          login_email: row.login_email || undefined,
          muman: row.muman || undefined,
          qrcode: row.qrcode || undefined,
          rfid: row.rfid || undefined,
        },
        academic_mapping: {
          current_grade,
          section: sectionVal,
          assigned_subjects: ["MATH_101", "SCI_202", "ENG_303"],
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
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
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
    // Optional demographic columns
    register_no?: string;
    gender?: string;
    birth_date?: string;
    dob_in_words?: string;
    birth_place?: string;
    phones?: string;
    address?: string;
    country?: string;
    state?: string;
    dist?: string;
    taluka?: string;
    colony?: string;
    distance?: string;
    admit_in_class?: string;
    last_class?: string;
    last_school_attended?: string;
    admission_date?: string;
    father_name?: string;
    father_occupation?: string;
    father_qualification?: string;
    father_uid_no?: string;
    mother_name?: string;
    mother_occupation?: string;
    mother_qualification?: string;
    mother_uid_no?: string;
    mother_tongue?: string;
    guardian?: string;
    sibling?: string;
    single_parent?: boolean;
    orphan?: boolean;
    aadhar_number?: string;
    aapar_id?: string;
    pen_number?: string;
    saral_id?: string;
    nationality?: string;
    religion?: string;
    caste?: string;
    sub_caste?: string;
    progress?: string;
    conduct?: string;
    reason_for_leaving?: string;
    leaving_date?: string;
    remarks?: string;
    bloodgroup?: string;
    height?: string;
    weight?: string;
    handicap?: boolean;
    login_email?: string;
    muman?: string;
    qrcode?: string;
    rfid?: string;
    // Parent mappings
    parent_name?: string;
    parent_phone?: string;
    student_email?: string;
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
    const parentPhoneMap = new Map<string, string>();
    const profilesToInsert: any[] = [];
    const studentsToInsert: any[] = [];

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
      const studentId = crypto.randomUUID();

      const fullName = `${row.first_name} ${row.last_name}`.trim();
      const studentEmail = row.student_email?.trim() || `${row.first_name.toLowerCase()}.${row.last_name.toLowerCase()}.${Math.floor(100 + Math.random() * 900)}@school.edu`;
      const parentEmail = `parent.${studentEmail}`;

      // Resolve parent profile ID (de-duplicated by parent name & phone)
      const parentName = row.parent_name || `${fullName}'s Parent`;
      const cleanPhone = (row.parent_phone || "").replace(/[\s\-\(\)]/g, "");
      let resolvedParentId = "";

      if (cleanPhone && parentPhoneMap.has(cleanPhone)) {
        resolvedParentId = parentPhoneMap.get(cleanPhone)!;
      } else {
        resolvedParentId = crypto.randomUUID();
        if (cleanPhone) {
          parentPhoneMap.set(cleanPhone, resolvedParentId);
        }
        
        // Add Parent Profile to insert array
        profilesToInsert.push({
          id: resolvedParentId,
          school_id: schoolId,
          email: parentEmail,
          full_name: parentName,
          role: "parent",
          phone_number: row.parent_phone || null
        });
      }

      // Add Student Profile to insert array
      profilesToInsert.push({
        id: studentProfileId,
        school_id: schoolId,
        email: studentEmail,
        full_name: fullName,
        role: "student",
      });

      // Add Student Linkage Record with all demographics
      studentsToInsert.push({
        id: studentId,
        school_id: schoolId,
        profile_id: studentProfileId,
        parent_id: resolvedParentId,
        class_id: classObj.id,
        roll_number: Number(row.roll_number) || Math.floor(1 + Math.random() * 50),
        fee_modifiers: [],
        first_name: row.first_name || null,
        surname: row.last_name || null,
        register_no: row.register_no || null,
        gender: row.gender || null,
        birth_date: row.birth_date || null,
        dob_in_words: row.dob_in_words || null,
        birth_place: row.birth_place || null,
        phones: row.phones || null,
        address: row.address || null,
        country: row.country || null,
        state: row.state || null,
        dist: row.dist || null,
        taluka: row.taluka || null,
        colony: row.colony || null,
        distance: row.distance || null,
        admit_in_class: row.admit_in_class || null,
        last_class: row.last_class || null,
        last_school_attended: row.last_school_attended || null,
        admission_date: row.admission_date || null,
        father_name: row.father_name || null,
        father_occupation: row.father_occupation || null,
        father_qualification: row.father_qualification || null,
        father_uid_no: row.father_uid_no || null,
        mother_name: row.mother_name || null,
        mother_occupation: row.mother_occupation || null,
        mother_qualification: row.mother_qualification || null,
        mother_uid_no: row.mother_uid_no || null,
        mother_tongue: row.mother_tongue || null,
        guardian: row.guardian || null,
        sibling: row.sibling || null,
        single_parent: row.single_parent || false,
        orphan: row.orphan || false,
        aadhar_number: row.aadhar_number || null,
        aapar_id: row.aapar_id || null,
        pen_number: row.pen_number || null,
        saral_id: row.saral_id || null,
        nationality: row.nationality || null,
        religion: row.religion || null,
        caste: row.caste || null,
        sub_caste: row.sub_caste || null,
        progress: row.progress || null,
        conduct: row.conduct || null,
        reason_for_leaving: row.reason_for_leaving || null,
        leaving_date: row.leaving_date || null,
        remarks: row.remarks || null,
        bloodgroup: row.bloodgroup || null,
        height: row.height || null,
        weight: row.weight || null,
        handicap: row.handicap || false,
        login_email: row.login_email || null,
        muman: row.muman || null,
        qrcode: row.qrcode || null,
        rfid: row.rfid || null,
      });
    }

    // Bulk write profiles in chunks of 100
    const profileChunks = chunkArray(profilesToInsert, 100);
    for (const chunk of profileChunks) {
      const { error: pError } = await supabase.from("profiles").insert(chunk);
      if (pError) {
        console.error("Bulk profiles insert failed:", pError);
        return { success: false, count: 0 };
      }
    }

    // Bulk write student linkage records in chunks of 100
    const studentChunks = chunkArray(studentsToInsert, 100);
    for (const chunk of studentChunks) {
      const { error: sError } = await supabase.from("students").insert(chunk);
      if (sError) {
        console.error("Bulk students insert failed:", sError);
        return { success: false, count: 0 };
      }
    }

    return { success: true, count: studentsToInsert.length };
  } catch (e) {
    console.error("Bulk CSV ingestion failed:", e);
    return { success: false, count: 0 };
  }
}
