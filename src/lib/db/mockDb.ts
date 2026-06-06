import { FeeModifier } from "./finance";

export interface Student {
  _id: string;
  personal_details: {
    first_name: string;
    last_name: string;
    roll_number: number;
    parent_id: string;
    student_profile_id?: string;
  };
  academic_mapping: {
    current_grade: string;
    section: string;
    assigned_subjects: string[];
  };
  financial_ledger: {
    base_fee_package_id: string;
    custom_modifiers: FeeModifier[];
    current_outstanding_balance: number;
  };
}

export interface Assessment {
  assessment_id: string;
  title: string;
  type: "mock_test" | "formal_exam";
  max_marks: number;
  weight_percentage: number;
  scores: Record<string, number>; // student_id -> marks
  status?: "draft" | "published";
}

export interface Gradebook {
  _id: string;
  status?: "draft" | "published";
  metadata: {
    academic_year: string;
    term: string;
    grade_level: string;
    section: string;
    subject_id: string;
    instructor_id: string;
  };
  assessments: Assessment[];
}

export interface AttendanceRecord {
  date: string; // YYYY-MM-DD
  grade_level: string;
  section: string;
  records: Record<string, "present" | "absent" | "late">; // student_id -> status
}

// Initial mock data matching specification
const INITIAL_STUDENTS: Student[] = [
  {
    _id: "STU_948201",
    personal_details: {
      first_name: "Rahul",
      last_name: "Sharma",
      roll_number: 76,
      parent_id: "PAR_582910"
    },
    academic_mapping: {
      current_grade: "10",
      section: "A",
      assigned_subjects: ["MATH_101", "SCI_202", "ENG_303"]
    },
    financial_ledger: {
      base_fee_package_id: "PKG_GRADE_10",
      custom_modifiers: [
        {
          id: "MOD_01",
          label: "Academic Merit Scholarship",
          type: "percentage",
          value: 25,
          application: "discount"
        },
        {
          id: "MOD_02",
          label: "Advanced Lab Facilities Access Charge",
          type: "fixed_amount",
          value: 3500,
          application: "charge"
        }
      ],
      current_outstanding_balance: 48500
    }
  },
  {
    _id: "STU_948202",
    personal_details: {
      first_name: "Priya",
      last_name: "Patel",
      roll_number: 45,
      parent_id: "PAR_582911"
    },
    academic_mapping: {
      current_grade: "10",
      section: "A",
      assigned_subjects: ["MATH_101", "SCI_202", "ENG_303"]
    },
    financial_ledger: {
      base_fee_package_id: "PKG_GRADE_10",
      custom_modifiers: [
        {
          id: "MOD_03",
          label: "Sibling Waiver",
          type: "fixed_amount",
          value: 5000,
          application: "discount"
        }
      ],
      current_outstanding_balance: 55000
    }
  },
  {
    _id: "STU_948203",
    personal_details: {
      first_name: "Vikram",
      last_name: "Singh",
      roll_number: 92,
      parent_id: "PAR_582912"
    },
    academic_mapping: {
      current_grade: "10",
      section: "A",
      assigned_subjects: ["MATH_101", "SCI_202", "ENG_303"]
    },
    financial_ledger: {
      base_fee_package_id: "PKG_GRADE_10",
      custom_modifiers: [],
      current_outstanding_balance: 60000
    }
  },
  {
    _id: "STU_948204",
    personal_details: {
      first_name: "Ananya",
      last_name: "Iyer",
      roll_number: 12,
      parent_id: "PAR_582913"
    },
    academic_mapping: {
      current_grade: "10",
      section: "B",
      assigned_subjects: ["MATH_101", "SCI_202", "ENG_303"]
    },
    financial_ledger: {
      base_fee_package_id: "PKG_GRADE_10",
      custom_modifiers: [
        {
          id: "MOD_04",
          label: "Sports Scholarship",
          type: "percentage",
          value: 20,
          application: "discount"
        }
      ],
      current_outstanding_balance: 48000
    }
  }
];

