import { supabase, getActiveUserSchoolId } from "../supabase/client";
import { Gradebook, Assessment, ExamNotice } from "./mockDb";

/**
 * Fetch gradebook mapping for a class section, subject, and academic term.
 */
export async function fetchGradebook(
  academicYear: string,
  term: string,
  gradeLevel: string,
  section: string,
  subjectId: string
): Promise<Gradebook | null> {
  try {
    const schoolId = await getActiveUserSchoolId();
    if (!schoolId) return null;

    // 1. Resolve class ID for this grade level and section mapping
    const normalizedGrade = gradeLevel.replace("Grade ", "");
    const { data: classData, error: classError } = await supabase
      .from("classes")
      .select("id, instructor_id")
      .eq("school_id", schoolId)
      .or(`grade_level.eq.${normalizedGrade},grade_level.eq.Grade ${normalizedGrade}`)
      .eq("section", section.toUpperCase())
      .single();

    let classId = "";
    let instructorId = "TCH_3021";

    if (classError || !classData) {
      // Create classroom configuration if missing
      const { data: newClass, error: newClassError } = await supabase
        .from("classes")
        .insert({
          school_id: schoolId,
          grade_level: `Grade ${normalizedGrade}`,
          section: section.toUpperCase(),
          base_fee_amount: 60000.0,
        })
        .select("id")
        .single();

      if (newClassError || !newClass) {
        console.error("Failed to dynamically create classroom structure:", newClassError);
        return null;
      }
      classId = newClass.id;
    } else {
      classId = classData.id;
      instructorId = classData.instructor_id || "TCH_3021";
    }

    // Resolve teacher from allocations junction table matching classId and subjectId
    if (classId) {
      const { data: allocData } = await supabase
        .from("teacher_allocations")
        .select("teacher_id")
        .eq("class_id", classId)
        .eq("subject_name", subjectId)
        .maybeSingle();

      if (allocData) {
        instructorId = allocData.teacher_id;
      } else {
        // Fallback: Check if there's any allocation for this class at all
        const { data: fallbackAlloc } = await supabase
          .from("teacher_allocations")
          .select("teacher_id")
          .eq("class_id", classId)
          .limit(1)
          .maybeSingle();
          
        if (fallbackAlloc) {
          instructorId = fallbackAlloc.teacher_id;
        }
      }
    }

    // 2. Fetch all assessments associated with this class
    const { data: gradebooksData, error: gradebooksError } = await supabase
      .from("gradebooks")
      .select("*")
      .eq("school_id", schoolId)
      .eq("class_id", classId);

    if (gradebooksError) {
      console.error("Error reading gradebooks from Supabase:", gradebooksError);
      return null;
    }

    // 3. Filter and map assessments by subject (serialized in assessment_name: "subjectId:name")
    const filteredAssessments: Assessment[] = (gradebooksData || [])
      .filter((row: any) => row.assessment_name.startsWith(`${subjectId}:`))
      .map((row: any) => {
        // Strip the subject prefix for display
        const displayTitle = row.assessment_name.replace(`${subjectId}:`, "");
        return {
          assessment_id: row.id,
          title: displayTitle,
          type: row.assessment_type as "mock_test" | "formal_exam",
          max_marks: Number(row.total_marks),
          weight_percentage: Number(row.weight_percentage),
          scores: row.scores || {},
          status: row.status || "draft",
        } as any;
      });

    return {
      _id: classId,
      status: filteredAssessments[0]?.status || "draft",
      metadata: {
        academic_year: academicYear,
        term,
        grade_level: gradeLevel,
        section: section.toUpperCase(),
        subject_id: subjectId,
        instructor_id: instructorId,
      },
      assessments: filteredAssessments,
    };
  } catch (e) {
    console.error("Failed to execute gradebook fetch from Supabase:", e);
    return null;
  }
}

/**
 * Creates a mock test or assessment within a gradebook.
 */
export async function createAssessment(
  gradebookId: string, // class_id
  title: string,
  maxMarks: number,
  type: "mock_test" | "formal_exam",
  weightPercentage: number,
  subjectId: string = "MATH_101"
): Promise<boolean> {
  try {
    const schoolId = await getActiveUserSchoolId();
    if (!schoolId) return false;

    // Serialize subjectId in the assessment name to fit standard DB structure plan
    const serializedName = `${subjectId}:${title}`;

    const { error } = await supabase.from("gradebooks").insert({
      school_id: schoolId,
      class_id: gradebookId,
      assessment_name: serializedName,
      assessment_type: type,
      total_marks: Number(maxMarks),
      weight_percentage: Number(weightPercentage),
      status: "draft",
      scores: {},
    });

    if (error) {
      console.error("Error creating assessment column in Supabase:", error);
      return false;
    }
    return true;
  } catch (e) {
    console.error("Failed to create assessment in Supabase:", e);
    return false;
  }
}

/**
 * Perform batch score updates for a specific assessment within a gradebook.
 */
