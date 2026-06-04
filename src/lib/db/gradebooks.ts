import { isFirebaseConfigured, db } from "../firebase";
import { collection, query, where, getDocs, doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { getMockGradebooks, saveMockGradebooks, Gradebook, Assessment } from "./mockDb";

/**
 * Fetch gradebook mapping for a class section, subject and academic term
 */
export async function fetchGradebook(
  academicYear: string,
  term: string,
  gradeLevel: string,
  section: string,
  subjectId: string
): Promise<Gradebook | null> {
  if (isFirebaseConfigured && db) {
    try {
      const gradebookRef = collection(db, "gradebooks");
      const q = query(
        gradebookRef,
        where("metadata.academic_year", "==", academicYear),
        where("metadata.term", "==", term),
        where("metadata.grade_level", "==", gradeLevel),
        where("metadata.section", "==", section),
        where("metadata.subject_id", "==", subjectId)
      );
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const docSnap = querySnapshot.docs[0];
        return { _id: docSnap.id, ...docSnap.data() } as unknown as Gradebook;
      }
      // If Firestore is empty, create a default gradebook container
      const newId = `GRD_${academicYear}_G${gradeLevel}_S${section}_SUB_${subjectId}`;
      const defaultGradebook: Gradebook = {
        _id: newId,
        metadata: {
          academic_year: academicYear,
          term,
          grade_level: gradeLevel,
          section: section.toUpperCase(),
          subject_id: subjectId,
          instructor_id: "TCH_3021",
        },
        assessments: [],
      };
      await setDoc(doc(db, "gradebooks", newId), defaultGradebook);
      return defaultGradebook;
    } catch (error) {
      console.error("Error fetching gradebook from Firestore:", error);
    }
  }

  // Fallback to Mock DB
  const list = getMockGradebooks();
  const found = list.find(
    (g) =>
      g.metadata.academic_year === academicYear &&
      g.metadata.term === term &&
      g.metadata.grade_level === gradeLevel &&
      g.metadata.section === section &&
      g.metadata.subject_id === subjectId
  );

  if (found) return found;

  // Create default mock container if not found
  const newId = `GRD_${academicYear}_G${gradeLevel}_S${section}_SUB_${subjectId}`;
  const newGradebook: Gradebook = {
    _id: newId,
    metadata: {
      academic_year: academicYear,
      term,
      grade_level: gradeLevel,
      section: section.toUpperCase(),
      subject_id: subjectId,
      instructor_id: "TCH_3021",
    },
    assessments: [],
  };
  list.push(newGradebook);
  saveMockGradebooks(list);
  return newGradebook;
}

/**
 * Creates a mock test or assessment within a gradebook.
 * 3-click compliance: Admin/Teacher initiates instantly.
 */
export async function createAssessment(
  gradebookId: string,
  title: string,
  maxMarks: number,
  type: "mock_test" | "formal_exam",
  weightPercentage: number
): Promise<boolean> {
  const assessmentId = `ASM_${type.toUpperCase()}_${Date.now()}`;
  const newAssessment: Assessment = {
    assessment_id: assessmentId,
    title,
    type,
    max_marks: Number(maxMarks),
    weight_percentage: Number(weightPercentage),
    scores: {},
  };

  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, "gradebooks", gradebookId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as Gradebook;
        const updatedAssessments = [...(data.assessments || []), newAssessment];
        await updateDoc(docRef, { assessments: updatedAssessments });
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error adding assessment in Firestore:", error);
      return false;
    }
  }

  // Fallback to Mock DB
  const list = getMockGradebooks();
  const index = list.findIndex((g) => g._id === gradebookId);
  if (index !== -1) {
    list[index].assessments.push(newAssessment);
    saveMockGradebooks(list);
    return true;
  }
  return false;
}

/**
 * Perform batch score updates for a specific assessment within a gradebook.
 * Saves multiple inline entries in one go.
 */
export async function updateAssessmentScoresBatch(
  gradebookId: string,
  assessmentId: string,
  scores: Record<string, number>
): Promise<boolean> {
  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, "gradebooks", gradebookId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as Gradebook;
        const updatedAssessments = data.assessments.map((asm) => {
          if (asm.assessment_id === assessmentId) {
            return {
              ...asm,
              scores: { ...asm.scores, ...scores },
            };
          }
          return asm;
        });
        await updateDoc(docRef, { assessments: updatedAssessments });
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error batch updating assessment scores in Firestore:", error);
      return false;
    }
  }

  // Fallback to Mock DB
  const list = getMockGradebooks();
  const index = list.findIndex((g) => g._id === gradebookId);
  if (index !== -1) {
    const asmIndex = list[index].assessments.findIndex((asm) => asm.assessment_id === assessmentId);
    if (asmIndex !== -1) {
      list[index].assessments[asmIndex].scores = {
        ...list[index].assessments[asmIndex].scores,
        ...scores,
      };
      saveMockGradebooks(list);
      return true;
    }
  }
  return false;
}

/**
 * Calculates academic summaries for students in a class gradebook.
 * Aggregates mock tests and formal exams according to weight mappings.
 */
export function calculateWeightedGrades(
  gradebook: Gradebook,
  studentIds: string[]
): Record<string, { totalScore: number; maxScore: number; percentage: number; gradeLetter: string }> {
  const result: Record<string, { totalScore: number; maxScore: number; percentage: number; gradeLetter: string }> = {};

  studentIds.forEach((studentId) => {
    let totalWeight = 0;
    let weightedEarnedScoreSum = 0;

    gradebook.assessments.forEach((asm) => {
      const score = asm.scores[studentId];
      if (score !== undefined && score !== null) {
        // Find percentage score
        const scorePercentage = (score / asm.max_marks) * 100;
        // Apply weight
        weightedEarnedScoreSum += (scorePercentage * asm.weight_percentage) / 100;
        totalWeight += asm.weight_percentage;
      }
    });

    // NOTE: Proportional Weight Calculation
    // If the accumulated weights of assessments do not exactly equal 100% at any given moment,
    // we divide the weighted earned score sum by the accumulated totalWeight and multiply by 100.
    // This scales the performance score proportionally to be out of 100% (preventing visual overflows
    // or division-by-zero errors when totalWeight is not 100).
    const percentage = totalWeight > 0 ? (weightedEarnedScoreSum / totalWeight) * 100 : 0;
    const roundedPercent = Math.round(percentage * 10) / 10;

    // Standard grading metric mapping
    let gradeLetter = "N/A";
    if (totalWeight > 0) {
      if (roundedPercent >= 90) gradeLetter = "A+";
      else if (roundedPercent >= 80) gradeLetter = "A";
      else if (roundedPercent >= 70) gradeLetter = "B";
      else if (roundedPercent >= 60) gradeLetter = "C";
      else if (roundedPercent >= 50) gradeLetter = "D";
      else gradeLetter = "F";
    }

    result[studentId] = {
      totalScore: Math.round(weightedEarnedScoreSum * 10) / 10,
      maxScore: totalWeight, // Sum of weight percentages that had actual scores
      percentage: roundedPercent,
      gradeLetter,
    };
  });

  return result;
}
