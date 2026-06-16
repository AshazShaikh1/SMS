"use client";

import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Landmark, 
  ArrowRight, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Loader2, 
  Sparkles, 
  Upload, 
  FileSpreadsheet, 
  Clipboard, 
  UserCheck, 
  AlertTriangle,
  FolderPlus,
  Trash,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Users,
  Calendar,
  DollarSign,
  BookOpen,
  Wallet,
  Percent
} from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toast } from "@/components/ui/toast";
import { supabase } from "@/lib/supabase/client";

const cleanScientificNotation = (val: any): string => {
  if (val === undefined || val === null) return "";
  const str = String(val).trim();
  if (/^[+-]?\d+(\.\d+)?[eE][+-]?\d+$/.test(str)) {
    try {
      const num = Number(str);
      if (!isNaN(num)) {
        return num.toLocaleString('en-US', { useGrouping: false });
      }
    } catch (e) {}
  }
  return str;
};

const parseExcelDate = (val: any): string => {
  if (val === undefined || val === null) return "";
  const str = String(val).trim();
  if (!str) return "";

  // Check if it's a number (Excel date serial)
  const num = Number(str);
  if (!isNaN(num) && num > 25569 && num < 100000) { // between 1970 and 2173
    try {
      const date = new Date((num - 25569) * 86400 * 1000);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch (e) {}
  }

  // Check if it's already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // Try parsing dd/mm/yyyy or d/m/yyyy or dd-mm-yyyy or similar
  const dmy = str.split(/[-/]/);
  if (dmy.length === 3) {
    let day = parseInt(dmy[0], 10);
    let month = parseInt(dmy[1], 10);
    let year = parseInt(dmy[2], 10);

    // If it looks like yyyy/mm/dd, swap
    if (dmy[0].length === 4) {
      year = parseInt(dmy[0], 10);
      day = parseInt(dmy[2], 10);
    }

    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      // Handle 2-digit years
      if (year < 100) {
        year += year > 30 ? 1900 : 2000;
      }
      try {
        const d = new Date(year, month - 1, day);
        if (!isNaN(d.getTime())) {
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          return `${yyyy}-${mm}-${dd}`;
        }
      } catch (e) {}
    }
  }

  // Fallback: try standard Date parsing
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  } catch (e) {}

  return str;
};

const getHeaderIndex = (headers: string[], field: string): number => {
  const normalizedHeaders = headers.map(h => String(h || "").trim().toLowerCase().replace(/[^a-z0-9]/g, ""));
  
  return normalizedHeaders.findIndex(norm => {
    if (!norm) return false;
    
    switch (field) {
      case "student_name":
        return norm === "name" || norm.includes("studentname") || norm.includes("candidatename") || norm.includes("fullname") || (norm.includes("student") && norm.includes("name"));
      case "first_name":
        return norm.includes("firstname") || (norm.includes("first") && norm.includes("name")) || norm === "first";
      case "surname":
        return norm.includes("lastname") || norm === "surname" || (norm.includes("last") && norm.includes("name")) || norm === "last";
      case "roll_id":
        return norm === "roll" || norm.includes("rollno") || norm.includes("rollnumber") || norm.includes("rollid");
      case "class":
        return norm === "class" || norm === "grade" || norm.includes("standard") || norm === "std" || norm.includes("classname") || norm.includes("gradelevel");
      case "section":
        return norm === "section" || norm === "sec" || norm.includes("division") || norm === "div";
      case "father_name":
        if (norm.includes("phone") || norm.includes("occup") || norm.includes("qual") || norm.includes("uid") || norm.includes("email")) return false;
        return norm === "father" || norm.includes("fathername") || norm.includes("fathersname") || norm.includes("namefather") || (norm.includes("father") && (norm.includes("name") || norm.includes("full")));
      case "mother_name":
        if (norm.includes("phone") || norm.includes("occup") || norm.includes("qual") || norm.includes("uid") || norm.includes("email")) return false;
        return norm === "mother" || norm.includes("mothername") || norm.includes("mothersname") || norm.includes("namemother") || (norm.includes("mother") && (norm.includes("name") || norm.includes("full")));
      case "parent_name":
        if (norm.includes("phone") || norm.includes("occup") || norm.includes("qual") || norm.includes("uid") || norm.includes("email")) return false;
        return norm === "parent" || norm.includes("parentname") || norm.includes("parentsname") || norm.includes("nameparent") || norm.includes("guardian") || (norm.includes("parent") && (norm.includes("name") || norm.includes("full")));
      case "phone":
        if (norm.includes("occup") || norm.includes("qual") || norm.includes("uid") || norm.includes("email")) return false;
        return norm.includes("phone") || norm.includes("mobile") || norm.includes("contact") || norm.includes("tel") || norm === "cell";
      case "phones":
        if (norm === "phone") return false;
        return norm.includes("phones") || norm.includes("alternative") || norm.includes("otherphone") || norm.includes("altphone") || norm.includes("alternatephone");
      case "email":
        if (norm.includes("login") || norm.includes("parent")) return false;
        return norm.includes("email") || norm.includes("mail");
      case "loginemail":
        return norm.includes("loginemail") || (norm.includes("login") && norm.includes("email"));
      case "parent_email":
        return norm.includes("parentemail") || (norm.includes("parent") && norm.includes("email")) || norm.includes("fatheremail") || norm.includes("motheremail");
      case "teacher_name":
        return norm.includes("teachername") || norm.includes("staffname") || norm.includes("facultyname") || norm === "teacher" || norm === "faculty" || norm === "staff" || norm === "name" || norm.includes("instructor");
      case "salary":
        return norm.includes("salary") || norm.includes("pay") || norm.includes("wage") || norm.includes("income");
      case "designation":
        return norm.includes("designation") || norm.includes("role") || norm.includes("post") || norm.includes("jobtitle") || norm.includes("position");
      case "subject":
        return norm.includes("subject") || norm === "sub" || norm.includes("subj");
      case "registerno":
        return norm.includes("registerno") || norm.includes("register_no") || norm.includes("admissionno") || norm.includes("admission_no") || norm === "regno";
      case "gender":
        return norm === "gender" || norm === "sex";
      case "birth_date":
        return norm.includes("birthdate") || norm.includes("dob") || norm.includes("dateofbirth");
      case "dob_in_words":
        return norm.includes("words") && (norm.includes("dob") || norm.includes("birth"));
      case "birth_place":
        return norm.includes("place") && (norm.includes("birth") || norm.includes("born"));
      case "address":
        return norm.includes("address") || norm.includes("location");
      case "country":
        return norm === "country" || norm === "nation";
      case "state":
        return norm === "state" || norm === "region";
      case "dist":
        return norm === "dist" || norm === "district";
      case "taluka":
        return norm === "taluka" || norm === "tehsil" || norm === "block";
      case "colony":
        return norm === "colony" || norm === "area" || norm === "locality";
      case "distance":
        return norm.includes("distance") || norm.includes("distancetoschool");
      case "admit_in_class":
        return norm.includes("admit") && (norm.includes("class") || norm.includes("grade"));
      case "last_class":
        return norm.includes("last") && (norm.includes("class") || norm.includes("grade") || norm.includes("std"));
      case "last_school_attended":
        return norm.includes("last") && (norm.includes("school") || norm.includes("previous"));
      case "admission_date":
        return norm.includes("admission") && norm.includes("date");
      case "father_occupation":
        return norm.includes("father") && (norm.includes("occup") || norm.includes("job") || norm.includes("work"));
      case "father_qualification":
        return norm.includes("father") && (norm.includes("qual") || norm.includes("edu"));
      case "father_uid_no":
        return norm.includes("father") && (norm.includes("uid") || norm.includes("aadhar") || norm.includes("idno"));
      case "mother_occupation":
        return norm.includes("mother") && (norm.includes("occup") || norm.includes("job") || norm.includes("work"));
      case "mother_qualification":
        return norm.includes("mother") && (norm.includes("qual") || norm.includes("edu"));
      case "mother_uid_no":
        return norm.includes("mother") && (norm.includes("uid") || norm.includes("aadhar") || norm.includes("idno"));
      case "mother_tongue":
        return norm.includes("tongue") || norm.includes("language");
      case "guardian":
        return norm.includes("guardian");
      case "sibling":
        return norm.includes("sibling") || norm.includes("brother") || norm.includes("sister");
      case "single_parent":
        return norm.includes("single") && norm.includes("parent");
      case "orphan":
        return norm.includes("orphan");
      case "aadhar_number":
        if (norm.includes("father") || norm.includes("mother") || norm.includes("parent")) return false;
        return norm.includes("aadhar") || norm.includes("uid") || norm.includes("uniqueno") || norm.includes("uniqueid");
      case "aapar_id":
        return norm.includes("aapar") || norm.includes("apaar");
      case "pen_number":
        return norm.includes("pen") || norm.includes("permanenteducation");
      case "saral_id":
        return norm.includes("saral");
      case "nationality":
        return norm.includes("nation");
      case "religion":
        return norm.includes("religion") || norm.includes("faith");
      case "caste":
        if (norm.includes("sub")) return false;
        return norm.includes("caste");
      case "sub_caste":
        return norm.includes("sub") && norm.includes("caste");
      case "progress":
        return norm.includes("progress");
      case "conduct":
        return norm.includes("conduct") || norm.includes("behavior");
      case "reason_for_leaving":
        return norm.includes("leaving") && norm.includes("reason");
      case "leaving_date":
        return norm.includes("leaving") && norm.includes("date");
      case "remarks":
        return norm.includes("remark") || norm.includes("comment");
      case "bloodgroup":
        return norm.includes("blood");
      case "height":
        return norm.includes("height");
      case "weight":
        return norm.includes("weight");
      case "handicap":
        if (norm === "disabled" || norm === "status" || norm === "active") return false;
        return norm.includes("handicap") || norm.includes("disabled") || norm.includes("divyang");
      case "muman":
        return norm.includes("muman");
      case "qrcode":
        return norm.includes("qr");
      case "rfid":
        return norm.includes("rfid");
      default:
        return false;
    }
  });
};