export async function updateAssessmentScoresBatch(
  gradebookId: string, // class_id (unused here since we target assessment directly by ID)
  assessmentId: string, // gradebook row ID
  scores: Record<string, number>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("gradebooks")
      .update({
        scores: scores,
      })
      .eq("id", assessmentId);

    if (error) {
      console.error("Error committing scores batch to Supabase:", error);
      return false;
    }
    return true;
  } catch (e) {
    console.error("Failed to commit scores update:", e);
    return false;
  }
}

/**
 * Updates the publishing status of an assessment
 */
export async function updateGradebookStatus(
  gradebookIdOrAssessmentId: string,
  status: "draft" | "published"
): Promise<boolean> {
  try {
    const schoolId = await getActiveUserSchoolId();
    if (!schoolId) return false;

    // Attempt to update by assessment ID first (UUID format)
    const { error: singleError } = await supabase
      .from("gradebooks")
      .update({ status })
      .eq("id", gradebookIdOrAssessmentId);

    if (!singleError) return true;

    // Fallback: If it's a class ID, update all gradebook records for that class
    const { error: batchError } = await supabase
      .from("gradebooks")
      .update({ status })
      .eq("class_id", gradebookIdOrAssessmentId)
      .eq("school_id", schoolId);

    if (batchError) {
      console.error("Failed to update status in Supabase:", batchError);
      return false;
    }

    return true;
  } catch (e) {
    console.error("Failed to update gradebook status:", e);
    return false;
  }
}

/**
 * Creates a new exam notice record.
 */
export async function createExamNotice(
  classId: string,
  subjectName: string,
  examTitle: string,
  examDate: string,
  examTime: string,
  roomNumber: string
): Promise<boolean> {
  try {
    const schoolId = await getActiveUserSchoolId();
    if (!schoolId) return false;

    const { error } = await supabase.from("exam_notices").insert({
      school_id: schoolId,
      class_id: classId,
      subject_name: subjectName,
      exam_title: examTitle,
      exam_date: examDate,
      exam_time: examTime,
      room_number: roomNumber,
    });

    if (error) {
      console.error("Error inserting exam notice in Supabase:", error);
      return false;
    }
    return true;
  } catch (e) {
    console.error("Failed to insert exam notice:", e);
    return false;
  }
}

/**
 * Fetches all exam notices for a given class ID.
 */
export async function fetchExamNotices(classId: string): Promise<ExamNotice[]> {
  try {
    const schoolId = await getActiveUserSchoolId();
    if (!schoolId) return [];

    const { data, error } = await supabase
      .from("exam_notices")
      .select("*")
      .eq("school_id", schoolId)
      .eq("class_id", classId)
      .order("exam_date", { ascending: true });

    if (error || !data) {
      console.error("Error fetching notices from Supabase:", error);
      return [];
    }

    return data.map((row: any) => ({
      id: row.id,
      class_id: row.class_id,
      subject_name: row.subject_name,
      exam_title: row.exam_title,
      exam_date: row.exam_date,
      exam_time: row.exam_time,
      room_number: row.room_number,
      created_at: row.created_at,
    }));
  } catch (e) {
    console.error("Failed to retrieve exam notices:", e);
    return [];
  }
}

/**
 * Computes the weighted class performance for each student.
 */
export function calculateWeightedGrades(
  gradebook: Gradebook,
  studentIds: string[]
): Record<string, { maxScore: number; percentage: number; gradeLetter: string }> {
  const result: Record<string, { maxScore: number; percentage: number; gradeLetter: string }> = {};

  const assessments = gradebook.assessments || [];
  // Calculate total weight of all assessments in the gradebook
  const totalWeight = assessments.reduce((acc, asm) => acc + Number(asm.weight_percentage || 0), 0);

  for (const studentId of studentIds) {
    let totalWeightWithScores = 0;
    let totalEarnedWeight = 0;

    for (const asm of assessments) {
      const scoreVal = asm.scores?.[studentId];
      if (scoreVal !== undefined && scoreVal !== null) {
        const score = Number(scoreVal);
        const maxMarks = Number(asm.max_marks || 100);
        const weight = Number(asm.weight_percentage || 0);

        totalWeightWithScores += weight;
        totalEarnedWeight += maxMarks > 0 ? (score / maxMarks) * weight : 0;
      }
    }

    const percentage = totalWeightWithScores > 0 
      ? Math.round((totalEarnedWeight / totalWeightWithScores) * 100) 
      : 0;

    let gradeLetter = "N/A";
    if (totalWeightWithScores > 0) {
      if (percentage >= 90) gradeLetter = "A";
      else if (percentage >= 80) gradeLetter = "B";
      else if (percentage >= 70) gradeLetter = "C";
      else if (percentage >= 60) gradeLetter = "D";
      else gradeLetter = "F";
    }

    result[studentId] = {
      maxScore: totalWeight, // total potential weight configured in gradebook
      percentage,
      gradeLetter,
    };
  }

  return result;
}