const INITIAL_GRADEBOOKS: Gradebook[] = [
  {
    _id: "GRD_TERM_1_2026_10A",
    metadata: {
      academic_year: "2026",
      term: "Term 1",
      grade_level: "10",
      section: "A",
      subject_id: "MATH_101",
      instructor_id: "TCH_3021"
    },
    assessments: [
      {
        assessment_id: "ASM_MOCK_01",
        title: "Algebra Fundamentals Mock",
        type: "mock_test",
        max_marks: 50,
        weight_percentage: 15,
        scores: {
          "STU_948201": 42,
          "STU_948202": 38,
          "STU_948203": 45
        }
      },
      {
        assessment_id: "ASM_EXAM_FINAL",
        title: "Term 1 Comprehensive Exam",
        type: "formal_exam",
        max_marks: 100,
        weight_percentage: 50,
        scores: {
          "STU_948201": 88,
          "STU_948202": 71,
          "STU_948203": 95
        }
      }
    ]
  },
  {
    _id: "GRD_TERM_1_2026_10B",
    metadata: {
      academic_year: "2026",
      term: "Term 1",
      grade_level: "10",
      section: "B",
      subject_id: "MATH_101",
      instructor_id: "TCH_3021"
    },
    assessments: [
      {
        assessment_id: "ASM_MOCK_01",
        title: "Algebra Fundamentals Mock",
        type: "mock_test",
        max_marks: 50,
        weight_percentage: 15,
        scores: {
          "STU_948204": 40
        }
      }
    ]
  }
];

const INITIAL_ATTENDANCE: AttendanceRecord[] = [
  {
    date: "2026-06-04",
    grade_level: "10",
    section: "A",
    records: {
      "STU_948201": "present",
      "STU_948202": "present",
      "STU_948203": "present"
    }
  }
];

// Helper to determine if we are running in browser context
const isBrowser = typeof window !== "undefined";

// Memory storage cache fallback for server-side rendering or non-browser environments
let memoryStore: Record<string, string> = {};

function getItem(key: string): string | null {
  if (isBrowser) {
    return localStorage.getItem(key);
  }
  return memoryStore[key] || null;
}

function setItem(key: string, value: string): void {
  if (isBrowser) {
    localStorage.setItem(key, value);
  } else {
    memoryStore[key] = value;
  }
}

// Getters & Setters
export function getMockStudents(): Student[] {
  const data = getItem("sms_mock_students");
  if (!data) {
    setItem("sms_mock_students", JSON.stringify(INITIAL_STUDENTS));
    return INITIAL_STUDENTS;
  }
  return JSON.parse(data);
}

export function saveMockStudents(students: Student[]): void {
  setItem("sms_mock_students", JSON.stringify(students));
}

export function getMockGradebooks(): Gradebook[] {
  const data = getItem("sms_mock_gradebooks");
  if (!data) {
    setItem("sms_mock_gradebooks", JSON.stringify(INITIAL_GRADEBOOKS));
    return INITIAL_GRADEBOOKS;
  }
  return JSON.parse(data);
}

export function saveMockGradebooks(gradebooks: Gradebook[]): void {
  setItem("sms_mock_gradebooks", JSON.stringify(gradebooks));
}

export function getMockAttendance(): AttendanceRecord[] {
  const data = getItem("sms_mock_attendance");
  if (!data) {
    setItem("sms_mock_attendance", JSON.stringify(INITIAL_ATTENDANCE));
    return INITIAL_ATTENDANCE;
  }
  return JSON.parse(data);
}

export function saveMockAttendance(records: AttendanceRecord[]): void {
  setItem("sms_mock_attendance", JSON.stringify(records));
}

// Standard baseline fee structure constants
export const GRADE_BASE_FEES: Record<string, number> = {
  "9": 55000,
  "10": 60000,
  "11": 65000,
  "12": 70000,
};

export function getBaseFee(gradeLevel: string): number {
  return GRADE_BASE_FEES[gradeLevel] || 50000;
}

export interface ExamNotice {
  id: string;
  class_id: string;
  subject_name: string;
  exam_title: string;
  exam_date: string;
  exam_time: string;
  room_number: string;
  created_at: string;
}

export function getMockExamNotices(): ExamNotice[] {
  const data = getItem("sms_mock_exam_notices");
  if (!data) {
    const initialNotices: ExamNotice[] = [
      {
        id: "EXM_NTC_1",
        class_id: "G10-A",
        subject_name: "MATH_101",
        exam_title: "Math midterm exam",
        exam_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 days from now
        exam_time: "09:00",
        room_number: "Room 404",
        created_at: new Date().toISOString(),
      }
    ];
    setItem("sms_mock_exam_notices", JSON.stringify(initialNotices));
    return initialNotices;
  }
  return JSON.parse(data);
}

export function saveMockExamNotices(notices: ExamNotice[]): void {
  setItem("sms_mock_exam_notices", JSON.stringify(notices));
}