export default function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "warning" | "error" | "info" } | null>(null);

  // STEP 1: School Identity & Settings
  const [schoolName, setSchoolName] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [adminName, setAdminName] = useState("");
  const [gradingScale, setGradingScale] = useState("single"); // "single" | "mixed"

  // STEP 2: Grades & Subjects Configuration
  const ALL_AVAILABLE_GRADES = [
    "Nursery", "LKG", "UKG", 
    "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", 
    "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", 
    "Grade 11", "Grade 12"
  ];
  const [activeGrades, setActiveGrades] = useState<string[]>(["Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5"]);
  const [gradeSubjects, setGradeSubjects] = useState<Record<string, string[]>>({
    "Grade 1": ["Math", "English", "Science"],
    "Grade 2": ["Math", "English", "Science"],
    "Grade 3": ["Math", "English", "Science"],
    "Grade 4": ["Math", "English", "Science"],
    "Grade 5": ["Math", "English", "Science"],
  });
  const [tempSubjectInputs, setTempSubjectInputs] = useState<Record<string, string>>({});

  // STEP 3: Fees & Collection Settings
  const [feeFrequency, setFeeFrequency] = useState("monthly"); // "monthly" | "quarterly" | "semiannually" | "yearly"
  const [installmentsEnabled, setInstallmentsEnabled] = useState(false);
  const [maxInstallments, setMaxInstallments] = useState(3);
  const [installmentSchedules, setInstallmentSchedules] = useState<{ date: string; amount: number }[]>([]);

  // New Checklist & Exact Amount Installments State
  const [offeredPaymentOptions, setOfferedPaymentOptions] = useState<string[]>(["monthly"]);
  const [customInstallmentDates, setCustomInstallmentDates] = useState<string[]>([]);
  const [customInstallmentAmounts, setCustomInstallmentAmounts] = useState<Record<string, number[]>>({});
  const [semiannualAmounts, setSemiannualAmounts] = useState<Record<string, number>>({});
  const [quarterlyAmounts, setQuarterlyAmounts] = useState<Record<string, number>>({});
  const [monthlyAmounts, setMonthlyAmounts] = useState<Record<string, number>>({});

  // File Drop/Upload State
  const [isDragging, setIsDragging] = useState(false);
  const [scanStatus, setScanStatus] = useState<"idle" | "reading" | "scanning" | "error" | "done">("idle");
  const [scanProgress, setScanProgress] = useState(0);
  const [scanLogs, setScanLogs] = useState<string[]>([]);
  const [scannedRows, setScannedRows] = useState<any[]>([]);
  const [incompleteRows, setIncompleteRows] = useState<any[]>([]);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [reviewRows, setReviewRows] = useState<any[]>([]);
  const [reviewMode, setReviewMode] = useState<"master" | "teachers" | "students">("master");

  const getCriticalFields = (mode: "master" | "teachers" | "students") => {
    if (mode === "teachers") {
      return ["grade_level", "section", "teacher_name", "subject"];
    } else if (mode === "students") {
      return ["grade_level", "section", "student_name", "roll_id", "parent_name", "parent_phone"];
    } else {
      return [
        "school_name", "academic_year", "grade_level", "section", "base_fee",
        "teacher_name", "subject", "student_name", "roll_id", "parent_name", "parent_phone"
      ];
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const mode = step === 3 ? "teachers" : step === 4 ? "students" : "master";
      processRosterFile(files[0], mode);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const mode = step === 3 ? "teachers" : step === 4 ? "students" : "master";
      processRosterFile(files[0], mode);
    }
  };

  const validateAndMapParsedRows = (rows: any[], mode: "master" | "teachers" | "students") => {
    const criticalFields = getCriticalFields(mode);
    const rowsWithIndex = rows.map((row, idx) => ({
      ...row,
      _originalIndex: idx,
    }));

    const validatedRows = rowsWithIndex.map(row => {
      const missing: string[] = [];
      criticalFields.forEach(f => {
        if (row[f] === undefined || row[f] === null || String(row[f]).trim() === "") {
          missing.push(f);
        }
      });
      return {
        ...row,
        status: missing.length > 0 ? "incomplete" : "complete",
        missing_fields: missing
      };
    });

    const incomplete = validatedRows.filter(r => r.status === "incomplete");

    setScannedRows(validatedRows);
    setIncompleteRows(incomplete);
    setReviewRows([]);
    setIsReviewOpen(false);

    if (mode === "teachers") {
      mapScannedTeachers(validatedRows);
    } else if (mode === "students") {
      mapScannedStudents(validatedRows);
    } else {
      mapScannedDataToWizard(validatedRows);
    }

    if (incomplete.length > 0) {
      setToast({ message: `${incomplete.length} record(s) have missing fields. Please check them directly below.`, type: "warning" });
    } else {
      setToast({ message: `Successfully parsed and loaded ${validatedRows.length} records!`, type: "success" });
    }
  };

  const processRosterFile = (file: File, mode: "master" | "teachers" | "students") => {
    setScanStatus("reading");
    setScanProgress(0);
    setScanLogs(["Reading spreadsheet file..."]);
    setReviewMode(mode);
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const csv = XLSX.utils.sheet_to_csv(worksheet);
        const lines = csv.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        
        if (lines.length <= 1) {
          setScanStatus("error");
          setToast({ message: "The spreadsheet has no data rows.", type: "error" });
          return;
        }

        setScanLogs(prev => [...prev, "Processing spreadsheet file locally..."]);
        
        const rawRows = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1 });
        if (rawRows.length <= 1) {
          setScanStatus("error");
          setToast({ message: "The spreadsheet has no data rows.", type: "error" });
          return;
        }

        const headers = rawRows[0];

        const nameIdx = getHeaderIndex(headers, "student_name");
        const firstNameIdx = getHeaderIndex(headers, "first_name");
        const surnameIdx = getHeaderIndex(headers, "surname");
        const rollIdx = getHeaderIndex(headers, "roll_id");
        const phoneIdx = getHeaderIndex(headers, "phone");
        const phonesIdx = getHeaderIndex(headers, "phones");
        const classIdx = getHeaderIndex(headers, "class");
        const sectionIdx = getHeaderIndex(headers, "section");
        const fatherIdx = getHeaderIndex(headers, "father_name");
        const motherIdx = getHeaderIndex(headers, "mother_name");
        const parentNameIdx = getHeaderIndex(headers, "parent_name");
        const emailIdx = getHeaderIndex(headers, "email");
        const loginEmailIdx = getHeaderIndex(headers, "loginemail");
        
        // Parent email index
        const parentEmailIdx = getHeaderIndex(headers, "parent_email");

        // Teacher columns mapping indexes
        const teacherNameIdx = getHeaderIndex(headers, "teacher_name");
        const salaryIdx = getHeaderIndex(headers, "salary");
        const designationIdx = getHeaderIndex(headers, "designation");
        const subjectIdx = getHeaderIndex(headers, "subject");

        // Demographic columns mapping indexes
        const registerNoIdx = getHeaderIndex(headers, "registerno");
        const genderIdx = getHeaderIndex(headers, "gender");
        const birthDateIdx = getHeaderIndex(headers, "birth_date");
        const dobInWordsIdx = getHeaderIndex(headers, "dob_in_words");
        const birthPlaceIdx = getHeaderIndex(headers, "birth_place");
        const addressIdx = getHeaderIndex(headers, "address");
        const countryIdx = getHeaderIndex(headers, "country");
        const stateIdx = getHeaderIndex(headers, "state");
        const distIdx = getHeaderIndex(headers, "dist");
        const talukaIdx = getHeaderIndex(headers, "taluka");
        const colonyIdx = getHeaderIndex(headers, "colony");
        const distanceIdx = getHeaderIndex(headers, "distance");
        const admitInClassIdx = getHeaderIndex(headers, "admit_in_class");
        const lastClassIdx = getHeaderIndex(headers, "last_class");
        const lastSchoolIdx = getHeaderIndex(headers, "last_school_attended");
        const admissionDateIdx = getHeaderIndex(headers, "admission_date");
        const fatherOccIdx = getHeaderIndex(headers, "father_occupation");
        const fatherQualIdx = getHeaderIndex(headers, "father_qualification");
        const fatherUidIdx = getHeaderIndex(headers, "father_uid_no");
        const motherOccIdx = getHeaderIndex(headers, "mother_occupation");
        const motherQualIdx = getHeaderIndex(headers, "mother_qualification");
        const motherUidIdx = getHeaderIndex(headers, "mother_uid_no");
        const motherTongueIdx = getHeaderIndex(headers, "mother_tongue");
        const guardianIdx = getHeaderIndex(headers, "guardian");
        const siblingIdx = getHeaderIndex(headers, "sibling");
        const singleParentIdx = getHeaderIndex(headers, "single_parent");
        const orphanIdx = getHeaderIndex(headers, "orphan");
        const aadharIdx = getHeaderIndex(headers, "aadhar_number");
        const aaparIdx = getHeaderIndex(headers, "aapar_id");
        const penIdx = getHeaderIndex(headers, "pen_number");
        const saralIdx = getHeaderIndex(headers, "saral_id");
        const nationalityIdx = getHeaderIndex(headers, "nationality");
        const religionIdx = getHeaderIndex(headers, "religion");
        const casteIdx = getHeaderIndex(headers, "caste");
        const subCasteIdx = getHeaderIndex(headers, "sub_caste");
        const progressIdx = getHeaderIndex(headers, "progress");
        const conductIdx = getHeaderIndex(headers, "conduct");
        const reasonLeavingIdx = getHeaderIndex(headers, "reason_for_leaving");
        const leavingDateIdx = getHeaderIndex(headers, "leaving_date");
        const remarksIdx = getHeaderIndex(headers, "remarks");
        const bloodgroup_idx = getHeaderIndex(headers, "bloodgroup");
        const heightIdx = getHeaderIndex(headers, "height");
        const weightIdx = getHeaderIndex(headers, "weight");
        const handicapIdx = getHeaderIndex(headers, "handicap");
        const mumanIdx = getHeaderIndex(headers, "muman");
        const qrcodeIdx = getHeaderIndex(headers, "qrcode");
        const rfidIdx = getHeaderIndex(headers, "rfid");

        const localParsedRows: any[] = [];

        for (let rIdx = 1; rIdx < rawRows.length; rIdx++) {
          const row = rawRows[rIdx];
          if (!row || row.length === 0) continue;

          let sName = "";
          if (nameIdx !== -1 && row[nameIdx]) {
            sName = String(row[nameIdx]).trim();
          } else {
            const fn = firstNameIdx !== -1 && row[firstNameIdx] ? String(row[firstNameIdx]).trim() : "";
            const sn = surnameIdx !== -1 && row[surnameIdx] ? String(row[surnameIdx]).trim() : "";
            sName = `${fn} ${sn}`.trim();
          }
          if (!sName && mode !== "teachers") continue;

          let resolvedTeacherName = "";
          if (mode === "teachers") {
            if (teacherNameIdx !== -1 && row[teacherNameIdx]) {
              resolvedTeacherName = String(row[teacherNameIdx]).trim();
            } else if (nameIdx !== -1 && row[nameIdx]) {
              resolvedTeacherName = String(row[nameIdx]).trim();
            } else {
              const fn = firstNameIdx !== -1 && row[firstNameIdx] ? String(row[firstNameIdx]).trim() : "";
              const sn = surnameIdx !== -1 && row[surnameIdx] ? String(row[surnameIdx]).trim() : "";
              resolvedTeacherName = `${fn} ${sn}`.trim();
            }
            if (!resolvedTeacherName) continue;
          }

          const nameParts = sName.split(/\s+/);
          const parsedFirstName = nameParts[0] || "";
          const parsedSurname = nameParts.slice(1).join(" ") || "";

          let classVal = "";
          if (classIdx !== -1 && row[classIdx]) {
            classVal = String(row[classIdx]).trim();
          }
          let resolvedGrade = "Grade 10";
          let resolvedSection = "A";
          try {
            if (classVal) {
              const resolved = resolveGradeSection(classVal);
              resolvedGrade = resolved.grade;
              resolvedSection = resolved.section;
            }
          } catch (err) {}

          if (sectionIdx !== -1 && row[sectionIdx]) {
            resolvedSection = String(row[sectionIdx]).trim().toUpperCase();
          }

          let pPhone = "";
          if (phoneIdx !== -1 && row[phoneIdx]) {
            pPhone = cleanScientificNotation(row[phoneIdx]);
          } else if (phonesIdx !== -1 && row[phonesIdx]) {
            pPhone = cleanScientificNotation(row[phonesIdx]);
          }

          let pName = "";
          if (parentNameIdx !== -1 && row[parentNameIdx]) {
            pName = cleanScientificNotation(row[parentNameIdx]);
          } else if (fatherIdx !== -1 && row[fatherIdx]) {
            pName = cleanScientificNotation(row[fatherIdx]);
          } else if (motherIdx !== -1 && row[motherIdx]) {
            pName = cleanScientificNotation(row[motherIdx]);
          } else if (guardianIdx !== -1 && row[guardianIdx]) {
            pName = cleanScientificNotation(row[guardianIdx]);
          }

          let sEmail = "";
          if (emailIdx !== -1 && row[emailIdx]) {
            sEmail = String(row[emailIdx]).trim();
          } else if (loginEmailIdx !== -1 && row[loginEmailIdx]) {
            sEmail = String(row[loginEmailIdx]).trim();
          }

          let pEmail = "";
          if (parentEmailIdx !== -1 && row[parentEmailIdx]) {
            pEmail = String(row[parentEmailIdx]).trim();
          }

          const getVal = (idx: number) => idx !== -1 && row[idx] !== undefined && row[idx] !== null ? cleanScientificNotation(row[idx]) : undefined;
          const getBool = (idx: number) => {
            if (idx === -1 || row[idx] === undefined || row[idx] === null) return undefined;
            const strVal = String(row[idx]).toLowerCase();
            return strVal === "true" || strVal === "yes" || strVal === "1";
          };

          localParsedRows.push({
            student_name: sName,
            first_name: parsedFirstName,
            surname: parsedSurname,
            student_email: sEmail || null,
            roll_id: rollIdx !== -1 && row[rollIdx] ? Number(row[rollIdx]) || null : null,
            grade_level: resolvedGrade,
            section: resolvedSection,
            parent_name: pName || null,
            parent_email: pEmail || null,
            parent_phone: pPhone || null,
            register_no: getVal(registerNoIdx),
            gender: getVal(genderIdx),
            birth_date: parseExcelDate(getVal(birthDateIdx)) || null,
            dob_in_words: getVal(dobInWordsIdx),
            birth_place: getVal(birthPlaceIdx),
            phones: getVal(phonesIdx),
            address: getVal(addressIdx),
            country: getVal(countryIdx),
            state: getVal(stateIdx),
            dist: getVal(distIdx),
            taluka: getVal(talukaIdx),
            colony: getVal(colonyIdx),
            distance: getVal(distanceIdx),
            admit_in_class: getVal(admitInClassIdx),
            last_class: getVal(lastClassIdx),
            last_school_attended: getVal(lastSchoolIdx),
            admission_date: parseExcelDate(getVal(admissionDateIdx)) || null,
            father_name: getVal(fatherIdx) || null,
            father_occupation: getVal(fatherOccIdx),
            father_qualification: getVal(fatherQualIdx),
            father_uid_no: getVal(fatherUidIdx),
            mother_name: getVal(motherIdx) || null,
            mother_occupation: getVal(motherOccIdx),
            mother_qualification: getVal(motherQualIdx),
            mother_uid_no: getVal(motherUidIdx),
            mother_tongue: getVal(motherTongueIdx),
            guardian: getVal(guardianIdx),
            sibling: getVal(siblingIdx),
            single_parent: getBool(singleParentIdx),
            orphan: getBool(orphanIdx),
            aadhar_number: getVal(aadharIdx),
            aapar_id: getVal(aaparIdx),
            pen_number: getVal(penIdx),
            saral_id: getVal(saralIdx),
            nationality: getVal(nationalityIdx),
            religion: getVal(religionIdx),
            caste: getVal(casteIdx),
            sub_caste: getVal(subCasteIdx),
            progress: getVal(progressIdx),
            conduct: getVal(conductIdx),
            reason_for_leaving: getVal(reasonLeavingIdx),
            leaving_date: parseExcelDate(getVal(leavingDateIdx)) || null,
            remarks: getVal(remarksIdx),
            bloodgroup: getVal(bloodgroup_idx),
            height: getVal(heightIdx),
            weight: getVal(weightIdx),
            handicap: getBool(handicapIdx),
            login_email: sEmail || null,
            muman: getVal(mumanIdx),
            qrcode: getVal(qrcodeIdx),
            rfid: getVal(rfidIdx),
            teacher_name: mode === "teachers" ? resolvedTeacherName : undefined,
            salary: mode === "teachers" && salaryIdx !== -1 && row[salaryIdx] ? Number(String(row[salaryIdx]).replace(/[^0-9]/g, "")) || 30000 : 30000,
            designation: mode === "teachers" && designationIdx !== -1 && row[designationIdx] ? String(row[designationIdx]).trim() : "Teacher",
            subject: mode === "teachers" && subjectIdx !== -1 && row[subjectIdx] ? String(row[subjectIdx]).trim() : undefined,
          });
        }

        setScanStatus("done");
        setScanProgress(100);
        setScanLogs(prev => [...prev, `Local parse completed. Parsed ${localParsedRows.length} records.`]);
        setToast({ message: `Successfully parsed ${localParsedRows.length} records locally!`, type: "success" });

        validateAndMapParsedRows(localParsedRows, mode);
      } catch (err: any) {
        console.error(err);
        setScanStatus("error");
        setScanLogs(prev => [...prev, `❌ Critical Error: ${err.message || err}`]);
        setToast({ message: `Failed to process file: ${err.message}`, type: "error" });
      }
    };
    
    reader.onerror = () => {
      setScanStatus("error");
      setToast({ message: "Failed to read the file.", type: "error" });
    };
    
    reader.readAsArrayBuffer(file);
  };

  const processRosterPastedText = async (text: string, mode: "master" | "teachers" | "students") => {
    if (!text.trim()) {
      setToast({ message: "No data pasted. Paste text roster or upload a CSV file.", type: "warning" });
      return;
    }
    
    setScanStatus("reading");
    setScanProgress(0);
    setScanLogs(["Processing pasted text..."]);
    setReviewMode(mode);
    
    try {
      setScanLogs(prev => [...prev, "Processing text locally..."]);
      
      const workbook = XLSX.read(text, { type: "string" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      const rawRows = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1 });
      if (rawRows.length <= 1) {
        setScanStatus("error");
        setToast({ message: "The spreadsheet has no data rows.", type: "error" });
        return;
      }

      const headers = rawRows[0];

      const nameIdx = getHeaderIndex(headers, "student_name");
      const firstNameIdx = getHeaderIndex(headers, "first_name");
      const surnameIdx = getHeaderIndex(headers, "surname");
      const rollIdx = getHeaderIndex(headers, "roll_id");
      const phoneIdx = getHeaderIndex(headers, "phone");
      const phonesIdx = getHeaderIndex(headers, "phones");
      const classIdx = getHeaderIndex(headers, "class");
      const sectionIdx = getHeaderIndex(headers, "section");
      const fatherIdx = getHeaderIndex(headers, "father_name");
      const motherIdx = getHeaderIndex(headers, "mother_name");
      const parentNameIdx = getHeaderIndex(headers, "parent_name");
      const emailIdx = getHeaderIndex(headers, "email");
      const loginEmailIdx = getHeaderIndex(headers, "loginemail");
      
      // Parent email index
      const parentEmailIdx = getHeaderIndex(headers, "parent_email");

      // Teacher columns mapping indexes
      const teacherNameIdx = getHeaderIndex(headers, "teacher_name");
      const salaryIdx = getHeaderIndex(headers, "salary");
      const designationIdx = getHeaderIndex(headers, "designation");
      const subjectIdx = getHeaderIndex(headers, "subject");

      // Demographic columns mapping indexes
      const registerNoIdx = getHeaderIndex(headers, "registerno");
      const genderIdx = getHeaderIndex(headers, "gender");
      const birthDateIdx = getHeaderIndex(headers, "birth_date");
      const dobInWordsIdx = getHeaderIndex(headers, "dob_in_words");
      const birthPlaceIdx = getHeaderIndex(headers, "birth_place");
      const addressIdx = getHeaderIndex(headers, "address");
      const countryIdx = getHeaderIndex(headers, "country");
      const stateIdx = getHeaderIndex(headers, "state");
      const distIdx = getHeaderIndex(headers, "dist");
      const talukaIdx = getHeaderIndex(headers, "taluka");
      const colonyIdx = getHeaderIndex(headers, "colony");
      const distanceIdx = getHeaderIndex(headers, "distance");
      const admitInClassIdx = getHeaderIndex(headers, "admit_in_class");
      const lastClassIdx = getHeaderIndex(headers, "last_class");
      const lastSchoolIdx = getHeaderIndex(headers, "last_school_attended");
      const admissionDateIdx = getHeaderIndex(headers, "admission_date");
      const fatherOccIdx = getHeaderIndex(headers, "father_occupation");
      const fatherQualIdx = getHeaderIndex(headers, "father_qualification");
      const fatherUidIdx = getHeaderIndex(headers, "father_uid_no");
      const motherOccIdx = getHeaderIndex(headers, "mother_occupation");
      const motherQualIdx = getHeaderIndex(headers, "mother_qualification");
      const motherUidIdx = getHeaderIndex(headers, "mother_uid_no");
      const motherTongueIdx = getHeaderIndex(headers, "mother_tongue");
      const guardianIdx = getHeaderIndex(headers, "guardian");
      const siblingIdx = getHeaderIndex(headers, "sibling");
      const singleParentIdx = getHeaderIndex(headers, "single_parent");
      const orphanIdx = getHeaderIndex(headers, "orphan");
      const aadharIdx = getHeaderIndex(headers, "aadhar_number");
      const aaparIdx = getHeaderIndex(headers, "aapar_id");
      const penIdx = getHeaderIndex(headers, "pen_number");
      const saralIdx = getHeaderIndex(headers, "saral_id");
      const nationalityIdx = getHeaderIndex(headers, "nationality");
      const religionIdx = getHeaderIndex(headers, "religion");
      const casteIdx = getHeaderIndex(headers, "caste");
      const subCasteIdx = getHeaderIndex(headers, "sub_caste");
      const progressIdx = getHeaderIndex(headers, "progress");
      const conductIdx = getHeaderIndex(headers, "conduct");
      const reasonLeavingIdx = getHeaderIndex(headers, "reason_for_leaving");
      const leavingDateIdx = getHeaderIndex(headers, "leaving_date");
      const remarksIdx = getHeaderIndex(headers, "remarks");
      const bloodgroup_idx = getHeaderIndex(headers, "bloodgroup");
      const heightIdx = getHeaderIndex(headers, "height");
      const weightIdx = getHeaderIndex(headers, "weight");
      const handicapIdx = getHeaderIndex(headers, "handicap");
      const mumanIdx = getHeaderIndex(headers, "muman");
      const qrcodeIdx = getHeaderIndex(headers, "qrcode");
      const rfidIdx = getHeaderIndex(headers, "rfid");

      const localParsedRows: any[] = [];

      for (let rIdx = 1; rIdx < rawRows.length; rIdx++) {
        const row = rawRows[rIdx];
        if (!row || row.length === 0) continue;

        let sName = "";
        if (nameIdx !== -1 && row[nameIdx]) {
          sName = String(row[nameIdx]).trim();
        } else {
          const fn = firstNameIdx !== -1 && row[firstNameIdx] ? String(row[firstNameIdx]).trim() : "";
          const sn = surnameIdx !== -1 && row[surnameIdx] ? String(row[surnameIdx]).trim() : "";
          sName = `${fn} ${sn}`.trim();
        }
        if (!sName && mode !== "teachers") continue;

        let resolvedTeacherName = "";
        if (mode === "teachers") {
          if (teacherNameIdx !== -1 && row[teacherNameIdx]) {
            resolvedTeacherName = String(row[teacherNameIdx]).trim();
          } else if (nameIdx !== -1 && row[nameIdx]) {
            resolvedTeacherName = String(row[nameIdx]).trim();
          } else {
            const fn = firstNameIdx !== -1 && row[firstNameIdx] ? String(row[firstNameIdx]).trim() : "";
            const sn = surnameIdx !== -1 && row[surnameIdx] ? String(row[surnameIdx]).trim() : "";
            resolvedTeacherName = `${fn} ${sn}`.trim();
          }
          if (!resolvedTeacherName) continue;
        }

        const nameParts = sName.split(/\s+/);
        const parsedFirstName = nameParts[0] || "";
        const parsedSurname = nameParts.slice(1).join(" ") || "";

        let classVal = "";
        if (classIdx !== -1 && row[classIdx]) {
          classVal = String(row[classIdx]).trim();
        }
        let resolvedGrade = "Grade 10";
        let resolvedSection = "A";
        try {
          if (classVal) {
            const resolved = resolveGradeSection(classVal);
            resolvedGrade = resolved.grade;
            resolvedSection = resolved.section;
          }
        } catch (err) {}

        if (sectionIdx !== -1 && row[sectionIdx]) {
          resolvedSection = String(row[sectionIdx]).trim().toUpperCase();
        }

        let pPhone = "";
        if (phoneIdx !== -1 && row[phoneIdx]) {
          pPhone = cleanScientificNotation(row[phoneIdx]);
        } else if (phonesIdx !== -1 && row[phonesIdx]) {
          pPhone = cleanScientificNotation(row[phonesIdx]);
        }

        let pName = "";
        if (parentNameIdx !== -1 && row[parentNameIdx]) {
          pName = cleanScientificNotation(row[parentNameIdx]);
        } else if (fatherIdx !== -1 && row[fatherIdx]) {
          pName = cleanScientificNotation(row[fatherIdx]);
        } else if (motherIdx !== -1 && row[motherIdx]) {
          pName = cleanScientificNotation(row[motherIdx]);
        } else if (guardianIdx !== -1 && row[guardianIdx]) {
          pName = cleanScientificNotation(row[guardianIdx]);
        }

        let sEmail = "";
        if (emailIdx !== -1 && row[emailIdx]) {
          sEmail = String(row[emailIdx]).trim();
        } else if (loginEmailIdx !== -1 && row[loginEmailIdx]) {
          sEmail = String(row[loginEmailIdx]).trim();
        }

        let pEmail = "";
        if (parentEmailIdx !== -1 && row[parentEmailIdx]) {
          pEmail = String(row[parentEmailIdx]).trim();
        }

        const getVal = (idx: number) => idx !== -1 && row[idx] !== undefined && row[idx] !== null ? cleanScientificNotation(row[idx]) : undefined;
        const getBool = (idx: number) => {
          if (idx === -1 || row[idx] === undefined || row[idx] === null) return undefined;
          const strVal = String(row[idx]).toLowerCase();
          return strVal === "true" || strVal === "yes" || strVal === "1";
        };

        localParsedRows.push({
          student_name: sName,
          first_name: parsedFirstName,
          surname: parsedSurname,
          student_email: sEmail || null,
          roll_id: rollIdx !== -1 && row[rollIdx] ? Number(row[rollIdx]) || null : null,
          grade_level: resolvedGrade,
          section: resolvedSection,
          parent_name: pName || null,
          parent_email: pEmail || null,
          parent_phone: pPhone || null,
          register_no: getVal(registerNoIdx),
          gender: getVal(genderIdx),
          birth_date: parseExcelDate(getVal(birthDateIdx)) || null,
          dob_in_words: getVal(dobInWordsIdx),
          birth_place: getVal(birthPlaceIdx),
          phones: getVal(phonesIdx),
          address: getVal(addressIdx),
          country: getVal(countryIdx),
          state: getVal(stateIdx),
          dist: getVal(distIdx),
          taluka: getVal(talukaIdx),
          colony: getVal(colonyIdx),
          distance: getVal(distanceIdx),
          admit_in_class: getVal(admitInClassIdx),
          last_class: getVal(lastClassIdx),
          last_school_attended: getVal(lastSchoolIdx),
          admission_date: parseExcelDate(getVal(admissionDateIdx)) || null,
          father_name: getVal(fatherIdx) || null,
          father_occupation: getVal(fatherOccIdx),
          father_qualification: getVal(fatherQualIdx),
          father_uid_no: getVal(fatherUidIdx),
          mother_name: getVal(motherIdx) || null,
          mother_occupation: getVal(motherOccIdx),
          mother_qualification: getVal(motherQualIdx),
          mother_uid_no: getVal(motherUidIdx),
          mother_tongue: getVal(motherTongueIdx),
          guardian: getVal(guardianIdx),
          sibling: getVal(siblingIdx),
          single_parent: getBool(singleParentIdx),
          orphan: getBool(orphanIdx),
          aadhar_number: getVal(aadharIdx),
          aapar_id: getVal(aaparIdx),
          pen_number: getVal(penIdx),
          saral_id: getVal(saralIdx),
          nationality: getVal(nationalityIdx),
          religion: getVal(religionIdx),
          caste: getVal(casteIdx),
          sub_caste: getVal(subCasteIdx),
          progress: getVal(progressIdx),
          conduct: getVal(conductIdx),
          reason_for_leaving: getVal(reasonLeavingIdx),
          leaving_date: parseExcelDate(getVal(leavingDateIdx)) || null,
          remarks: getVal(remarksIdx),
          bloodgroup: getVal(bloodgroup_idx),
          height: getVal(heightIdx),
          weight: getVal(weightIdx),
          handicap: getBool(handicapIdx),
          login_email: sEmail || null,
          muman: getVal(mumanIdx),
          qrcode: getVal(qrcodeIdx),
          rfid: getVal(rfidIdx),
          teacher_name: mode === "teachers" ? resolvedTeacherName : undefined,
          salary: mode === "teachers" && salaryIdx !== -1 && row[salaryIdx] ? Number(String(row[salaryIdx]).replace(/[^0-9]/g, "")) || 30000 : 30000,
          designation: mode === "teachers" && designationIdx !== -1 && row[designationIdx] ? String(row[designationIdx]).trim() : "Teacher",
          subject: mode === "teachers" && subjectIdx !== -1 && row[subjectIdx] ? String(row[subjectIdx]).trim() : undefined,
        });
      }

      setScanStatus("done");
      setScanProgress(100);
      setScanLogs(prev => [...prev, `Local parse completed. Parsed ${localParsedRows.length} records.`]);
      setToast({ message: `Successfully parsed ${localParsedRows.length} records!`, type: "success" });

      validateAndMapParsedRows(localParsedRows, mode);
    } catch (err: any) {
      console.error(err);
      setScanStatus("error");
      setScanLogs(prev => [...prev, `❌ Critical Error: ${err.message || err}`]);
      setToast({ message: `Failed to process text: ${err.message}`, type: "error" });
    }
  };



  const mapScannedTeachers = (rows: any[]) => {
    const teacherRowsMap = new Map<string, any[]>();
    rows.forEach(r => {
      const key = (r.teacher_name || "").trim() || "Unnamed Teacher";
      if (!teacherRowsMap.has(key)) {
        teacherRowsMap.set(key, []);
      }
      teacherRowsMap.get(key)!.push(r);
    });

    const mappedTeachers = Array.from(teacherRowsMap.entries()).map(([name, tRows]) => {
      const subjectAllocMap = new Map<string, Set<string>>();
      tRows.forEach(r => {
        if (r.subject && r.grade_level && r.section) {
          const subject = r.subject.trim();
          const classKey = `${r.grade_level}-${r.section.toUpperCase()}`;
          if (!subjectAllocMap.has(subject)) {
            subjectAllocMap.set(subject, new Set());
          }
          subjectAllocMap.get(subject)!.add(classKey);
        }
      });

      const allocations = Array.from(subjectAllocMap.entries()).map(([subjectName, classesSet]) => ({
        subjectName,
        classes: Array.from(classesSet)
      }));

      return {
        id: `teach-${crypto.randomUUID()}`,
        name: name === "Unnamed Teacher" ? "" : name,
        designation: "Teacher",
        salary: 30000,
        allocations
      };
    });

    setTeachers(mappedTeachers);
    setToast({ message: `Scanned and loaded ${mappedTeachers.length} teachers.`, type: "success" });
  };

  const mapScannedStudents = (rows: any[]) => {
    const processedStudentsList: any[] = [];
    rows.forEach(r => {
      const sName = (r.student_name || "").trim();
      let studentEmail = (r.student_email || "").trim();
      let rollStr = String(r.roll_id || "").trim();
      const gradeLevel = r.grade_level || "Grade 1";
      const section = (r.section || "A").toUpperCase();
      const parentName = (r.parent_name || "").trim();
      let parentEmail = (r.parent_email || "").trim();
      const parentPhone = (r.parent_phone || "").trim();
      
      const repairedFields: any = {};
      
      if (!studentEmail) {
        const hash = Math.random().toString(36).substring(2, 6);
        const cleanName = sName ? sName.toLowerCase().replace(/[^a-z0-9]/g, "") : "student";
        studentEmail = `student.${cleanName}.${hash}@school.com`;
        repairedFields.emailGenerated = true;
      }
      if (!parentEmail) {
        const hash = Math.random().toString(36).substring(2, 6);
        const cleanName = sName ? sName.toLowerCase().replace(/[^a-z0-9]/g, "") : "parent";
        parentEmail = `parent.${cleanName}.${hash}@school.com`;
        repairedFields.emailGenerated = true;
      }

      if (!parentPhone) {
        repairedFields.whatsappDisabled = true;
      }

      let rollNumber = parseInt(rollStr, 10);
      if (isNaN(rollNumber) || rollNumber <= 0) {
        rollNumber = 0;
        repairedFields.rollAssigned = true;
      }

      const feeObj = gradeFees.find(gf => gf.grade === gradeLevel);
      const baseFee = feeObj ? feeObj.fee : 15000;

      const missing: string[] = [];
      if (!sName) missing.push("student_name");
      if (!parentName) missing.push("parent_name");
      if (!parentPhone) missing.push("parent_phone");

      processedStudentsList.push({
        name: sName,
        email: studentEmail,
        rollNumber,
        gradeLevel,
        section,
        parentName,
        parentEmail,
        parentPhone,
        repairedFields,
        baseFee,
        status: missing.length > 0 ? "incomplete" : "complete",
        missing_fields: missing,
        // Demographic columns copied from row 'r'
        first_name: r.first_name || null,
        surname: r.surname || null,
        register_no: r.register_no || null,
        gender: r.gender || null,
        birth_date: r.birth_date || null,
        dob_in_words: r.dob_in_words || null,
        birth_place: r.birth_place || null,
        phones: r.phones || null,
        address: r.address || null,
        country: r.country || null,
        state: r.state || null,
        dist: r.dist || null,
        taluka: r.taluka || null,
        colony: r.colony || null,
        distance: r.distance || null,
        admit_in_class: r.admit_in_class || null,
        last_class: r.last_class || null,
        last_school_attended: r.last_school_attended || null,
        admission_date: r.admission_date || null,
        father_name: r.father_name || r.parent_name || null,
        father_occupation: r.father_occupation || null,
        father_qualification: r.father_qualification || null,
        father_uid_no: r.father_uid_no || null,
        mother_name: r.mother_name || null,
        mother_occupation: r.mother_occupation || null,
        mother_qualification: r.mother_qualification || null,
        mother_uid_no: r.mother_uid_no || null,
        mother_tongue: r.mother_tongue || null,
        guardian: r.guardian || null,
        sibling: r.sibling || null,
        single_parent: r.single_parent || false,
        orphan: r.orphan || false,
        aadhar_number: r.aadhar_number || null,
        aapar_id: r.aapar_id || null,
        pen_number: r.pen_number || null,
        saral_id: r.saral_id || null,
        nationality: r.nationality || null,
        religion: r.religion || null,
        caste: r.caste || null,
        sub_caste: r.sub_caste || null,
        progress: r.progress || null,
        conduct: r.conduct || null,
        reason_for_leaving: r.reason_for_leaving || null,
        leaving_date: r.leaving_date || null,
        remarks: r.remarks || null,
        bloodgroup: r.bloodgroup || null,
        height: r.height || null,
        weight: r.weight || null,
        handicap: r.handicap || false,
        login_email: r.login_email || null,
        muman: r.muman || null,
        qrcode: r.qrcode || null,
        rfid: r.rfid || null,
      });
    });

    const classGroups: Record<string, typeof processedStudentsList> = {};
    for (const student of processedStudentsList) {
      const classKey = `${student.gradeLevel}-${student.section}`;
      if (!classGroups[classKey]) {
        classGroups[classKey] = [];
      }
      classGroups[classKey].push(student);
    }

    const finalRoster: any[] = [];

    for (const classKey in classGroups) {
      const classStudents = classGroups[classKey];
      const withRoll = classStudents.filter((s) => s.rollNumber > 0);
      const withoutRoll = classStudents.filter((s) => s.rollNumber === 0);

      withoutRoll.sort((a, b) => a.name.localeCompare(b.name));

      const usedRolls = new Set(withRoll.map((s) => s.rollNumber));
      let currentRoll = 1;

      for (const s of withoutRoll) {
        while (usedRolls.has(currentRoll)) {
          currentRoll++;
        }
        s.rollNumber = currentRoll;
        usedRolls.add(currentRoll);
        finalRoster.push(s);
      }

      for (const s of withRoll) {
        finalRoster.push(s);
      }
    }

    setParsedStudents(finalRoster);
    setToast({ message: `Scanned and loaded ${finalRoster.length} students.`, type: "success" });
  };

  const mapScannedDataToWizard = (rows: any[]) => {
    if (rows.length === 0) return;

    const firstSchoolRow = rows.find(r => r.school_name);
    if (firstSchoolRow) {
      setSchoolName(firstSchoolRow.school_name);
    }
    const firstYearRow = rows.find(r => r.academic_year);
    if (firstYearRow) {
      setAcademicYear(firstYearRow.academic_year);
    }
    const firstAdminRow = rows.find(r => r.admin_name);
    if (firstAdminRow) {
      setAdminName(firstAdminRow.admin_name);
    }

    const gradeLevels = Array.from(new Set(rows.map(r => r.grade_level).filter(Boolean))) as string[];
    const mappedGradeFees = gradeLevels.map(grade => {
      const matchingRow = rows.find(r => r.grade_level === grade && r.base_fee);
      const fee = matchingRow ? Number(matchingRow.base_fee) : 15000;
      return { grade, fee, extraCharge: 0, discount: 0 };
    });
    
    if (mappedGradeFees.length > 0) {
      setGradeFees(mappedGradeFees);
    }

    const tempMatrix: Record<string, Record<string, boolean>> = {};
    const classesSet = new Set<string>();
    
    rows.forEach(r => {
      if (r.grade_level && r.section) {
        const grade = r.grade_level;
        const sec = r.section.toUpperCase();
        
        if (!tempMatrix[grade]) {
          tempMatrix[grade] = {};
        }
        tempMatrix[grade][sec] = true;
        classesSet.add(`${grade}-${sec}`);
      }
    });
    
    const foundSections = Array.from(new Set(rows.map(r => r.section?.toUpperCase()).filter(Boolean))) as string[];
    if (foundSections.length > 0) {
      const mergedSections = Array.from(new Set([...sectionsList, ...foundSections])).sort();
      setSectionsList(mergedSections);
    }
    
    setMatrix(prev => {
      const next = { ...prev };
      rows.forEach(r => {
        if (r.grade_level && r.section) {
          const grade = r.grade_level;
          const sec = r.section.toUpperCase();
          if (!next[grade]) next[grade] = {};
          next[grade][sec] = true;
        }
      });
      return next;
    });

    const activeClasses: { gradeKey: string; section: string; baseFee: number }[] = [];
    classesSet.forEach(classKey => {
      const [grade, sec] = classKey.split("-");
      const feeObj = mappedGradeFees.find(gf => gf.grade === grade);
      const fee = feeObj ? feeObj.fee : 15000;
      activeClasses.push({ gradeKey: grade, section: sec, baseFee: fee });
    });
    setPreparedClasses(activeClasses);

    // Also map scanned teachers
    mapScannedTeachers(rows);
    // Also map scanned students
    mapScannedStudents(rows);
  };


  // Dynamic Grade List State
  const [gradeFees, setGradeFees] = useState<{ grade: string; fee: number; extraCharge: number; discount: number }[]>([
    { grade: "Grade 1", fee: 15000, extraCharge: 0, discount: 0 },
    { grade: "Grade 2", fee: 18000, extraCharge: 0, discount: 0 },
    { grade: "Grade 3", fee: 20000, extraCharge: 0, discount: 0 },
    { grade: "Grade 4", fee: 22000, extraCharge: 0, discount: 0 },
    { grade: "Grade 5", fee: 25000, extraCharge: 0, discount: 0 },
  ]);

  const [feeErrors, setFeeErrors] = useState<Record<string, boolean>>({});
  const [extraErrors, setExtraErrors] = useState<Record<string, boolean>>({});
  const [discountErrors, setDiscountErrors] = useState<Record<string, boolean>>({});

  const [newGradeName, setNewGradeName] = useState("");
  const [newGradeFee, setNewGradeFee] = useState("20000");

  // STEP 2: Mass Section Matrix Generator (Dynamic Sections)
  const [sectionsList, setSectionsList] = useState<string[]>(["A", "B", "C", "D", "E"]);
  const [matrix, setMatrix] = useState<Record<string, Record<string, boolean>>>({});
  const [preparedClasses, setPreparedClasses] = useState<{ gradeKey: string; section: string; baseFee: number }[]>([]);

  // STEP 3: Global Faculty Multi-Subject Matrix
  const [teachers, setTeachers] = useState<{ 
    id: string; 
    name: string; 
    designation: string; 
    salary: number; 
    allocations: { subjectName: string; classes: string[] }[] 
  }[]>([]);
  const [newTeacherName, setNewTeacherName] = useState("");
  const [newTeacherDesignation, setNewTeacherDesignation] = useState("Teacher");
  const [newTeacherSalary, setNewTeacherSalary] = useState("30000");
  const [skippedRowsWarning, setSkippedRowsWarning] = useState<string[]>([]);
  const [generatedUsername, setGeneratedUsername] = useState("");
  const [generatedPIN, setGeneratedPIN] = useState("");

  const downloadTeacherTemplate = () => {
    const headers = [
      "Teacher Name",
      "Designation",
      "Monthly Salary",
      "Subject",
      "Class"
    ];
    
    const sampleClass = preparedClasses[0] ? `${preparedClasses[0].gradeKey}-${preparedClasses[0].section}` : "Grade 1-A";
    const sampleClass2 = preparedClasses[1] ? `${preparedClasses[1].gradeKey}-${preparedClasses[1].section}` : "Grade 1-B";
    const sampleSubject = Object.values(gradeSubjects)[0]?.[0] || "Math";
    const sampleSubject2 = Object.values(gradeSubjects)[0]?.[1] || "English";

    const data = [
      headers,
      ["Mrs. Susan Smith", "Senior Teacher", "45000", sampleSubject, sampleClass],
      ["Mrs. Susan Smith", "Senior Teacher", "45000", sampleSubject2, sampleClass2],
      ["Mr. John Doe", "Assistant Teacher", "35000", "Science", sampleClass]
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Teachers Template");
    XLSX.writeFile(wb, "Teacher_Setup_Template.xlsx");
    setToast({ message: "Downloaded Teacher_Setup_Template.xlsx!", type: "success" });
  };

  const downloadStudentTemplate = () => {
    const headers = [
      "Student Name",
      "Roll Number",
      "Class",
      "Parent Name",
      "Parent Phone",
      "Parent Email",
      "Student Email",
      "Aadhar Number",
      "Gender",
      "Date of Birth (YYYY-MM-DD)",
      "Blood Group",
      "Address",
      "Category/Caste",
      "Admission Date (YYYY-MM-DD)",
      "Register No"
    ];
    
    const sampleClass = preparedClasses[0] ? `${preparedClasses[0].gradeKey}-${preparedClasses[0].section}` : "Grade 1-A";
    const sampleClass2 = preparedClasses[1] ? `${preparedClasses[1].gradeKey}-${preparedClasses[1].section}` : "Grade 1-B";
    
    const data = [
      headers,
      ["Aarav Sharma", "1", sampleClass, "Rajesh Sharma", "9876543210", "rajesh@mail.com", "aarav@school.com", "123456789012", "Male", "2015-05-12", "O+", "123 Park Street, Mumbai", "General", "2026-06-01", "REG001"],
      ["Diya Patel", "2", sampleClass, "Meera Patel", "9876543211", "meera@mail.com", "diya@school.com", "234567890123", "Female", "2015-08-22", "A+", "456 Lake View, Pune", "OBC", "2026-06-01", "REG002"],
      ["Kabir Singh", "1", sampleClass2, "Jaspreet Singh", "9876543212", "jaspreet@mail.com", "kabir@school.com", "345678901234", "Male", "2014-11-05", "B+", "789 Green Avenue, Delhi", "General", "2026-06-01", "REG003"]
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students Template");
    XLSX.writeFile(wb, "Student_Enrollment_Template.xlsx");
    setToast({ message: "Downloaded Student_Enrollment_Template.xlsx!", type: "success" });
  };

  // STEP 4: Robust Student Processing Terminal
  const [pastedText, setPastedText] = useState("");
  const [parsedStudents, setParsedStudents] = useState<any[]>([]);
  const [expandedStudentIndex, setExpandedStudentIndex] = useState<number | null>(null);
  const [studentCurrentPage, setStudentCurrentPage] = useState(1);
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentGrade, setNewStudentGrade] = useState("");
  const [newStudentSection, setNewStudentSection] = useState("");

  const handleAddStudent = () => {
    const sName = newStudentName.trim();
    const defGrade = newStudentGrade || preparedClasses[0]?.gradeKey || "Grade 10";
    const defSec = newStudentSection || preparedClasses[0]?.section || "A";
    const feeObj = gradeFees.find(gf => gf.grade === defGrade);
    const baseFee = feeObj ? feeObj.fee : 15000;

    const hash = Math.random().toString(36).substring(2, 6);
    const cleanName = sName ? sName.toLowerCase().replace(/[^a-z0-9]/g, "") : "student";
    const studentEmail = `student.${cleanName}.${hash}@school.com`;
    const parentEmail = `parent.${cleanName}.${hash}@school.com`;

    const newStudent = {
      name: sName,
      email: studentEmail,
      rollNumber: 0,
      gradeLevel: defGrade,
      section: defSec,
      parentName: "",
      parentEmail,
      parentPhone: "",
      repairedFields: { emailGenerated: true, whatsappDisabled: true, rollAssigned: true },
      baseFee,
      status: "incomplete",
      missing_fields: sName ? ["parent_name", "parent_phone"] : ["student_name", "parent_name", "parent_phone"],
      first_name: sName.split(/\s+/)[0] || "",
      surname: sName.split(/\s+/).slice(1).join(" ") || "",
    };

    setParsedStudents(prev => {
      const next = [...prev, newStudent];
      const incompleteCount = next.filter(s => s.status === "incomplete").length;
      setIncompleteRows(new Array(incompleteCount).fill({ status: "incomplete" }));
      return next;
    });

    setNewStudentName("");
    setToast({ message: `Added new student record: ${sName || "Unnamed"}`, type: "success" });
  };

  const handleUpdateStudentField = (index: number, field: string, value: any) => {
    setParsedStudents(prev => {
      const next = prev.map((s, idx) => {
        if (idx === index) {
          const updated = { ...s, [field]: value };
          
          if (field === "first_name" || field === "surname") {
            const fn = field === "first_name" ? value : (s.first_name || "");
            const sn = field === "surname" ? value : (s.surname || "");
            updated.name = `${fn} ${sn}`.trim() || s.name;
          } else if (field === "name") {
            updated.name = value;
            const parts = String(value).trim().split(/\s+/);
            updated.first_name = parts[0] || "";
            updated.surname = parts.slice(1).join(" ") || "";
          }
          
          if (field === "rollNumber") {
            updated.rollNumber = Number(value) || 0;
          }
          
          const missing: string[] = [];
          if (!updated.name || !updated.name.trim()) missing.push("student_name");
          if (!updated.gradeLevel || !updated.gradeLevel.trim()) missing.push("grade_level");
          if (!updated.section || !updated.section.trim()) missing.push("section");
          if (!updated.parentName || !updated.parentName.trim()) {
            missing.push("parent_name");
          }
          if (!updated.parentPhone || !updated.parentPhone.trim()) {
            missing.push("parent_phone");
          }
          
          updated.status = missing.length > 0 ? "incomplete" : "complete";
          updated.missing_fields = missing;
          
          return updated;
        }
        return s;
      });

      const incompleteCount = next.filter(s => s.status === "incomplete").length;
      setIncompleteRows(new Array(incompleteCount).fill({ status: "incomplete" }));

      return next;
    });
  };

  const handleRemoveStudent = (index: number) => {
    setParsedStudents(prev => {
      const next = prev.filter((_, idx) => idx !== index);
      const incompleteCount = next.filter(s => s.status === "incomplete").length;
      setIncompleteRows(new Array(incompleteCount).fill({ status: "incomplete" }));
      return next;
    });
    if (expandedStudentIndex === index) {
      setExpandedStudentIndex(null);
    }
  };



  // Synchronize activeGrades with gradeFees and subjects list
  useEffect(() => {
    setGradeFees((prev) => {
      const next = activeGrades.map(g => {
        const existing = prev.find(gf => gf.grade === g);
        return existing || { grade: g, fee: 20000, extraCharge: 0, discount: 0 };
      });
      return next;
    });
    setGradeSubjects((prev) => {
      const next = { ...prev };
      activeGrades.forEach(g => {
        if (!next[g]) {
          next[g] = ["Math", "English", "Science"];
        }
      });
      return next;
    });
  }, [activeGrades]);

  // Synchronize installment schedules when installments count or type changes
  useEffect(() => {
    if (installmentsEnabled) {
      setInstallmentSchedules((prev) => {
        const next = [...prev];
        const targetLen = maxInstallments;
        if (next.length < targetLen) {
          for (let i = next.length; i < targetLen; i++) {
            next.push({ date: "", amount: Math.round(100 / targetLen) });
          }
        } else if (next.length > targetLen) {
          next.splice(targetLen);
        }
        return next;
      });
    }
  }, [maxInstallments, installmentsEnabled]);

  // Synchronize custom installment dates count
  useEffect(() => {
    setCustomInstallmentDates((prev) => {
      const next = [...prev];
      if (next.length < maxInstallments) {
        for (let i = next.length; i < maxInstallments; i++) {
          next.push("");
        }
      } else if (next.length > maxInstallments) {
        next.splice(maxInstallments);
      }
      return next;
    });
  }, [maxInstallments]);

  // Synchronize custom installment amounts, semiannual, quarterly, and monthly amounts when base fees change
  useEffect(() => {
    setCustomInstallmentAmounts((prev) => {
      const next = { ...prev };
      for (const gf of gradeFees) {
        const netAmount = Math.max(0, gf.fee + gf.extraCharge - Math.round((gf.discount / 100) * gf.fee));
        const currentArr = next[gf.grade] || [];
        if (currentArr.length !== maxInstallments) {
          const arr: number[] = [];
          const baseShare = Math.floor(netAmount / maxInstallments);
          const remainder = netAmount % maxInstallments;
          for (let i = 0; i < maxInstallments; i++) {
            arr.push(baseShare + (i === maxInstallments - 1 ? remainder : 0));
          }
          next[gf.grade] = arr;
        }
      }
      return next;
    });

    setSemiannualAmounts((prev) => {
      const next = { ...prev };
      for (const gf of gradeFees) {
        const netAmount = Math.max(0, gf.fee + gf.extraCharge - Math.round((gf.discount / 100) * gf.fee));
        // Reset or initialize if not defined
        if (next[gf.grade] === undefined) {
          next[gf.grade] = Math.round(netAmount / 2);
        }
      }
      return next;
    });

    setQuarterlyAmounts((prev) => {
      const next = { ...prev };
      for (const gf of gradeFees) {
        const netAmount = Math.max(0, gf.fee + gf.extraCharge - Math.round((gf.discount / 100) * gf.fee));
        if (next[gf.grade] === undefined) {
          next[gf.grade] = Math.round(netAmount / 4);
        }
      }
      return next;
    });

    setMonthlyAmounts((prev) => {
      const next = { ...prev };
      for (const gf of gradeFees) {
        const netAmount = Math.max(0, gf.fee + gf.extraCharge - Math.round((gf.discount / 100) * gf.fee));
        if (next[gf.grade] === undefined) {
          next[gf.grade] = Math.round(netAmount / 12);
        }
      }
      return next;
    });
  }, [maxInstallments, gradeFees]);

  // Synchronize matrix whenever gradeFees or sectionsList changes
  useEffect(() => {
    setMatrix((prev) => {
      const next: Record<string, Record<string, boolean>> = {};
      for (const gf of gradeFees) {
        next[gf.grade] = {};
        for (const sec of sectionsList) {
          next[gf.grade][sec] = prev[gf.grade]?.[sec] !== undefined ? prev[gf.grade][sec] : (sec === "A");
        }
      }
      return next;
    });
  }, [gradeFees, sectionsList]);

  const getFeeValidationErrors = (): string[] => {
    const warnings: string[] = [];
    
    for (const gf of gradeFees) {
      const netAmount = Math.max(0, gf.fee + gf.extraCharge - Math.round((gf.discount / 100) * gf.fee));
      
      if (offeredPaymentOptions.includes("semiannually")) {
        const amt = semiannualAmounts[gf.grade] || 0;
        if (amt * 2 !== netAmount) {
          warnings.push(`${gf.grade} Semiannual fee (2 x ₹${amt} = ₹${amt * 2}) does not add up to Net Fee of ₹${netAmount.toLocaleString("en-IN")}`);
        }
      }
      
      if (offeredPaymentOptions.includes("quarterly")) {
        const amt = quarterlyAmounts[gf.grade] || 0;
        if (amt * 4 !== netAmount) {
          warnings.push(`${gf.grade} Quarterly fee (4 x ₹${amt} = ₹${amt * 4}) does not add up to Net Fee of ₹${netAmount.toLocaleString("en-IN")}`);
        }
      }
      
      if (offeredPaymentOptions.includes("monthly")) {
        const amt = monthlyAmounts[gf.grade] || 0;
        if (amt * 12 !== netAmount) {
          warnings.push(`${gf.grade} Monthly fee (12 x ₹${amt} = ₹${amt * 12}) does not add up to Net Fee of ₹${netAmount.toLocaleString("en-IN")}`);
        }
      }
      
      if (offeredPaymentOptions.includes("installments")) {
        const amts = customInstallmentAmounts[gf.grade] || [];
        const sum = amts.reduce((a, b) => a + b, 0);
        if (sum !== netAmount) {
          warnings.push(`${gf.grade} Custom Installments sum (${amts.map(x => "₹" + x).join(" + ")} = ₹${sum}) does not add up to Net Fee of ₹${netAmount.toLocaleString("en-IN")}`);
        }
      }
    }
    
    return warnings;
  };

  // --------------------------------------------------------------------------
  // Step 1 Actions
  // --------------------------------------------------------------------------
  const handleFeeChange = (index: number, val: string) => {
    const gradeName = gradeFees[index].grade;
    const num = Number(val);
    const isNegative = val.trim().startsWith("-") || num < 0;

    if (isNegative || isNaN(num)) {
      setFeeErrors(prev => ({ ...prev, [gradeName]: true }));
      setToast({ message: "Tuition fee cannot be negative.", type: "error" });
      const updated = [...gradeFees];
      updated[index].fee = isNaN(num) ? 0 : num;
      setGradeFees(updated);
    } else {
      setFeeErrors(prev => ({ ...prev, [gradeName]: false }));
      const updated = [...gradeFees];
      updated[index].fee = val === "" ? 0 : parseInt(val, 10);
      setGradeFees(updated);
    }
  };

  const handleExtraChange = (index: number, val: string) => {
    const gradeName = gradeFees[index].grade;
    const num = Number(val);
    const isNegative = val.trim().startsWith("-") || num < 0;

    if (isNegative || isNaN(num)) {
      setExtraErrors(prev => ({ ...prev, [gradeName]: true }));
      setToast({ message: "Extra charge cannot be negative.", type: "error" });
      const updated = [...gradeFees];
      updated[index].extraCharge = isNaN(num) ? 0 : num;
      setGradeFees(updated);
    } else {
      setExtraErrors(prev => ({ ...prev, [gradeName]: false }));
      const updated = [...gradeFees];
      updated[index].extraCharge = val === "" ? 0 : parseInt(val, 10);
      setGradeFees(updated);
    }
  };

  const handleDiscountChange = (index: number, val: string) => {
    const gradeName = gradeFees[index].grade;
    const num = Number(val);
    const isInvalid = isNaN(num) || num < 0 || num > 100;

    if (isInvalid) {
      setDiscountErrors(prev => ({ ...prev, [gradeName]: true }));
      setToast({ message: "Discount percentage must be 100% or less and non-negative.", type: "error" });
      const updated = [...gradeFees];
      updated[index].discount = isNaN(num) ? 0 : num;
      setGradeFees(updated);
    } else {
      setDiscountErrors(prev => ({ ...prev, [gradeName]: false }));
      const updated = [...gradeFees];
      updated[index].discount = val === "" ? 0 : parseInt(val, 10);
      setGradeFees(updated);
    }
  };

  const handleAddGrade = () => {
    const name = newGradeName.trim() || `Grade ${gradeFees.length + 1}`;
    if (gradeFees.some((g) => g.grade.toLowerCase() === name.toLowerCase())) {
      setToast({ message: "This grade level already exists.", type: "warning" });
      return;
    }
    setGradeFees([...gradeFees, { grade: name, fee: parseInt(newGradeFee, 10) || 0, extraCharge: 0, discount: 0 }]);
    setNewGradeName("");
  };

  const handleRemoveGrade = (gradeName: string) => {
    setGradeFees(gradeFees.filter((g) => g.grade !== gradeName));
    // Clear errors associated with the deleted grade
  };

  // Master Upload Actions & Ingestion removed - manual configuration active

  const handleStep1Next = () => {
    const activeSchoolName = schoolName.trim();
    const activeYear = academicYear.trim();
    const activeAdmin = adminName.trim();

    if (!activeSchoolName) {
      setToast({ message: "School Name is required.", type: "error" });
      setError("Please enter a School Name.");
      return;
    }
    if (!activeYear) {
      setToast({ message: "Academic Year is required.", type: "error" });
      setError("Please enter an Academic Year.");
      return;
    }
    if (!activeAdmin) {
      setToast({ message: "Admin Owner Name is required.", type: "error" });
      setError("Please enter an Admin Owner Name.");
      return;
    }

    // Block advancement if any input validation fails
    const hasErrors = Object.values(feeErrors).some(Boolean) || 
                      Object.values(extraErrors).some(Boolean) || 
                      Object.values(discountErrors).some(Boolean);
    if (hasErrors) {
      setToast({ message: "Please resolve the validation errors before advancing.", type: "error" });
      setError("Please fix the highlighted invalid entries in the Pricing Matrix.");
      return;
    }

    setSchoolName(activeSchoolName);
    setAcademicYear(activeYear);
    setAdminName(activeAdmin);

    setError("");
    setStep(2);
  };

  // --------------------------------------------------------------------------
  // Step 2 Actions
  // --------------------------------------------------------------------------
  const handleSelectAll = (checked: boolean) => {
    const updated = { ...matrix };
    for (const gf of gradeFees) {
      updated[gf.grade] = {};
      for (const sec of sectionsList) {
        updated[gf.grade][sec] = checked;
      }
    }
    setMatrix(updated);
  };

  const handleSelectAllForGrade = (gradeKey: string, checked: boolean) => {
    const updated = { ...matrix };
    updated[gradeKey] = {};
    for (const sec of sectionsList) {
      updated[gradeKey][sec] = checked;
    }
    setMatrix(updated);
  };

  const handleToggleCell = (gradeKey: string, section: string, checked: boolean) => {
    const updated = { ...matrix };
    if (!updated[gradeKey]) updated[gradeKey] = {};
    updated[gradeKey][section] = checked;
    setMatrix(updated);
  };

  const handleAddSection = () => {
    const lastSec = sectionsList[sectionsList.length - 1] || "@";
    const nextChar = String.fromCharCode(lastSec.charCodeAt(0) + 1);
    if (nextChar > "Z") {
      setToast({ message: "Cannot generate past Section Z.", type: "warning" });
      return;
    }
    setSectionsList([...sectionsList, nextChar]);
  };

  const handleRemoveSection = (sec: string) => {
    if (sectionsList.length <= 1) {
      setToast({ message: "Must retain at least one section column.", type: "warning" });
      return;
    }
    setSectionsList(sectionsList.filter((s) => s !== sec));
  };

  const handleGenerateStructure = () => {
    const classes: { gradeKey: string; section: string; baseFee: number }[] = [];
    for (const gf of gradeFees) {
      const baseFee = Math.max(0, gf.fee + (gf.extraCharge || 0) - Math.round(((gf.discount || 0) / 100) * gf.fee));
      const sections = matrix[gf.grade] || {};
      for (const sec of sectionsList) {
        if (sections[sec]) {
          classes.push({
            gradeKey: gf.grade,
            section: sec,
            baseFee: baseFee,
          });
        }
      }
    }
    setPreparedClasses(classes);
    setToast({
      message: `Generated school structure with ${classes.length} active classrooms.`,
      type: "success",
    });
  };

  const handleStep2Next = () => {
    if (preparedClasses.length === 0) {
      handleGenerateStructure();
    }
    setError("");
    setStep(3);
  };

  // --------------------------------------------------------------------------
  // Step 3 Actions
  // --------------------------------------------------------------------------
  const handleAddTeacher = () => {
    const activeName = newTeacherName.trim() || `Teacher #${teachers.length + 1}`;
    const designation = newTeacherDesignation.trim() || "Teacher";
    const salary = Number(newTeacherSalary) || 30000;
    setTeachers([
      ...teachers,
      {
        id: `teach-${crypto.randomUUID()}`,
        name: activeName,
        designation,
        salary,
        allocations: [],
      },
    ]);
    setNewTeacherName("");
    setNewTeacherDesignation("Teacher");
    setNewTeacherSalary("30000");
  };

  const handleRemoveTeacher = (id: string) => {
    setTeachers(teachers.filter((t) => t.id !== id));
  };

  const handleUpdateTeacherName = (id: string, name: string) => {
    setTeachers(teachers.map(t => t.id === id ? { ...t, name } : t));
  };

  const handleAddAllocation = (teacherId: string) => {
    setTeachers(teachers.map(t => {
      if (t.id !== teacherId) return t;
      return {
        ...t,
        allocations: [...t.allocations, { subjectName: "", classes: [] }]
      };
    }));
  };

  const handleRemoveAllocation = (teacherId: string, allocIndex: number) => {
    setTeachers(teachers.map(t => {
      if (t.id !== teacherId) return t;
      const nextAllocations = [...t.allocations];
      nextAllocations.splice(allocIndex, 1);
      return { ...t, allocations: nextAllocations };
    }));
  };

  const handleUpdateSubjectName = (teacherId: string, allocIndex: number, subjectName: string) => {
    setTeachers(teachers.map(t => {
      if (t.id !== teacherId) return t;
      const nextAllocations = t.allocations.map((alloc, idx) => {
        if (idx !== allocIndex) return alloc;
        return { ...alloc, subjectName };
      });
      return { ...t, allocations: nextAllocations };
    }));
  };

  const handleToggleAllocationClass = (teacherId: string, allocIndex: number, classKey: string) => {
    setTeachers(teachers.map(t => {
      if (t.id !== teacherId) return t;
      const nextAllocations = t.allocations.map((alloc, idx) => {
        if (idx !== allocIndex) return alloc;
        const isSelected = alloc.classes.includes(classKey);
        const nextClasses = isSelected
          ? alloc.classes.filter(c => c !== classKey)
          : [...alloc.classes, classKey];
        return { ...alloc, classes: nextClasses };
      });
      return { ...t, allocations: nextAllocations };
    }));
  };

  // Helper to resolve Grade and Section from messy strings
  const resolveGradeSection = (cellValue: string) => {
    const val = String(cellValue || "").trim();
    if (!val) throw new Error("Empty class field");

    // Matches Grade and Section smashed together or with separators, e.g., "5B", "Grade 5-A", "Class 6 Sec A"
    const match = val.match(/(?:grade|class|std|level)?\s*(\d+)\s*[-_\s\/\\]?\s*(?:sec|section|div)?\s*([a-zA-Z])/i);
    if (match) {
      const gradeNum = parseInt(match[1], 10);
      const sectionLetter = match[2].toUpperCase();
      return { grade: `Grade ${gradeNum}`, section: sectionLetter };
    }
    
    // Clean words to prevent matching letters from "Grade", "Class", etc.
    const cleanVal = val.toLowerCase()
      .replace(/grade|class|std|level|sec|section|div/g, "")
      .trim();

    const numMatch = cleanVal.match(/\d+/);
    const letterMatch = cleanVal.match(/[a-zA-Z]/);
    if (numMatch && letterMatch) {
      const gradeNum = parseInt(numMatch[0], 10);
      const sectionLetter = letterMatch[0].toUpperCase();
      return { grade: `Grade ${gradeNum}`, section: sectionLetter };
    }

    if (numMatch) {
      const gradeNum = parseInt(numMatch[0], 10);
      return { grade: `Grade ${gradeNum}`, section: "A" };
    }

    throw new Error(`Cannot parse Grade/Section format: "${val}"`);
  };

  // Defensive SheetJS spreadsheet parser for Step 3
  const parseStep3FileData = (rows: any[][]) => {
    // 1. Identify Headers
    const headerRow = rows[0] || [];
    const headers = headerRow.map((cell: any) => String(cell || "").trim().toLowerCase());

    let teacherColIndex = -1;
    let subjectColIndex = -1;
    let classColIndex = -1;

    for (let i = 0; i < headers.length; i++) {
      const h = headers[i];
      if (teacherColIndex === -1 && /teacher|name|faculty|staff|instructor/i.test(h)) {
        teacherColIndex = i;
      } else if (subjectColIndex === -1 && /subject|course|class\s*name|paper/i.test(h)) {
        subjectColIndex = i;
      } else if (classColIndex === -1 && /grade|std|level|section|div|class/i.test(h)) {
        classColIndex = i;
      }
    }

    // Default column fallbacks if headers are not found
    if (teacherColIndex === -1) teacherColIndex = 0;
    if (subjectColIndex === -1) subjectColIndex = 1;
    if (classColIndex === -1) classColIndex = 2;

    // Cache current state mapping by lowercase name to enable de-duplication/merge
    const teacherMap = new Map<string, typeof teachers[0]>();
    teachers.forEach((t) => {
      teacherMap.set(t.name.trim().toLowerCase(), JSON.parse(JSON.stringify(t)));
    });

    // Keep track of manual subjects already entered
    const initialManualSubjects = new Set<string>();
    teachers.forEach((t) => {
      const teacherKey = t.name.trim().toLowerCase();
      t.allocations.forEach((a) => {
        initialManualSubjects.add(`${teacherKey}:${a.subjectName.trim().toLowerCase()}`);
      });
    });

    const newWarnings: string[] = [];

    // 2. Loop systematically from row index 1 to the end
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length === 0) continue;

      const teacherName = String(row[teacherColIndex] || "").trim();
      const subjectName = String(row[subjectColIndex] || "").trim();
      const classValue = String(row[classColIndex] || "").trim();

      if (!teacherName && !subjectName && !classValue) continue; // Skip blank rows
      if (!teacherName) {
        newWarnings.push(`Row ${r + 1}: Skipping row with missing Teacher Name.`);
        continue;
      }

      try {
        let resolvedClassKey = "unassigned";
        
        if (classValue) {
          try {
            // Regex splitting for grade and section
            const resolved = resolveGradeSection(classValue);
            const classKey = `${resolved.grade}-${resolved.section}`;
            
            // Check if class exists in Step 2 generated list
            const exists = preparedClasses.some(c => `${c.gradeKey}-${c.section}` === classKey);
            if (exists) {
              resolvedClassKey = classKey;
            } else {
              throw new Error(`Classroom "${classKey}" was not generated in Step 2.`);
            }
          } catch (classErr: any) {
            resolvedClassKey = "unassigned";
            newWarnings.push(`Row ${r + 1}: Could not resolve classroom "${classValue}" for ${teacherName} (${classErr.message}).`);
          }
        } else {
          resolvedClassKey = "unassigned";
          newWarnings.push(`Row ${r + 1}: Classroom field is empty for ${teacherName}.`);
        }

        const teacherKey = teacherName.toLowerCase();
        let teacherObj = teacherMap.get(teacherKey);
        
        if (!teacherObj) {
          teacherObj = {
            id: `teach-${crypto.randomUUID()}`,
            name: teacherName,
            designation: "Teacher",
            salary: 30000,
            allocations: []
          };
          teacherMap.set(teacherKey, teacherObj);
        }

        if (subjectName) {
          const subjectKey = subjectName.toLowerCase();
          const existingAlloc = teacherObj.allocations.find(a => a.subjectName.toLowerCase() === subjectKey);
          
          // Conflict Resolution: Prioritize manual entries
          const isManualSubject = initialManualSubjects.has(`${teacherKey}:${subjectKey}`);

          if (existingAlloc) {
            if (!isManualSubject) {
              if (resolvedClassKey !== "unassigned" && !existingAlloc.classes.includes(resolvedClassKey)) {
                existingAlloc.classes.push(resolvedClassKey);
              }
            }
          } else {
            teacherObj.allocations.push({
              subjectName,
              classes: resolvedClassKey !== "unassigned" ? [resolvedClassKey] : []
            });
          }
        } else {
          newWarnings.push(`Row ${r + 1}: Missing subject name for ${teacherName}.`);
        }

      } catch (err: any) {
        newWarnings.push(`Row ${r + 1}: Failed to parse row: ${err.message}`);
      }
    }

    // Update state
    setTeachers(Array.from(teacherMap.values()));
    if (newWarnings.length > 0) {
      setSkippedRowsWarning(newWarnings);
      setToast({ message: `Ingested spreadsheet. ${newWarnings.length} warning(s) logged.`, type: "warning" });
    } else {
      setSkippedRowsWarning([]);
      setToast({ message: "Spreadsheet ingested and merged successfully!", type: "success" });
    }
  };

  const handleStep3Next = () => {
    setError("");
    setStep(4);
  };

  // --------------------------------------------------------------------------
  // Step 4 Actions & Parsing
  // --------------------------------------------------------------------------
  const parseRosterData = (text: string) => {
    if (!text.trim()) {
      setToast({ message: "No data pasted. Paste text roster or upload a CSV file.", type: "warning" });
      return;
    }

    const lines = text.split(/\r?\n/);
    const rawRows: string[][] = [];

    for (let line of lines) {
      line = line.trim();
      if (!line) continue;

      const cols = line.includes("\t") ? line.split("\t") : line.split(",");
      const cleaned = cols.map((c) => c.trim());

      const isHeader = cleaned.some((col) =>
        ["name", "roll", "email", "parent", "phone", "class", "grade"].includes(col.toLowerCase())
      );
      if (isHeader) continue;

      rawRows.push(cleaned);
    }

    const processedList: typeof parsedStudents = [];

    for (let row of rawRows) {
      if (row.length === 0 || !row[0]) continue;

      const name = row[0];
      let studentEmail = row[1] || "";
      let rollStr = row[2] || "";
      let classNameInput = row[3] || "";
      let parentName = row[4] || "";
      let parentEmail = row[5] || "";
      let parentPhone = row[6] || "";

      let repairedFields: any = {};

      // Match Grade
      let gradeNum = 10;
      let section = "A";

      const classMatch = classNameInput.match(/(Grade\s+)?(\d+)\s*[-_\s]?\s*([A-D])/i);
      if (classMatch) {
        gradeNum = parseInt(classMatch[2], 10);
        section = classMatch[3].toUpperCase();
      } else {
        const numMatch = classNameInput.match(/\d+/);
        const letterMatch = classNameInput.match(/[A-Z]/i);
        if (numMatch) gradeNum = parseInt(numMatch[0], 10);
        if (letterMatch) section = letterMatch[0].toUpperCase();
      }

      const gradeLevel = `Grade ${gradeNum}`;
      const baseFee = gradeFees.find((f) => f.grade === gradeLevel)?.fee || 0;

      // Email Auto-Repair
      if (!studentEmail) {
        const hash = Math.random().toString(36).substring(2, 6);
        const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, "");
        studentEmail = `student.${cleanName}.${hash}@school.com`;
        repairedFields.emailGenerated = true;
      }
      if (!parentEmail) {
        const hash = Math.random().toString(36).substring(2, 6);
        const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, "");
        parentEmail = `parent.${cleanName}.${hash}@school.com`;
        repairedFields.emailGenerated = true;
      }

      // Phone Auto-Repair
      if (!parentPhone) {
        parentPhone = "";
        repairedFields.whatsappDisabled = true;
      }

      if (!parentName) {
        parentName = `${name}'s Parent`;
      }

      let rollNumber = parseInt(rollStr, 10);
      if (isNaN(rollNumber) || rollNumber <= 0) {
        rollNumber = 0;
        repairedFields.rollAssigned = true;
      }

      processedList.push({
        name,
        email: studentEmail,
        rollNumber,
        gradeLevel,
        section,
        parentName,
        parentEmail,
        parentPhone,
        repairedFields,
        baseFee,
      });
    }

    // Roll number sequential auto-repair grouped by class
    const classGroups: Record<string, typeof processedList> = {};
    for (const student of processedList) {
      const classKey = `${student.gradeLevel}-${student.section}`;
      if (!classGroups[classKey]) {
        classGroups[classKey] = [];
      }
      classGroups[classKey].push(student);
    }

    const finalRoster: typeof parsedStudents = [];

    for (const classKey in classGroups) {
      const classStudents = classGroups[classKey];
      const withRoll = classStudents.filter((s) => s.rollNumber > 0);
      const withoutRoll = classStudents.filter((s) => s.rollNumber === 0);

      withoutRoll.sort((a, b) => a.name.localeCompare(b.name));

      const usedRolls = new Set(withRoll.map((s) => s.rollNumber));
      let currentRoll = 1;

      for (const s of withoutRoll) {
        while (usedRolls.has(currentRoll)) {
          currentRoll++;
        }
        s.rollNumber = currentRoll;
        usedRolls.add(currentRoll);
        finalRoster.push(s);
      }

      for (const s of withRoll) {
        finalRoster.push(s);
      }
    }

    setParsedStudents(finalRoster);
    setToast({
      message: `Parsed and auto-repaired ${finalRoster.length} student records successfully.`,
      type: "success",
    });
  };



  // --------------------------------------------------------------------------
  // Phase 1 Onboarding Launch (Writes Admin, School, and staging payload)
  // Uses server-side API route with service_role key to bypass RLS + email confirmation
  // --------------------------------------------------------------------------
  const handleCompleteLaunch = async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const schoolslug = schoolName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]/g, "")
        .substring(0, 15) || "school";

      const activeClasses = preparedClasses.length > 0 ? preparedClasses : (() => {
        const classes: { gradeKey: string; section: string; baseFee: number }[] = [];
        for (const gf of gradeFees) {
          const baseFee = Math.max(0, gf.fee + (gf.extraCharge || 0) - Math.round(((gf.discount || 0) / 100) * gf.fee));
          const sections = matrix[gf.grade] || {};
          for (const sec of sectionsList) {
            if (sections[sec]) {
              classes.push({ gradeKey: gf.grade, section: sec, baseFee });
            }
          }
        }
        return classes;
      })();

      const res = await fetch("/api/register-school", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolName: schoolName.trim(),
          academicYear: academicYear.trim(),
          adminName: adminName.trim(),
          schoolSlug: schoolslug,
          gradingScale,
          feeFrequency,
          installmentsEnabled,
          maxInstallments,
          installmentSchedules,
          gradeFees,
          sectionsList,
          preparedClasses: activeClasses,
          teachers,
          parsedStudents,
        }),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || "Registration failed. Please try again.");
      }

      setGeneratedUsername(result.adminUsername);
      setGeneratedPIN(result.adminPassword);
      setSuccess("Onboarding complete! Your admin profile has been registered.");
      setToast({ message: "School Credentials Configured!", type: "success" });
      setStep(7);

    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during school setup.");
    } finally {
      setLoading(false);
    }
  };

  // Group prepared classes by grade for row-based structured display
  const groupedClassesByGrade: Record<string, string[]> = {};
  for (const cls of preparedClasses) {
    if (!groupedClassesByGrade[cls.gradeKey]) {
      groupedClassesByGrade[cls.gradeKey] = [];
    }
    groupedClassesByGrade[cls.gradeKey].push(cls.section);
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col justify-center py-6 px-4 sm:px-6 lg:px-8 relative">
      {/* Toast Alert */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="w-full max-w-4xl mx-auto space-y-6">
        {/* Header Section */}
        {step < 7 && (
          <div className="flex flex-col items-center gap-2 mb-4 text-center">
            <img src="/logo.svg" alt="EduNexus" className="h-12 w-auto object-contain mb-1" />
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">School Setup Wizard</span>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 flex items-center justify-center gap-1.5">
              <Sparkles className="w-5 h-5 text-blue-800 animate-pulse" /> Register Your School
            </h2>
          </div>
        )}
        
        {/* Step Progress Bar */}
        {step < 7 && (
          <div className="flex justify-between items-center px-4 sm:px-12 text-xs font-semibold text-zinc-400 relative max-w-2xl mx-auto pb-4">
            <div className="absolute top-[18px] left-8 right-8 border-t border-zinc-200 -translate-y-1/2 z-0" />
            {[
              { num: 1, label: "Profile" },
              { num: 2, label: "Classes" },
              { num: 3, label: "Fees" },
              { num: 4, label: "Teachers" },
              { num: 5, label: "Students" },
              { num: 6, label: "Launch" }
            ].map((sObj) => (
              <div key={sObj.num} className="relative z-10 flex flex-col items-center gap-1">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center border font-bold transition-all duration-300 ${
                    step >= sObj.num
                      ? "bg-[#1572FE] border-[#1572FE] text-white shadow-sm"
                      : "bg-white border-zinc-200 text-zinc-400"
                  }`}
                >
                  {step > sObj.num ? "✓" : sObj.num}
                </div>
                <span className={`text-[9px] sm:text-[10px] uppercase tracking-wider font-bold ${step === sObj.num ? "text-[#1572FE]" : "text-zinc-400"}`}>
                  {sObj.label}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Wizard Main Card */}
        <Card className="border border-zinc-200 shadow-md rounded-2xl">
          {error && (
            <div className="p-4 text-xs bg-red-50 border-b border-red-200 text-red-700 font-medium animate-fade-in flex items-start gap-2 rounded-t-2xl">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-650" />
              <div className="whitespace-pre-line">{error}</div>
            </div>
          )}
          {success && step < 5 && (
            <div className="p-4 text-xs bg-blue-50 border-b border-blue-200 text-[#1572FE] font-medium animate-fade-in flex items-center gap-1.5 rounded-t-2xl">
              <CheckCircle2 className="w-4.5 h-4.5 text-blue-700" />
              {success}
            </div>
          )}

          {/* ==================================================================
              STEP 1: SCHOOL IDENTITY & GRADE PRICING MATRIX
              ================================================================== */}
          {step === 1 && (
            <div>
              <CardHeader className="p-4 sm:p-6 border-b border-zinc-150">
                <CardTitle className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-zinc-500">
                  Step 1: School Profile
                </CardTitle>
                <CardDescription className="text-xs">
                  Tell us a bit about your school to start setting up the portal.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-800">School Name</label>
                    <Input
                      value={schoolName}
                      onChange={(e) => setSchoolName(e.target.value)}
                      placeholder="e.g. Happy Days High School"
                    />
                    <p className="text-[10px] text-zinc-450">The official name of your school.</p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-800">Academic Session</label>
                    <Input
                      value={academicYear}
                      onChange={(e) => setAcademicYear(e.target.value)}
                      placeholder="e.g. 2026-2027"
                    />
                    <p className="text-[10px] text-zinc-450">The current or upcoming session.</p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-800">Administrator Name</label>
                    <Input
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      placeholder="e.g. Principal Ashaz"
                    />
                    <p className="text-[10px] text-zinc-450">The person managing this system.</p>
                  </div>
                </div>

                <div className="border-t border-zinc-150 pt-4 space-y-3">
                  <label className="text-xs font-bold text-zinc-800">Grading Scale System</label>
                  <p className="text-[11px] text-zinc-500">
                    How do you grade your students? Select the option that best fits your school:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div
                      onClick={() => setGradingScale("single")}
                      className={`border rounded-2xl p-4 cursor-pointer transition-all ${
                        gradingScale === "single"
                          ? "border-[#1572FE] bg-[#e6f0ff] ring-1 ring-[#1572FE]/30"
                          : "border-zinc-200 hover:bg-zinc-50 bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <input
                          type="radio"
                          checked={gradingScale === "single"}
                          onChange={() => setGradingScale("single")}
                          className="w-4 h-4 text-[#1572FE]"
                        />
                        <span className="text-xs font-bold text-zinc-900">Same Grading Scale for All Classes</span>
                      </div>
                      <p className="text-[10px] text-zinc-500 leading-normal pl-6">
                        Every grade level uses the exact same system (e.g. Marks out of 100 or grades A to F across the entire school).
                      </p>
                    </div>

                    <div
                      onClick={() => setGradingScale("mixed")}
                      className={`border rounded-2xl p-4 cursor-pointer transition-all ${
                        gradingScale === "mixed"
                          ? "border-[#1572FE] bg-[#e6f0ff] ring-1 ring-[#1572FE]/30"
                          : "border-zinc-200 hover:bg-zinc-50 bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <input
                          type="radio"
                          checked={gradingScale === "mixed"}
                          onChange={() => setGradingScale("mixed")}
                          className="w-4 h-4 text-[#1572FE]"
                        />
                        <span className="text-xs font-bold text-zinc-900">Different Grading Scale per Classroom</span>
                      </div>
                      <p className="text-[10px] text-zinc-500 leading-normal pl-6">
                        Varying systems for different sections (e.g. Letter grades for primary, and marks/percentages for higher grades).
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="p-4 sm:p-6 border-t border-zinc-150 bg-zinc-50/50 flex flex-col sm:flex-row gap-3.5 items-center sm:justify-between">
                <Link href="/login" className="text-xs font-semibold text-zinc-500 hover:text-zinc-850 flex items-center gap-1 order-2 sm:order-1">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
                </Link>
                <Button onClick={handleStep1Next} className="gap-1.5 bg-[#1572FE] hover:bg-[#0f62d4] w-full sm:w-auto order-1 sm:order-2 justify-center cursor-pointer font-bold text-white">
                  Next: Classrooms & Subjects <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </CardFooter>
            </div>
          )}

          {/* ==================================================================
              STEP 2: MASS SECTION MATRIX GENERATOR
              ================================================================== */}
          {step === 2 && (
            <div>
              <CardHeader className="p-4 sm:p-6 border-b border-zinc-150">
                <CardTitle className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-zinc-500">
                  Step 2: Classrooms & Subjects Configuration
                </CardTitle>
                <CardDescription className="text-xs">
                  Select active grade levels, manage sections, and define subjects taught in each grade.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-6">
                
                {/* 2.1 Grade Selection Checklist */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                    1. Select Active Grades
                  </span>
                  <p className="text-[11px] text-zinc-550 mb-2">
                    Which classes does your school currently operate? Tap to select.
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 bg-zinc-50 p-3.5 rounded-2xl border border-zinc-200">
                    {ALL_AVAILABLE_GRADES.map((g) => {
                      const isActive = activeGrades.includes(g);
                      return (
                        <button
                          key={g}
                          type="button"
                          onClick={() => {
                            if (isActive) {
                              if (activeGrades.length <= 1) {
                                setToast({ message: "You must keep at least one active grade level.", type: "warning" });
                                return;
                              }
                              setActiveGrades(activeGrades.filter(x => x !== g));
                            } else {
                              setActiveGrades([...activeGrades, g].sort((a, b) => {
                                return ALL_AVAILABLE_GRADES.indexOf(a) - ALL_AVAILABLE_GRADES.indexOf(b);
                              }));
                            }
                          }}
                          className={`px-3 py-2 text-xs font-semibold rounded-xl border text-center transition-all ${
                            isActive
                              ? "bg-[#1572FE] text-white border-[#1572FE] shadow-sm"
                              : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
                          }`}
                        >
                          {g}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2.2 Sections Grid Matrix */}
                <div className="space-y-2 border-t border-zinc-150 pt-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                        2. Class Sections Grid
                      </span>
                      <p className="text-[11px] text-zinc-550">
                        Check which sections exist for each active grade level.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleAddSection}
                        size="sm"
                        className="h-7 text-[11px] font-bold border-zinc-300 text-[#1572FE]"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" /> Add Section Column
                      </Button>
                      {sectionsList.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleRemoveSection(sectionsList[sectionsList.length - 1])}
                          size="sm"
                          className="h-7 text-[11px] font-bold border-zinc-300 text-red-650 hover:bg-red-50"
                        >
                          Remove Last Section
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="overflow-x-auto border border-zinc-200 rounded-xl bg-white">
                    <table className="min-w-full divide-y divide-zinc-200 text-left text-xs">
                      <thead className="bg-zinc-50 text-zinc-550 font-bold uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="checkbox"
                                title="Toggle all sections for all grades"
                                onChange={(e) => handleSelectAll(e.target.checked)}
                                className="w-3.5 h-3.5 rounded border-zinc-300 text-[#1572FE] focus:ring-[#1572FE] cursor-pointer"
                              />
                              <span>Grade</span>
                            </div>
                          </th>
                          {sectionsList.map((sec) => (
                            <th key={sec} className="px-4 py-2.5 text-center">Section {sec}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 text-zinc-800">
                        {activeGrades.map((grade) => {
                          const gradeSections = matrix[grade] || {};
                          return (
                            <tr key={grade} className="hover:bg-zinc-50/20">
                              <td className="px-4 py-2 font-bold text-zinc-900 flex items-center justify-between gap-2 min-w-[140px]">
                                <span>{grade}</span>
                                <input
                                  type="checkbox"
                                  title={`Toggle all sections for ${grade}`}
                                  checked={sectionsList.every((sec) => !!gradeSections[sec])}
                                  onChange={(e) => handleSelectAllForGrade(grade, e.target.checked)}
                                  className="w-3.5 h-3.5 rounded border-zinc-300 text-[#1572FE] focus:ring-[#1572FE] cursor-pointer"
                                />
                              </td>
                              {sectionsList.map((sec) => (
                                <td key={sec} className="px-4 py-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={!!gradeSections[sec]}
                                    onChange={(e) => handleToggleCell(grade, sec, e.target.checked)}
                                    className="w-4 h-4 rounded border-zinc-300 text-[#1572FE] focus:ring-[#1572FE] cursor-pointer"
                                  />
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 2.3 Grade-Specific Subjects */}
                <div className="space-y-4 border-t border-zinc-150 pt-4">
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                      3. Subjects Configured for Each Grade
                    </span>
                    <p className="text-[11px] text-zinc-550">
                      Tell us which subjects are offered in each grade. Type custom subjects or click suggestions.
                    </p>
                  </div>

                  <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                    {activeGrades.map((grade) => {
                      const currentSubjects = gradeSubjects[grade] || [];
                      const tempVal = tempSubjectInputs[grade] || "";
                      return (
                        <div key={grade} className="p-4 border border-zinc-200 rounded-xl bg-white shadow-xs space-y-3">
                          <div className="flex justify-between items-center">
                            <h4 className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                              <BookOpen className="w-4 h-4 text-[#1572FE]" /> {grade}
                            </h4>
                            <span className="text-[10px] text-zinc-400 font-semibold">{currentSubjects.length} subject(s)</span>
                          </div>

                          {/* Subject Tags */}
                          <div className="flex flex-wrap gap-1.5">
                            {currentSubjects.map((sub) => (
                              <span
                                key={sub}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-150 border border-zinc-200 text-xs font-bold text-zinc-700"
                              >
                                {sub}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setGradeSubjects({
                                      ...gradeSubjects,
                                      [grade]: currentSubjects.filter(x => x !== sub)
                                    });
                                  }}
                                  className="text-zinc-400 hover:text-red-650 font-bold"
                                >
                                  ✕
                                </button>
                              </span>
                            ))}
                            {currentSubjects.length === 0 && (
                              <span className="text-[11px] text-zinc-400 italic">No subjects configured. Add one below:</span>
                            )}
                          </div>

                          {/* Input box to add */}
                          <div className="flex gap-2 items-center">
                            <Input
                              value={tempVal}
                              onChange={(e) => setTempSubjectInputs({ ...tempSubjectInputs, [grade]: e.target.value })}
                              placeholder="Type subject (e.g. Civics)"
                              className="h-8 text-xs max-w-[200px]"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  if (tempVal.trim()) {
                                    const list = gradeSubjects[grade] || [];
                                    if (!list.includes(tempVal.trim())) {
                                      setGradeSubjects({
                                        ...gradeSubjects,
                                        [grade]: [...list, tempVal.trim()]
                                      });
                                    }
                                    setTempSubjectInputs({ ...tempSubjectInputs, [grade]: "" });
                                  }
                                }
                              }}
                            />
                            <Button
                              type="button"
                              onClick={() => {
                                if (tempVal.trim()) {
                                  const list = gradeSubjects[grade] || [];
                                  if (!list.includes(tempVal.trim())) {
                                    setGradeSubjects({
                                      ...gradeSubjects,
                                      [grade]: [...list, tempVal.trim()]
                                    });
                                  }
                                  setTempSubjectInputs({ ...tempSubjectInputs, [grade]: "" });
                                }
                              }}
                              size="sm"
                              className="h-8 bg-[#1572FE] hover:bg-[#0f62d4] text-white font-bold text-xs"
                            >
                              Add
                            </Button>
                          </div>

                          {/* Suggested Subjects */}
                          <div className="space-y-1">
                            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Suggested Quick Add:</span>
                            <div className="flex flex-wrap gap-1">
                              {["Math", "English", "Science", "Social Studies", "Computers", "Hindi", "Art", "GK"].map((sugg) => {
                                const exists = currentSubjects.includes(sugg);
                                if (exists) return null;
                                return (
                                  <button
                                    key={sugg}
                                    type="button"
                                    onClick={() => {
                                      const list = gradeSubjects[grade] || [];
                                      setGradeSubjects({
                                        ...gradeSubjects,
                                        [grade]: [...list, sugg]
                                      });
                                    }}
                                    className="px-2 py-0.5 rounded-md border border-zinc-200 hover:bg-zinc-50 text-[10px] font-semibold text-zinc-550 bg-white"
                                  >
                                    + {sugg}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="p-4 sm:p-6 border-t border-zinc-150 bg-zinc-50/50 flex flex-col sm:flex-row justify-between gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="gap-1.5 w-full sm:w-auto font-semibold">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </Button>
                <Button onClick={handleStep2Next} className="gap-1.5 bg-[#1572FE] hover:bg-[#0f62d4] text-white font-bold w-full sm:w-auto">
                  Next: Tuition Fees <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </CardFooter>
            </div>
          )}

          {/* ==================================================================
              STEP 3: SCHOOL FEES & PAYMENTS
              ================================================================== */}
          {step === 3 && (
            <div>
              <CardHeader className="p-4 sm:p-6 border-b border-zinc-150">
                <CardTitle className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-zinc-500">
                  Step 3: School Fees & Payments
                </CardTitle>
                <CardDescription className="text-xs">
                  Set up annual grade-specific fees, billing cycles, and installment settings.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-6">
                
                {/* 3.1 Tuition Fees per Grade */}
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                      1. Pricing & Annual Tuition Grid
                    </span>
                    <p className="text-[11px] text-zinc-550">
                      Set the yearly tuition amount for each active grade level. Enter numbers only.
                    </p>
                  </div>

                  <div className="overflow-x-auto border border-zinc-200 rounded-xl bg-white shadow-xs">
                    <table className="min-w-full divide-y divide-zinc-200 text-left text-xs">
                      <thead className="bg-zinc-50 text-zinc-550 font-bold uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-3">Grade Level</th>
                          <th className="px-4 py-3">Annual Tuition (₹)</th>
                          <th className="px-4 py-3">Misc Fees / Extra (₹)</th>
                          <th className="px-4 py-3">Early Discount (%)</th>
                          <th className="px-4 py-3 text-right">Net Fee (Calculated)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 text-zinc-800">
                        {gradeFees.map((gf, index) => {
                          const netAmount = Math.max(0, gf.fee + gf.extraCharge - Math.round((gf.discount / 100) * gf.fee));
                          return (
                            <tr key={gf.grade} className="hover:bg-zinc-50/20">
                              <td className="px-4 py-2.5 font-bold text-zinc-900">{gf.grade}</td>
                              <td className="px-4 py-2.5">
                                <div className="relative">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">₹</span>
                                  <Input
                                    type="text"
                                    value={gf.fee === 0 ? "" : gf.fee}
                                    onChange={(e) => handleFeeChange(index, e.target.value)}
                                    className="pl-6 h-8 text-xs font-semibold max-w-[120px]"
                                    placeholder="0"
                                  />
                                </div>
                              </td>
                              <td className="px-4 py-2.5">
                                <div className="relative">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">₹</span>
                                  <Input
                                    type="text"
                                    value={gf.extraCharge === 0 ? "" : gf.extraCharge}
                                    onChange={(e) => handleExtraChange(index, e.target.value)}
                                    className="pl-6 h-8 text-xs font-semibold max-w-[110px]"
                                    placeholder="0"
                                  />
                                </div>
                              </td>
                              <td className="px-4 py-2.5">
                                <div className="relative flex items-center max-w-[90px]">
                                  <Input
                                    type="text"
                                    value={gf.discount === 0 ? "" : gf.discount}
                                    onChange={(e) => handleDiscountChange(index, e.target.value)}
                                    className="h-8 text-xs font-semibold w-full pr-5"
                                    placeholder="0"
                                  />
                                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">%</span>
                                </div>
                              </td>
                              <td className="px-4 py-2.5 text-right font-bold text-[#1572FE]">
                                ₹{netAmount.toLocaleString("en-IN")}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 3.2 Payment Collection Settings */}
                <div className="space-y-4 border-t border-zinc-150 pt-4">
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                      2. Payment Offered Options
                    </span>
                    <p className="text-[11px] text-zinc-550">
                      Select all the payment intervals you offer to parents. If you offer Custom Installments, you can specify exact cash values for each grade.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {[
                      { id: "yearly", label: "Yearly (1 payment / year)", desc: "Parents pay the full annual fee in one single payment." },
                      { id: "semiannually", label: "Semiannually (2 payments / year)", desc: "Parents pay in two halves." },
                      { id: "quarterly", label: "Quarterly (4 payments / year)", desc: "Parents pay every three months." },
                      { id: "monthly", label: "Monthly (12 payments / year)", desc: "Parents pay small amounts every month." },
                      { id: "installments", label: "Custom Installments", desc: "Define a custom number of installments with specific due dates and exact amounts per grade level." }
                    ].map((opt) => {
                      const isChecked = offeredPaymentOptions.includes(opt.id);
                      return (
                        <div
                          key={opt.id}
                          onClick={() => {
                            if (isChecked) {
                              setOfferedPaymentOptions(offeredPaymentOptions.filter(x => x !== opt.id));
                            } else {
                              setOfferedPaymentOptions([...offeredPaymentOptions, opt.id]);
                            }
                          }}
                          className={`border rounded-2xl p-4 cursor-pointer transition-all flex items-start gap-3 ${
                            isChecked
                              ? "border-[#1572FE] bg-[#e6f0ff] ring-1 ring-[#1572FE]/30"
                              : "border-zinc-200 hover:bg-zinc-50 bg-white"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}} // handled by div click
                            className="w-4 h-4 text-[#1572FE] rounded border-zinc-300 mt-0.5 cursor-pointer"
                          />
                          <div>
                            <span className="text-xs font-bold text-zinc-900 block">{opt.label}</span>
                            <p className="text-[10px] text-zinc-550 leading-normal">{opt.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Standard Period Amount Configurations */}
                  {gradeFees.length > 0 && offeredPaymentOptions.some(o => ["semiannually", "quarterly", "monthly"].includes(o)) && (
                    <div className="p-4 rounded-xl border border-zinc-200 bg-[#fafafa] space-y-4">
                      <h5 className="font-semibold text-zinc-800 flex items-center gap-1.5 text-xs">
                        <Wallet className="w-4 h-4 text-[#1572FE]" /> Standard Cycles Payments Grid
                      </h5>
                      <p className="text-[10px] text-zinc-550">
                        Please enter the amount parents pay *per period* for each standard cycle you checked. We will check that they add up to the Net Fee.
                      </p>
                      
                      <div className="overflow-x-auto border border-zinc-200 rounded-lg bg-white">
                        <table className="min-w-full divide-y divide-zinc-200 text-left text-[11px]">
                          <thead className="bg-zinc-50 font-bold text-zinc-500 uppercase tracking-wider">
                            <tr>
                              <th className="px-3 py-2">Grade</th>
                              <th className="px-3 py-2">Net Fee</th>
                              {offeredPaymentOptions.includes("semiannually") && <th className="px-3 py-2">Semiannual (2x)</th>}
                              {offeredPaymentOptions.includes("quarterly") && <th className="px-3 py-2">Quarterly (4x)</th>}
                              {offeredPaymentOptions.includes("monthly") && <th className="px-3 py-2">Monthly (12x)</th>}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-200 text-zinc-750">
                            {gradeFees.map((gf) => {
                              const netAmount = Math.max(0, gf.fee + gf.extraCharge - Math.round((gf.discount / 100) * gf.fee));
                              return (
                                <tr key={gf.grade} className="hover:bg-zinc-50/20">
                                  <td className="px-3 py-2 font-bold text-zinc-900">{gf.grade}</td>
                                  <td className="px-3 py-2 font-semibold text-zinc-500">₹{netAmount.toLocaleString("en-IN")}</td>
                                  {offeredPaymentOptions.includes("semiannually") && (
                                    <td className="px-3 py-1.5">
                                      <div className="relative flex items-center max-w-[90px]">
                                        <span className="absolute left-1.5 text-zinc-400 font-bold text-[10px]">₹</span>
                                        <Input
                                          type="number"
                                          value={semiannualAmounts[gf.grade] || 0}
                                          onChange={(e) => setSemiannualAmounts({
                                            ...semiannualAmounts,
                                            [gf.grade]: Number(e.target.value) || 0
                                          })}
                                          className="pl-4 h-7 text-xs font-semibold"
                                        />
                                      </div>
                                    </td>
                                  )}
                                  {offeredPaymentOptions.includes("quarterly") && (
                                    <td className="px-3 py-1.5">
                                      <div className="relative flex items-center max-w-[90px]">
                                        <span className="absolute left-1.5 text-zinc-400 font-bold text-[10px]">₹</span>
                                        <Input
                                          type="number"
                                          value={quarterlyAmounts[gf.grade] || 0}
                                          onChange={(e) => setQuarterlyAmounts({
                                            ...quarterlyAmounts,
                                            [gf.grade]: Number(e.target.value) || 0
                                          })}
                                          className="pl-4 h-7 text-xs font-semibold"
                                        />
                                      </div>
                                    </td>
                                  )}
                                  {offeredPaymentOptions.includes("monthly") && (
                                    <td className="px-3 py-1.5">
                                      <div className="relative flex items-center max-w-[90px]">
                                        <span className="absolute left-1.5 text-zinc-400 font-bold text-[10px]">₹</span>
                                        <Input
                                          type="number"
                                          value={monthlyAmounts[gf.grade] || 0}
                                          onChange={(e) => setMonthlyAmounts({
                                            ...monthlyAmounts,
                                            [gf.grade]: Number(e.target.value) || 0
                                          })}
                                          className="pl-4 h-7 text-xs font-semibold"
                                        />
                                      </div>
                                    </td>
                                  )}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Custom Installments Settings */}
                  {offeredPaymentOptions.includes("installments") && (
                    <div className="p-4 rounded-xl border border-zinc-200 bg-[#fafafa] space-y-4 animate-fade-in">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-200">
                        <h5 className="font-semibold text-zinc-800 flex items-center gap-1.5 text-xs">
                          <Calendar className="w-4 h-4 text-[#1572FE]" /> Custom Installments Details
                        </h5>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-zinc-550 uppercase">Number of Installments:</span>
                          <input
                            type="number"
                            min="2"
                            max="6"
                            value={maxInstallments}
                            onChange={(e) => setMaxInstallments(Number(e.target.value) || 2)}
                            className="w-16 h-7 text-xs bg-white border border-zinc-200 rounded px-1.5 font-bold"
                          />
                        </div>
                      </div>

                      {/* Due Dates inputs */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Due Dates for each payment</span>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {Array.from({ length: maxInstallments }).map((_, idx) => (
                            <div key={idx} className="p-2 border border-zinc-200 bg-white rounded-lg space-y-1">
                              <span className="text-[9px] font-bold text-zinc-400 uppercase">Installment #{idx + 1} Due Date</span>
                              <Input
                                type="date"
                                value={customInstallmentDates[idx] || ""}
                                onChange={(e) => setCustomInstallmentDates(prev => prev.map((d, dIdx) => dIdx === idx ? e.target.value : d))}
                                className="h-7 text-xs"
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Grid for custom installment amounts per grade */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Installment Amounts per Grade Level (₹)</span>
                        <div className="overflow-x-auto border border-zinc-200 rounded-lg bg-white">
                          <table className="min-w-full divide-y divide-zinc-200 text-left text-[11px]">
                            <thead className="bg-zinc-50 font-bold text-zinc-500 uppercase tracking-wider">
                              <tr>
                                <th className="px-3 py-2">Grade</th>
                                <th className="px-3 py-2">Net Fee</th>
                                {Array.from({ length: maxInstallments }).map((_, idx) => (
                                  <th key={idx} className="px-3 py-2 text-center">Inst. #{idx + 1}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-200 text-zinc-750">
                              {gradeFees.map((gf) => {
                                const netAmount = Math.max(0, gf.fee + gf.extraCharge - Math.round((gf.discount / 100) * gf.fee));
                                const amts = customInstallmentAmounts[gf.grade] || Array(maxInstallments).fill(0);
                                return (
                                  <tr key={gf.grade} className="hover:bg-zinc-50/20">
                                    <td className="px-3 py-2 font-bold text-zinc-900">{gf.grade}</td>
                                    <td className="px-3 py-2 font-semibold text-zinc-500">₹{netAmount.toLocaleString("en-IN")}</td>
                                    {Array.from({ length: maxInstallments }).map((_, idx) => (
                                      <td key={idx} className="px-2 py-1.5 text-center">
                                        <div className="relative flex items-center max-w-[85px] mx-auto">
                                          <span className="absolute left-1.5 text-zinc-400 font-bold text-[9px]">₹</span>
                                          <Input
                                            type="number"
                                            value={amts[idx] || 0}
                                            onChange={(e) => {
                                              const updatedVal = Number(e.target.value) || 0;
                                              setCustomInstallmentAmounts({
                                                ...customInstallmentAmounts,
                                                [gf.grade]: amts.map((a, aIdx) => aIdx === idx ? updatedVal : a)
                                              });
                                            }}
                                            className="pl-3.5 h-7 text-xs text-center font-semibold"
                                          />
                                        </div>
                                      </td>
                                    ))}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Inline Mismatch Error Messages */}
                  {(() => {
                    const warnings = getFeeValidationErrors();
                    if (warnings.length === 0) return null;
                    return (
                      <div className="p-3 rounded-xl border border-amber-250 bg-amber-50 text-amber-850 space-y-1.5 animate-fade-in">
                        <h6 className="text-xs font-bold flex items-center gap-1.5 text-amber-900">
                          <AlertTriangle className="w-4 h-4 text-amber-700 animate-pulse" />
                          Onboarding Fee Balance Mismatch Warnings
                        </h6>
                        <ul className="list-disc list-inside text-[10px] space-y-1 pl-1 font-semibold leading-relaxed">
                          {warnings.map((w, idx) => (
                            <li key={idx}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    );
                  })()}
                </div>
              </CardContent>
              <CardFooter className="p-4 sm:p-6 border-t border-zinc-150 bg-zinc-50/50 flex flex-col sm:flex-row justify-between gap-3">
                <Button variant="outline" onClick={() => setStep(2)} className="gap-1.5 w-full sm:w-auto font-semibold">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </Button>
                <Button
                  onClick={() => {
                    const warnings = getFeeValidationErrors();
                    if (warnings.length > 0) {
                      setToast({
                        message: "Validation mismatch: check that payment cycles add up to the base tuition fee for each grade.",
                        type: "error"
                      });
                      return;
                    }
                    if (offeredPaymentOptions.includes("installments")) {
                      const hasEmptyDates = customInstallmentDates.some(d => !d);
                      if (hasEmptyDates) {
                        setToast({ message: "Please specify due dates for all installments.", type: "error" });
                        return;
                      }
                    }
                    // Let's set installmentsEnabled dynamically for backward-compatibility if installments is selected
                    setInstallmentsEnabled(offeredPaymentOptions.includes("installments"));
                    setStep(4);
                  }}
                  className="gap-1.5 bg-[#1572FE] hover:bg-[#0f62d4] text-white font-bold w-full sm:w-auto"
                >
                  Next: Add Teachers <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </CardFooter>
            </div>
          )}

          {/* ==================================================================
              STEP 4: ROBUST STUDENT PROCESSING TERMINAL
              ================================================================== */}
          {step === 4 && (
            <div>
              <CardHeader className="p-4 sm:p-6 border-b border-zinc-150">
                <CardTitle className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-zinc-500">
                  Step 4: Register Faculty Roster
                </CardTitle>
                <CardDescription className="text-xs">
                  Register teachers, enter monthly salaries, and assign which teacher teaches which subject to which classroom divisions.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-6">
                
                {/* 4.1 AI Ingestion Panel */}
                <div className="space-y-4 border border-[#fed7aa] bg-[#fff8f5] rounded-2xl p-4 sm:p-6 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-orange-655 animate-pulse" />
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-zinc-900">Spreadsheet Ingestion Wizard</h4>
                      <p className="text-[11px] text-zinc-500">
                        Messy data? Drop your staff list roster file below. The system automatically reads names and assignments.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`border-2 border-dashed rounded-xl p-4 text-center flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                        isDragging ? "border-[#1572FE] bg-[#e6f0ff]" : "border-[#fed7aa]/60 bg-white"
                      }`}
                    >
                      <input
                        type="file"
                        id="teacher-file-upload"
                        className="hidden"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileChange}
                      />
                      <label htmlFor="teacher-file-upload" className="w-full h-full flex flex-col items-center justify-center cursor-pointer gap-1">
                        <Upload className="w-5 h-5 text-orange-655 mx-auto" />
                        <span className="text-[11px] font-bold text-zinc-900 block mt-1">
                          Upload Faculty Spreadsheet
                        </span>
                        <span className="text-[9px] text-zinc-400 block">
                          Supports Excel (.xlsx, .xls) and CSV
                        </span>
                      </label>
                      <div className="flex gap-2 justify-center mt-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 border-orange-200 text-orange-755 hover:bg-orange-50 bg-white text-[10px] font-bold"
                          onClick={(e) => {
                            e.stopPropagation();
                            document.getElementById("teacher-file-upload")?.click();
                          }}
                        >
                          Choose File
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 border-zinc-200 text-[#1572FE] hover:bg-zinc-50 bg-white text-[10px] font-bold gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadTeacherTemplate();
                          }}
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" /> Template
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2 flex flex-col">
                      <textarea
                        rows={3}
                        id="teacher-pasted-text"
                        placeholder="Or paste teacher rows here...&#10;e.g. Susan Smith, Maths, Grade 10-A&#10;John Doe, Physics, Grade 11-B"
                        className="w-full text-xs font-mono p-2.5 border border-zinc-200 rounded-xl focus:border-[#1572FE] bg-white outline-none flex-1 resize-none"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          const val = (document.getElementById("teacher-pasted-text") as HTMLTextAreaElement)?.value || "";
                          processRosterPastedText(val, "teachers");
                        }}
                        className="w-full h-8 text-[11px] border-orange-200 text-orange-755 hover:bg-orange-50 bg-white font-bold"
                      >
                        Scan Pasted Text
                      </Button>
                    </div>
                  </div>

                  {scanStatus !== "idle" && reviewMode === "teachers" && (
                    <div className="p-4 rounded-xl border border-zinc-200 bg-white shadow-xs flex items-center justify-between gap-4 animate-fade-in">
                      <div className="flex items-center gap-3">
                        {scanStatus === "scanning" || scanStatus === "reading" ? (
                          <Loader2 className="w-5 h-5 animate-spin text-[#1572FE]" />
                        ) : scanStatus === "error" ? (
                          <AlertTriangle className="w-5 h-5 text-red-500" />
                        ) : (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        )}
                        <div>
                          <p className="text-xs font-bold text-zinc-800">
                            {scanStatus === "scanning" || scanStatus === "reading" 
                              ? "Analyzing teacher data..." 
                              : scanStatus === "error" 
                                ? "Scan failed" 
                                : "Scanning completed successfully!"}
                          </p>
                          <p className="text-[10px] text-zinc-500">
                            {scanStatus === "scanning" || scanStatus === "reading"
                              ? "Organizing schedules and credentials..."
                              : scanStatus === "error"
                                ? "Check file columns and format."
                                : `${teachers.length} teacher records processed and loaded.`}
                          </p>
                        </div>
                      </div>
                      {(scanStatus === "scanning" || scanStatus === "reading") && (
                        <span className="text-xs font-bold text-zinc-400">{scanProgress}%</span>
                      )}
                    </div>
                  )}
                </div>

                {/* 4.2 Quick Add Teacher Form */}
                <div className="flex flex-col sm:flex-row gap-3 items-end border border-zinc-200 rounded-2xl p-4 bg-zinc-50/20">
                  <div className="flex-1 w-full space-y-1.5">
                    <label className="text-xs font-bold text-zinc-800">Teacher Full Name</label>
                    <Input
                      value={newTeacherName}
                      onChange={(e) => setNewTeacherName(e.target.value)}
                      placeholder="e.g. Mrs. Susan Smith"
                    />
                  </div>
                  <div className="w-full sm:w-1/4 space-y-1.5">
                    <label className="text-xs font-bold text-zinc-800">Designation / Role</label>
                    <Input
                      value={newTeacherDesignation}
                      onChange={(e) => setNewTeacherDesignation(e.target.value)}
                      placeholder="e.g. Math Teacher"
                    />
                  </div>
                  <div className="w-full sm:w-1/4 space-y-1.5">
                    <label className="text-xs font-bold text-zinc-800">Monthly Salary (₹)</label>
                    <Input
                      type="number"
                      value={newTeacherSalary}
                      onChange={(e) => setNewTeacherSalary(e.target.value)}
                      placeholder="30000"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={handleAddTeacher}
                    className="bg-[#1572FE] hover:bg-[#0f62d4] text-white font-bold h-10 px-5 flex items-center gap-1.5 w-full sm:w-auto cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Add Teacher
                  </Button>
                </div>

                {/* 4.3 Interactive Teachers Roster Grid */}
                <div className="space-y-4">
                  {teachers.length === 0 ? (
                    <div className="text-center p-8 text-zinc-400 text-xs font-medium border border-zinc-200 rounded-xl bg-white">
                      No teachers onboarded yet. Add manually above or upload a roster spreadsheet.
                    </div>
                  ) : (
                    teachers.map((teacher) => {
                      return (
                        <Card key={teacher.id} className="border border-zinc-200 shadow-xs rounded-xl overflow-hidden bg-white">
                          <CardHeader className="p-3 bg-zinc-50/40 border-b border-zinc-150 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div className="flex-1 w-full">
                              <input
                                type="text"
                                value={teacher.name}
                                onChange={(e) => handleUpdateTeacherName(teacher.id, e.target.value)}
                                className="font-bold text-zinc-900 border-b border-dashed border-transparent hover:border-zinc-350 focus:border-[#1572FE] focus:outline-none text-xs bg-transparent w-full max-w-[250px]"
                              />
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-xs">
                              <div className="flex items-center gap-1.5">
                                <span className="text-zinc-400 font-medium text-[10px] uppercase">Designation:</span>
                                <input
                                  type="text"
                                  value={teacher.designation || "Teacher"}
                                  onChange={(e) => {
                                    setTeachers(teachers.map(t => t.id === teacher.id ? { ...t, designation: e.target.value } : t));
                                  }}
                                  className="font-bold text-zinc-700 border-b border-dashed border-transparent hover:border-zinc-350 focus:border-[#1572FE] focus:outline-none text-xs bg-transparent max-w-[120px]"
                                />
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-zinc-400 font-medium text-[10px] uppercase">Monthly Salary:</span>
                                <div className="flex items-center">
                                  <span className="text-zinc-400 mr-0.5 font-bold">₹</span>
                                  <input
                                    type="number"
                                    value={teacher.salary === 0 ? "" : teacher.salary}
                                    onChange={(e) => {
                                      setTeachers(teachers.map(t => t.id === teacher.id ? { ...t, salary: Number(e.target.value) || 0 } : t));
                                    }}
                                    className="font-bold text-zinc-700 border-b border-dashed border-transparent hover:border-zinc-350 focus:border-[#1572FE] focus:outline-none text-xs bg-transparent max-w-[80px]"
                                  />
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveTeacher(teacher.id)}
                                className="text-red-650 hover:text-red-800 text-[10px] font-bold uppercase flex items-center gap-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Remove
                              </button>
                            </div>
                          </CardHeader>
                          <CardContent className="p-3 space-y-3">
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Assigned Classes & Subjects</span>
                                <button
                                  type="button"
                                  onClick={() => handleAddAllocation(teacher.id)}
                                  className="text-[10px] text-[#1572FE] hover:text-[#0f62d4] font-bold uppercase flex items-center gap-1 cursor-pointer"
                                >
                                  <Plus className="w-3 h-3" /> Assign New Subject
                                </button>
                              </div>

                              {teacher.allocations.length === 0 ? (
                                <span className="text-[10px] text-zinc-400 italic block">No subjects assigned yet. Click "Assign New Subject" above.</span>
                              ) : (
                                <div className="space-y-2.5">
                                  {teacher.allocations.map((alloc, aIdx) => {
                                    // Compile unique subjects configured in Step 2 to populate select options
                                    const allSubjectsInSchool = Array.from(
                                      new Set(Object.values(gradeSubjects).flat())
                                    );

                                    return (
                                      <div key={aIdx} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center border border-zinc-150 rounded-lg p-3 bg-zinc-50/40 relative">
                                        
                                        {/* Dropdown for subject */}
                                        <div className="w-full sm:w-1/3 space-y-1">
                                          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Subject</span>
                                          <select
                                            value={alloc.subjectName}
                                            onChange={(e) => handleUpdateSubjectName(teacher.id, aIdx, e.target.value)}
                                            className="w-full h-8 text-xs bg-white border border-zinc-200 rounded px-2 font-semibold text-zinc-800"
                                          >
                                            <option value="">-- Choose Subject --</option>
                                            {allSubjectsInSchool.map(subName => (
                                              <option key={subName} value={subName}>{subName}</option>
                                            ))}
                                          </select>
                                        </div>

                                        {/* Target classrooms checklist for this subject */}
                                        <div className="flex-1 w-full space-y-1">
                                          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Target Classes Division</span>
                                          <div className="flex flex-wrap gap-1.5">
                                            {preparedClasses.length === 0 ? (
                                              <span className="text-[10px] text-zinc-400 italic">No active divisions</span>
                                            ) : (
                                              preparedClasses.map((cls) => {
                                                // Check if this grade offers the chosen subject in Step 2
                                                const gradeOffersSubject = (gradeSubjects[cls.gradeKey] || []).includes(alloc.subjectName);
                                                if (!gradeOffersSubject && alloc.subjectName !== "") {
                                                  return null; // hide classes that do not offer this subject
                                                }

                                                const classKey = `${cls.gradeKey}-${cls.section}`;
                                                const isAllocated = alloc.classes.includes(classKey);
                                                return (
                                                  <button
                                                    key={classKey}
                                                    type="button"
                                                    onClick={() => handleToggleAllocationClass(teacher.id, aIdx, classKey)}
                                                    className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                                                      isAllocated
                                                        ? "bg-[#e6f0ff] text-[#1572FE] border-[#1572FE] shadow-xs"
                                                        : "bg-white text-zinc-400 border-zinc-200 hover:bg-zinc-50"
                                                    }`}
                                                  >
                                                    {cls.gradeKey.replace("Grade ", "")}-{cls.section}
                                                  </button>
                                                );
                                              })
                                            )}
                                          </div>
                                        </div>

                                        <button
                                          type="button"
                                          onClick={() => handleRemoveAllocation(teacher.id, aIdx)}
                                          className="text-zinc-400 hover:text-red-655 p-1.5 transition-colors self-end sm:self-center cursor-pointer"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </CardContent>
              <CardFooter className="p-4 sm:p-6 border-t border-zinc-150 bg-zinc-50/50 flex flex-col sm:flex-row justify-between gap-3">
                <Button variant="outline" onClick={() => setStep(3)} className="gap-1.5 w-full sm:w-auto font-semibold">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </Button>
                <Button
                  onClick={() => {
                    setError("");
                    setStep(5);
                  }}
                  className="gap-1.5 bg-[#1572FE] hover:bg-[#0f62d4] text-white font-bold w-full sm:w-auto"
                >
                  Next: Add Students <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </CardFooter>
            </div>
          )}

          {/* ==================================================================
              STEP 5: STUDENT ENROLLMENT
              ================================================================== */}
          {step === 5 && (
            <div>
              <CardHeader className="p-4 sm:p-6 border-b border-zinc-150">
                <CardTitle className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-zinc-500">
                  Step 5: Student Enrollment
                </CardTitle>
                <CardDescription className="text-xs">
                  Upload your student list or add students manually. You can fill in full student details directly in the roster list.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-6">
                
                {/* Spreadsheet Upload & Pasting Section */}
                <div className="space-y-4 border border-[#e6f0ff] bg-[#f0f7ff] rounded-2xl p-4 sm:p-6 shadow-sm">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-blue-800 animate-pulse" />
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-zinc-900">Student Roster Ingestion</h4>
                        <p className="text-[11px] text-zinc-500">
                          Upload your messy student list spreadsheet to automatically match and enroll them.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`border-2 border-dashed rounded-xl p-4 text-center flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                        isDragging ? "border-[#1572FE] bg-[#e6f0ff]" : "border-[#1572FE]/30 bg-white"
                      }`}
                    >
                      <input
                        type="file"
                        id="student-file-upload"
                        className="hidden"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileChange}
                      />
                      <label htmlFor="student-file-upload" className="w-full h-full flex flex-col items-center justify-center cursor-pointer gap-1">
                        <Upload className="w-5 h-5 text-[#1572FE] mx-auto" />
                        <span className="text-[11px] font-bold text-zinc-900 block mt-1">
                          Upload Student Spreadsheet
                        </span>
                        <span className="text-[9px] text-zinc-400 block">
                          Supports Excel (.xlsx, .xls) and CSV
                        </span>
                      </label>
                      <div className="flex gap-2 justify-center mt-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 border-[#1572FE]/40 text-[#1572FE] hover:bg-blue-50 bg-white text-[10px] font-bold"
                          onClick={(e) => {
                            e.stopPropagation();
                            document.getElementById("student-file-upload")?.click();
                          }}
                        >
                          Choose File
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 border-zinc-200 text-[#1572FE] hover:bg-zinc-50 bg-white text-[10px] font-bold gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadStudentTemplate();
                          }}
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" /> Template
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2 flex flex-col">
                      <textarea
                        rows={3}
                        id="student-pasted-text"
                        placeholder="Or paste student rows here...&#10;e.g. Aarav Sharma, 1, Grade 1-A, Rajesh Sharma, 9876543210&#10;Diya Patel, 2, Grade 1-A, Meera Patel, 9876543211"
                        className="w-full text-xs font-mono p-2.5 border border-zinc-200 rounded-xl focus:border-[#1572FE] bg-white outline-none flex-1 resize-none"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          const val = (document.getElementById("student-pasted-text") as HTMLTextAreaElement)?.value || "";
                          processRosterPastedText(val, "students");
                        }}
                        className="w-full h-8 text-[11px] border-[#1572FE]/30 text-[#1572FE] hover:bg-blue-50 bg-white font-bold"
                      >
                        Scan Pasted Text
                      </Button>
                    </div>
                  </div>

                  {scanStatus !== "idle" && reviewMode === "students" && (
                    <div className="p-4 rounded-xl border border-zinc-200 bg-white shadow-xs flex items-center justify-between gap-4 animate-fade-in">
                      <div className="flex items-center gap-3">
                        {scanStatus === "scanning" || scanStatus === "reading" ? (
                          <Loader2 className="w-5 h-5 animate-spin text-[#1572FE]" />
                        ) : scanStatus === "error" ? (
                          <AlertTriangle className="w-5 h-5 text-red-500" />
                        ) : (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        )}
                        <div>
                          <p className="text-xs font-bold text-zinc-800">
                            {scanStatus === "scanning" || scanStatus === "reading" 
                              ? "Analyzing student data..." 
                              : scanStatus === "error" 
                                ? "Scan failed" 
                                : "Scanning completed successfully!"}
                          </p>
                          <p className="text-[10px] text-zinc-550">
                            {scanStatus === "scanning" || scanStatus === "reading"
                              ? "Processing demographics and parent contacts..."
                              : scanStatus === "error"
                                ? "Check file columns and format."
                                : `${parsedStudents.length} student records processed and loaded.`}
                          </p>
                        </div>
                      </div>
                      {(scanStatus === "scanning" || scanStatus === "reading") && (
                        <span className="text-xs font-bold text-zinc-400">{scanProgress}%</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Quick Manual Add Form */}
                <div className="border border-zinc-200 rounded-2xl p-4 bg-zinc-50/20 space-y-3">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide block">Add Student Manually</span>
                  <div className="flex flex-col sm:flex-row gap-3 items-end">
                    <div className="flex-1 w-full space-y-1.5">
                      <label className="text-xs font-bold text-zinc-800">Student Name</label>
                      <Input
                        value={newStudentName}
                        onChange={(e) => setNewStudentName(e.target.value)}
                        placeholder="e.g. Aarav Sharma"
                      />
                    </div>
                    <div className="w-full sm:w-1/4 space-y-1.5">
                      <label className="text-xs font-bold text-zinc-800">Grade</label>
                      <select
                        value={newStudentGrade || (preparedClasses[0]?.gradeKey || "")}
                        onChange={(e) => setNewStudentGrade(e.target.value)}
                        className="w-full h-10 text-xs bg-white border border-zinc-200 rounded px-2 font-semibold text-zinc-800"
                      >
                        {Array.from(new Set(preparedClasses.map(c => c.gradeKey))).map(gradeKey => (
                          <option key={gradeKey} value={gradeKey}>{gradeKey}</option>
                        ))}
                      </select>
                    </div>
                    <div className="w-full sm:w-1/4 space-y-1.5">
                      <label className="text-xs font-bold text-zinc-800">Section</label>
                      <select
                        value={newStudentSection || (preparedClasses[0]?.section || "")}
                        onChange={(e) => setNewStudentSection(e.target.value)}
                        className="w-full h-10 text-xs bg-white border border-zinc-200 rounded px-2 font-semibold text-zinc-800"
                      >
                        {preparedClasses
                          .filter(c => c.gradeKey === (newStudentGrade || preparedClasses[0]?.gradeKey))
                          .map(c => (
                            <option key={c.section} value={c.section}>Section {c.section}</option>
                          ))}
                      </select>
                    </div>
                    <Button
                      type="button"
                      onClick={handleAddStudent}
                      className="bg-[#1572FE] hover:bg-[#0f62d4] text-white font-bold h-10 px-5 flex items-center gap-1.5 w-full sm:w-auto cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> Add Student
                    </Button>
                  </div>
                </div>

                {/* Stats Summary & Alert */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 border border-zinc-200 rounded-xl bg-white text-xs">
                  <div className="flex flex-wrap gap-4 font-semibold text-zinc-700">
                    <div>Total Students: <span className="text-zinc-900 font-bold">{parsedStudents.length}</span></div>
                    <div className="text-green-600">✓ Complete Profiles: <span className="font-bold">{parsedStudents.filter(s => s.status === "complete").length}</span></div>
                    <div className="text-amber-600">⚠️ Needs Attention: <span className="font-bold">{parsedStudents.filter(s => s.status === "incomplete").length}</span></div>
                  </div>
                  {parsedStudents.some(s => s.status === "incomplete") && (
                    <div className="text-[10px] text-amber-600 font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 animate-bounce" /> Click cards with warnings to enter missing parent or roll details inline!
                    </div>
                  )}
                </div>

                {/* Interactive Roster list with inline expansion forms */}
                <div className="space-y-3">
                  {parsedStudents.length === 0 ? (
                    <div className="text-center p-8 text-zinc-400 text-xs font-medium border border-zinc-200 rounded-xl bg-white">
                      No students onboarded yet. Paste text, upload a spreadsheet, or add manually.
                    </div>
                  ) : (
                    (() => {
                      const pageSize = 10;
                      const startIndex = (studentCurrentPage - 1) * pageSize;
                      const visibleStudents = parsedStudents.slice(startIndex, startIndex + pageSize);

                      return visibleStudents.map((s, localIdx) => {
                        const globalIdx = startIndex + localIdx;
                        const isExpanded = expandedStudentIndex === globalIdx;
                        const isComplete = s.status === "complete";

                        return (
                          <div
                            key={globalIdx}
                            className={`border rounded-xl transition-all overflow-hidden bg-white ${
                              isExpanded 
                                ? "border-[#1572FE] ring-1 ring-[#1572FE]/20" 
                                : isComplete 
                                  ? "border-zinc-200 hover:border-zinc-300" 
                                  : "border-amber-200 hover:border-amber-300 bg-amber-50/10"
                            }`}
                          >
                            {/* Card Header Summary */}
                            <div 
                              onClick={() => setExpandedStudentIndex(isExpanded ? null : globalIdx)}
                              className="p-3.5 flex items-center justify-between gap-3 cursor-pointer select-none"
                            >
                              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500">
                                  #{s.rollNumber || "No Roll"}
                                </span>
                                <div className="min-w-0">
                                  <span className="font-bold text-zinc-800 block text-xs truncate">
                                    {s.name || "Unnamed Student"}
                                  </span>
                                  <span className="text-[10px] font-bold text-zinc-450 block uppercase">
                                    {s.gradeLevel} • Section {s.section}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 shrink-0">
                                {/* Status badge */}
                                {isComplete ? (
                                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-bold text-[10px]">
                                    ✓ Complete
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold text-[10px]">
                                    ⚠️ Missing Details
                                  </span>
                                )}

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveStudent(globalIdx);
                                  }}
                                  className="p-1 hover:bg-red-50 text-zinc-400 hover:text-red-655 rounded transition-colors"
                                >
                                  <Trash className="w-4 h-4" />
                                </button>
                                <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                              </div>
                            </div>

                            {/* Accordion Content Detailed Editor */}
                            {isExpanded && (
                              <div className="p-4 border-t border-zinc-150 bg-zinc-50/20 space-y-4 animate-fade-in">
                                
                                {/* Warning messages for incomplete fields */}
                                {s.missing_fields && s.missing_fields.length > 0 && (
                                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] font-semibold space-y-1">
                                    <div className="font-bold flex items-center gap-1">
                                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Missing Required Fields:
                                    </div>
                                    <ul className="list-disc pl-4 grid grid-cols-2 gap-x-4">
                                      {s.missing_fields.map((f: string) => {
                                        let label = f.replace("_", " ");
                                        if (f === "parent_name") label = "Parent Name";
                                        if (f === "parent_phone") label = "Parent Phone Number";
                                        if (f === "student_name") label = "Student Name";
                                        return <li key={f} className="capitalize text-[10px]">{label}</li>;
                                      })}
                                    </ul>
                                  </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  {/* Demographics Group */}
                                  <div className="space-y-3 bg-white p-3.5 rounded-xl border border-zinc-150">
                                    <h5 className="font-bold text-zinc-800 border-b border-zinc-150 pb-1.5 flex items-center gap-1.5 text-xs">
                                      <GraduationCap className="w-4 h-4 text-[#1572FE]" /> General Info
                                    </h5>
                                    
                                    <div className="space-y-2">
                                      <div className="space-y-1">
                                        <span className="text-[10px] font-bold text-zinc-500">Student Name</span>
                                        <Input
                                          value={s.name || ""}
                                          onChange={(e) => handleUpdateStudentField(globalIdx, "name", e.target.value)}
                                          className="h-8 text-xs font-semibold"
                                        />
                                      </div>
                                      
                                      <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                          <span className="text-[10px] font-bold text-zinc-500">Roll Number</span>
                                          <Input
                                            type="number"
                                            value={s.rollNumber || ""}
                                            onChange={(e) => handleUpdateStudentField(globalIdx, "rollNumber", e.target.value)}
                                            className="h-8 text-xs font-semibold"
                                            placeholder="Assign"
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <span className="text-[10px] font-bold text-zinc-500">Gender</span>
                                          <select
                                            value={s.gender || ""}
                                            onChange={(e) => handleUpdateStudentField(globalIdx, "gender", e.target.value)}
                                            className="w-full h-8 text-xs bg-white border border-zinc-200 rounded px-2 font-semibold text-zinc-800"
                                          >
                                            <option value="">Choose</option>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Other">Other</option>
                                          </select>
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                          <span className="text-[10px] font-bold text-zinc-500">Date of Birth</span>
                                          <Input
                                            type="date"
                                            value={s.birth_date || ""}
                                            onChange={(e) => handleUpdateStudentField(globalIdx, "birth_date", e.target.value)}
                                            className="h-8 text-xs"
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <span className="text-[10px] font-bold text-zinc-500">Blood Group</span>
                                          <Input
                                            value={s.bloodgroup || ""}
                                            onChange={(e) => handleUpdateStudentField(globalIdx, "bloodgroup", e.target.value)}
                                            placeholder="e.g. O+"
                                            className="h-8 text-xs font-semibold"
                                          />
                                        </div>
                                      </div>

                                      <div className="space-y-1">
                                        <span className="text-[10px] font-bold text-zinc-500">Aadhar / UID Number</span>
                                        <Input
                                          value={s.aadhar_number || ""}
                                          onChange={(e) => handleUpdateStudentField(globalIdx, "aadhar_number", e.target.value)}
                                          placeholder="12-digit number"
                                          className="h-8 text-xs font-mono font-semibold"
                                        />
                                      </div>

                                      <div className="flex items-center gap-1.5 pt-1">
                                        <input
                                          type="checkbox"
                                          id={`handicap-setup-${globalIdx}`}
                                          checked={s.handicap || false}
                                          onChange={(e) => handleUpdateStudentField(globalIdx, "handicap", e.target.checked)}
                                          className="rounded text-[#1572FE] focus:ring-[#1572FE] h-3.5 w-3.5 border-zinc-300 cursor-pointer"
                                        />
                                        <label htmlFor={`handicap-setup-${globalIdx}`} className="text-zinc-700 text-[11px] font-bold cursor-pointer">
                                          Physically Challenged (Divyang)
                                        </label>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Parent Group */}
                                  <div className="space-y-3 bg-white p-3.5 rounded-xl border border-zinc-150">
                                    <h5 className="font-bold text-zinc-800 border-b border-zinc-150 pb-1.5 flex items-center gap-1.5 text-xs">
                                      <Users className="w-4 h-4 text-orange-655" /> Parent & Guardian Info
                                    </h5>
                                    
                                    <div className="space-y-2">
                                      <div className="space-y-1">
                                        <span className="text-[10px] font-bold text-zinc-850">Primary Parent/Guardian Name*</span>
                                        <Input
                                          value={s.parentName || ""}
                                          onChange={(e) => handleUpdateStudentField(globalIdx, "parentName", e.target.value)}
                                          placeholder="Father, Mother or Guardian"
                                          className="h-8 text-xs font-semibold border-amber-200"
                                        />
                                      </div>

                                      <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                          <span className="text-[10px] font-bold text-zinc-850">Parent Phone*</span>
                                          <Input
                                            value={s.parentPhone || ""}
                                            onChange={(e) => handleUpdateStudentField(globalIdx, "parentPhone", e.target.value)}
                                            placeholder="10-digit Mobile"
                                            className="h-8 text-xs font-semibold border-amber-200"
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <span className="text-[10px] font-bold text-zinc-500">Parent Email</span>
                                          <Input
                                            value={s.parentEmail || ""}
                                            onChange={(e) => handleUpdateStudentField(globalIdx, "parentEmail", e.target.value)}
                                            className="h-8 text-xs font-mono"
                                          />
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                          <span className="text-[10px] font-bold text-zinc-500">Father's Name</span>
                                          <Input
                                            value={s.father_name || ""}
                                            onChange={(e) => handleUpdateStudentField(globalIdx, "father_name", e.target.value)}
                                            className="h-8 text-xs font-semibold"
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <span className="text-[10px] font-bold text-zinc-500">Mother's Name</span>
                                          <Input
                                            value={s.mother_name || ""}
                                            onChange={(e) => handleUpdateStudentField(globalIdx, "mother_name", e.target.value)}
                                            className="h-8 text-xs font-semibold"
                                          />
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                          <span className="text-[10px] font-bold text-zinc-500">Mother Tongue</span>
                                          <Input
                                            value={s.mother_tongue || ""}
                                            onChange={(e) => handleUpdateStudentField(globalIdx, "mother_tongue", e.target.value)}
                                            placeholder="e.g. Hindi"
                                            className="h-8 text-xs font-semibold"
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <span className="text-[10px] font-bold text-zinc-500">Religion</span>
                                          <Input
                                            value={s.religion || ""}
                                            onChange={(e) => handleUpdateStudentField(globalIdx, "religion", e.target.value)}
                                            placeholder="e.g. Hinduism"
                                            className="h-8 text-xs font-semibold"
                                          />
                                        </div>
                                      </div>

                                      <div className="flex gap-4 pt-1 flex-wrap">
                                        <div className="flex items-center gap-1.5">
                                          <input
                                            type="checkbox"
                                            id={`singleparent-${globalIdx}`}
                                            checked={s.single_parent || false}
                                            onChange={(e) => handleUpdateStudentField(globalIdx, "single_parent", e.target.checked)}
                                            className="rounded text-[#1572FE] h-3.5 w-3.5 border-zinc-300 cursor-pointer"
                                          />
                                          <label htmlFor={`singleparent-${globalIdx}`} className="text-zinc-700 text-[10px] font-bold cursor-pointer">
                                            Single Parent
                                          </label>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                          <input
                                            type="checkbox"
                                            id={`orphan-${globalIdx}`}
                                            checked={s.orphan || false}
                                            onChange={(e) => handleUpdateStudentField(globalIdx, "orphan", e.target.checked)}
                                            className="rounded text-[#1572FE] h-3.5 w-3.5 border-zinc-300 cursor-pointer"
                                          />
                                          <label htmlFor={`orphan-${globalIdx}`} className="text-zinc-700 text-[10px] font-bold cursor-pointer">
                                            Orphan / Destitute
                                          </label>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Address & Academic History Group */}
                                  <div className="space-y-3 bg-white p-3.5 rounded-xl border border-zinc-150">
                                    <h5 className="font-bold text-zinc-800 border-b border-zinc-150 pb-1.5 flex items-center gap-1.5 text-xs">
                                      <Landmark className="w-4 h-4 text-emerald-650" /> Address & Admissions
                                    </h5>
                                    
                                    <div className="space-y-2">
                                      <div className="space-y-1">
                                        <span className="text-[10px] font-bold text-zinc-500">Residential Address</span>
                                        <textarea
                                          rows={1.5}
                                          value={s.address || ""}
                                          onChange={(e) => handleUpdateStudentField(globalIdx, "address", e.target.value)}
                                          placeholder="Full Address"
                                          className="w-full text-xs p-1.5 border border-zinc-200 rounded-lg outline-none focus:border-[#1572FE] resize-none"
                                        />
                                      </div>

                                      <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                          <span className="text-[10px] font-bold text-zinc-500">Colony / Locality</span>
                                          <Input
                                            value={s.colony || ""}
                                            onChange={(e) => handleUpdateStudentField(globalIdx, "colony", e.target.value)}
                                            className="h-8 text-xs font-semibold"
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <span className="text-[10px] font-bold text-zinc-500">Distance (km)</span>
                                          <Input
                                            type="text"
                                            value={s.distance || ""}
                                            onChange={(e) => handleUpdateStudentField(globalIdx, "distance", e.target.value)}
                                            placeholder="e.g. 2.5"
                                            className="h-8 text-xs font-semibold"
                                          />
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                          <span className="text-[10px] font-bold text-zinc-500">Register Number</span>
                                          <Input
                                            value={s.register_no || ""}
                                            onChange={(e) => handleUpdateStudentField(globalIdx, "register_no", e.target.value)}
                                            placeholder="Admission ID"
                                            className="h-8 text-xs font-semibold"
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <span className="text-[10px] font-bold text-zinc-500">Admission Date</span>
                                          <Input
                                            type="date"
                                            value={s.admission_date || ""}
                                            onChange={(e) => handleUpdateStudentField(globalIdx, "admission_date", e.target.value)}
                                            className="h-8 text-xs font-semibold"
                                          />
                                        </div>
                                      </div>

                                      <div className="space-y-1">
                                        <span className="text-[10px] font-bold text-zinc-500">Previous School Attended</span>
                                        <Input
                                          value={s.last_school_attended || ""}
                                          onChange={(e) => handleUpdateStudentField(globalIdx, "last_school_attended", e.target.value)}
                                          placeholder="School Name"
                                          className="h-8 text-xs font-semibold"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex justify-end pt-1">
                                  <Button
                                    type="button"
                                    onClick={() => setExpandedStudentIndex(null)}
                                    className="bg-zinc-800 hover:bg-zinc-900 text-white font-bold h-8 text-xs px-4 rounded-lg cursor-pointer"
                                  >
                                    Save details
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()
                  )}
                </div>

                {/* Pagination */}
                {parsedStudents.length > 10 && (
                  <div className="flex items-center justify-between border-t border-zinc-150 pt-3 px-1">
                    <span className="text-[10px] sm:text-xs text-zinc-555 font-semibold">
                      Showing Page {studentCurrentPage} of {Math.ceil(parsedStudents.length / 10)} ({parsedStudents.length} entries)
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={studentCurrentPage === 1}
                        onClick={() => {
                          setStudentCurrentPage(prev => Math.max(1, prev - 1));
                          setExpandedStudentIndex(null);
                        }}
                        className="h-8 text-[11px] font-bold"
                      >
                        Previous
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={studentCurrentPage >= Math.ceil(parsedStudents.length / 10)}
                        onClick={() => {
                          setStudentCurrentPage(prev => Math.min(Math.ceil(parsedStudents.length / 10), prev + 1));
                          setExpandedStudentIndex(null);
                        }}
                        className="h-8 text-[11px] font-bold"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="p-4 sm:p-6 border-t border-zinc-150 bg-zinc-50/50 flex flex-col sm:flex-row justify-between gap-3">
                <Button variant="outline" onClick={() => setStep(4)} className="gap-1.5 w-full sm:w-auto font-semibold">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </Button>
                <Button
                  onClick={() => {
                    setError("");
                    setStep(6);
                  }}
                  className="gap-1.5 bg-[#1572FE] hover:bg-[#0f62d4] text-white font-bold w-full sm:w-auto"
                >
                  Next: Summary & Launch <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </CardFooter>
            </div>
          )}

          {/* ==================================================================
              STEP 6: SUMMARY & BUDGET PROJECTIONS LAUNCH
              ================================================================== */}
          {step === 6 && (
            <div>
              <CardHeader className="p-4 sm:p-6 border-b border-zinc-150">
                <CardTitle className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-zinc-500">
                  Step 6: Summary & Launch Review
                </CardTitle>
                <CardDescription className="text-xs">
                  Review school setup statistics, expected financial projections, and launch your tenant portal.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-6">
                
                {/* 6.1 Academic Structure Statistics */}
                <div className="space-y-3">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">School Profile Snapshot</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-zinc-50 p-4 border border-zinc-200 rounded-2xl">
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-zinc-400 font-semibold block uppercase">School Name</span>
                      <span className="text-xs font-bold text-zinc-800 block">{schoolName}</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-zinc-400 font-semibold block uppercase">Session</span>
                      <span className="text-xs font-bold text-zinc-800 block">{academicYear}</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-zinc-400 font-semibold block uppercase">Grading Scale</span>
                      <span className="text-xs font-bold text-zinc-800 block capitalize">{gradingScale} scale</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-zinc-400 font-semibold block uppercase">Billing Cycle</span>
                      <span className="text-xs font-bold text-[#1572FE] block uppercase">
                        {installmentsEnabled ? `Installments (${maxInstallments}x)` : `${feeFrequency} billing`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 6.2 Counts Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-zinc-150 pt-4">
                  <div className="bg-white border border-zinc-200 rounded-xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-[#1572FE]">
                      <GraduationCap className="w-5 h-5 text-blue-800" />
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide block">Classrooms</span>
                      <span className="text-md font-bold text-zinc-850 block">{preparedClasses.length} Divisions</span>
                    </div>
                  </div>

                  <div className="bg-white border border-zinc-200 rounded-xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-655">
                      <Users className="w-5 h-5 text-orange-755" />
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide block">Teachers</span>
                      <span className="text-md font-bold text-zinc-850 block">{teachers.length} Members</span>
                    </div>
                  </div>

                  <div className="bg-white border border-zinc-200 rounded-xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-650">
                      <UserCheck className="w-5 h-5 text-emerald-750" />
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide block">Students</span>
                      <span className="text-md font-bold text-zinc-850 block">{parsedStudents.length} Enrolled</span>
                    </div>
                  </div>
                </div>

                {/* 6.3 Projections / Financial Summary */}
                <div className="space-y-4 border-t border-zinc-150 pt-4">
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Estimated Annual Projections</span>
                    <p className="text-[11px] text-zinc-550">
                      Projections are calculated based on registered tuition fees per student and teaching staff payroll.
                    </p>
                  </div>

                  {(() => {
                    const totalExpectedFees = parsedStudents.reduce((sum, s) => sum + (s.baseFee || 0), 0);
                    const totalMonthlyPayroll = teachers.reduce((sum, t) => sum + (t.salary || 0), 0);
                    const totalAnnualPayroll = totalMonthlyPayroll * 12;
                    const surplus = totalExpectedFees - totalAnnualPayroll;

                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="p-4 bg-emerald-50/40 border border-emerald-200 rounded-2xl flex flex-col justify-between gap-2">
                          <div>
                            <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-widest block">Expected Tuition Revenue</span>
                            <span className="text-lg font-bold text-emerald-800 block mt-1">
                              ₹{totalExpectedFees.toLocaleString("en-IN")}
                            </span>
                          </div>
                          <p className="text-[9.5px] text-emerald-600 font-medium">Estimated collections per academic year</p>
                        </div>

                        <div className="p-4 bg-red-50/40 border border-red-200 rounded-2xl flex flex-col justify-between gap-2">
                          <div>
                            <span className="text-[9px] font-bold text-red-700 uppercase tracking-widest block">Staff Payroll Expense</span>
                            <span className="text-lg font-bold text-red-800 block mt-1">
                              ₹{totalAnnualPayroll.toLocaleString("en-IN")}
                            </span>
                          </div>
                          <p className="text-[9.5px] text-red-600 font-medium">₹{totalMonthlyPayroll.toLocaleString("en-IN")} total staff salary per month</p>
                        </div>

                        <div className={`p-4 border rounded-2xl flex flex-col justify-between gap-2 ${surplus >= 0 ? "bg-blue-50/40 border-blue-200" : "bg-orange-50/40 border-orange-200"}`}>
                          <div>
                            <span className={`text-[9px] font-bold uppercase tracking-widest block ${surplus >= 0 ? "text-blue-700" : "text-orange-700"}`}>
                              {surplus >= 0 ? "Estimated Year Surplus" : "Estimated Year deficit"}
                            </span>
                            <span className={`text-lg font-bold block mt-1 ${surplus >= 0 ? "text-blue-800" : "text-orange-850"}`}>
                              ₹{Math.abs(surplus).toLocaleString("en-IN")}
                            </span>
                          </div>
                          <p className={`text-[9.5px] font-medium ${surplus >= 0 ? "text-blue-600" : "text-orange-600"}`}>
                            {surplus >= 0 ? "Net surplus before operational costs" : "Action required: adjust fees or staff count"}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Final Agreement Disclaimer */}
                <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-2xl space-y-2">
                  <h5 className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-zinc-500" /> Terms of Initialization
                  </h5>
                  <p className="text-[10px] text-zinc-500 leading-relaxed">
                    By launching, you staging this school configuration in a metadata buffer. 
                    Your credentials (Username and security PIN) will be generated. 
                    You must use these details to log in to complete configuration and materialize database tables.
                  </p>
                </div>
              </CardContent>
              <CardFooter className="p-4 sm:p-6 border-t border-zinc-150 bg-zinc-50/50 flex flex-col sm:flex-row justify-between gap-3">
                <Button variant="outline" onClick={() => setStep(5)} className="gap-1.5 w-full sm:w-auto font-semibold" disabled={loading}>
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </Button>
                <Button
                  onClick={handleCompleteLaunch}
                  disabled={loading}
                  className="gap-2 bg-[#1572FE] hover:bg-[#0f62d4] active:bg-[#004dc5] shadow-md px-6 text-white font-bold w-full sm:w-auto cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" /> Starting Tenant Setup...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-blue-50" /> Launch My School Portal
                    </>
                  )}
                </Button>
              </CardFooter>
            </div>
          )}

          {/* ==================================================================
              STEP 7: SIMULATED SUCCESS LAUNCH SCREEN
              ================================================================== */}
          {step === 7 && (
            <div className="p-8 text-center space-y-6 animate-fade-in">
              <div className="mx-auto w-16 h-16 rounded-full bg-[#e6f0ff] border border-[#1572FE]/25 flex items-center justify-center text-[#1572FE] shadow-sm">
                <CheckCircle2 className="w-10 h-10 text-blue-800" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-zinc-900">School Portal Successfully Launched!</h3>
                <p className="text-xs text-zinc-550 max-w-md mx-auto">
                  Your tenant configuration database for <span className="font-semibold text-zinc-800">{schoolName}</span> has been provisioned.
                </p>
              </div>

              {/* Credentials Highlight Block */}
              <div className="max-w-md mx-auto bg-[#e6f0ff] border border-[#1572FE]/20 rounded-2xl p-6 text-center space-y-4 shadow-sm">
                <span className="text-[10px] font-bold text-[#1572FE] uppercase tracking-widest block">ADMINISTRATOR ACCESS</span>
                
                <div className="space-y-1">
                  <div className="text-[10px] uppercase font-semibold text-zinc-400">Username / School Code</div>
                  <div className="text-md font-bold text-zinc-900 font-mono select-all bg-white py-1.5 px-4 rounded-lg border border-zinc-200 inline-block font-semibold">
                    {generatedUsername}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[10px] uppercase font-semibold text-zinc-400">Security PIN (Password)</div>
                  <div className="text-md font-bold text-[#1572FE] font-mono select-all bg-white py-1.5 px-4 rounded-lg border border-zinc-200 inline-block tracking-wider font-semibold">
                    {generatedPIN}
                  </div>
                </div>

                <p className="text-[10px] text-zinc-500 max-w-xs mx-auto leading-normal">
                  ⚠️ <strong>Save these credentials now.</strong> Copy the username and PIN. You will need to sign in with these exact details to access your dashboard.
                </p>
              </div>

              {/* Asset Summary */}
              <div className="max-w-md mx-auto bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-left space-y-1.5 text-xs text-zinc-500">
                <div className="flex justify-between">
                  <span className="font-medium text-zinc-400">Classrooms Prepared:</span>
                  <span className="font-bold text-zinc-700">{preparedClasses.length} class(es)</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-zinc-400">Faculty Members Staged:</span>
                  <span className="font-bold text-zinc-700">{teachers.length} teacher(s)</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-zinc-400">Students Staged:</span>
                  <span className="font-bold text-zinc-700">{parsedStudents.length} student(s)</span>
                </div>
              </div>

              <div className="pt-2 flex justify-center">
                <Button
                  onClick={() => router.push("/login")}
                  className="bg-[#1572FE] hover:bg-[#0f62d4] text-white font-bold px-8 py-2.5 rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer text-xs uppercase tracking-wide"
                >
                  Go to Login Portal <ArrowRight className="w-4.5 h-4.5" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
