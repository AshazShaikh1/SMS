"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { Play, CheckCircle2, AlertCircle, RefreshCw, Plus, Trash2, Upload, Download, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { importStudentsCSV } from "@/lib/db/students";
import { supabase, getActiveUserProfile } from "@/lib/supabase/client";

interface ParsedRow {
  first_name: string;
  last_name: string;
  roll_number: number;
  current_grade: string;
  section: string;
  parent_id?: string;
  // Demographic fields matching standard CSV structure
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
}

const cleanScientificNotation = (val: any): string => {
  if (val === undefined || val === null) return "";
  const str = String(val).trim();
  if (/^[+-]?\d+(\.\d+)?[eE][+-]?\d+$/.test(str)) {
    try {
      const num = Number(str);
      if (!isNaN(num)) {
        return num.toLocaleString("en-US", { useGrouping: false });
      }
    } catch (e) {}
  }
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

const TEMPLATE_HEADERS = [
  "action", "id", "name", "roll", "phone", "class", "section", "feesCat", "disabled", 
  "first_name", "surname", "registerNo", "gender", "birth_date", "dob_in_words", "birth_place", 
  "phones", "email", "address", "country", "state", "dist", "taluka", "colony", 
  "distance", "admit_in_class", "last_class", "last_school_attended", "admission_date", 
  "father_name", "father_occupation", "father_qualification", "father_uid_no", 
  "mother_name", "mother_occupation", "mother_qualification", "mother_uid_no", 
  "mother_tongue", "guardian", "sibling", "single_parent", "orphan", "aadhar_number", 
  "aapar_id", "pen_number", "saral_id", "nationality", "religion", "caste", "sub_caste", 
  "progress", "conduct", "reason_for_leaving", "leaving_date", "remarks", 
  "bloodgroup", "height", "weight", "handicap", "loginEmail", "muman", "qrcode", "rfid"
];

const TEMPLATE_SAMPLE_ROWS = [
  {
    action: "",
    id: "",
    name: "Mohd Ahil Sajid Husain Ansari",
    roll: "1",
    phone: "9320507770",
    class: "5th",
    section: "A",
    feesCat: "25-26 fifth",
    disabled: "FALSE",
    first_name: "",
    surname: "",
    registerNo: "9578",
    gender: "BLANK",
    birth_date: "11/05/2015",
    dob_in_words: "",
    birth_place: "",
    phones: "",
    email: "",
    address: "ROOM NO 221 2ND FLOOR. JUHU CO-OP HSG SOCIETY RAM MANDIR ROAD OSHIWARA GOREGAON WEST MUMBAI 400104",
    country: "",
    state: "",
    dist: "",
    taluka: "",
    colony: "",
    distance: "",
    admit_in_class: "",
    last_class: "",
    last_school_attended: "",
    admission_date: "",
    father_name: "",
    father_occupation: "",
    father_qualification: "",
    father_uid_no: "",
    mother_name: "SHEHNAZ",
    mother_occupation: "",
    mother_qualification: "",
    mother_uid_no: "",
    mother_tongue: "",
    guardian: "",
    sibling: "",
    single_parent: "FALSE",
    orphan: "FALSE",
    aadhar_number: "",
    aapar_id: "",
    pen_number: "",
    saral_id: "",
    nationality: "Indian",
    religion: "",
    caste: "",
    sub_caste: "",
    progress: "",
    conduct: "",
    reason_for_leaving: "",
    leaving_date: "",
    remarks: "",
    bloodgroup: "",
    height: "",
    weight: "",
    handicap: "FALSE",
    loginEmail: "",
    muman: "",
    qrcode: "",
    rfid: ""
  }
];

export default function StudentIntake() {
  const router = useRouter();

  const [userRole, setUserRole] = useState<string | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);

  useEffect(() => {
    async function checkSession() {
      const profile = await getActiveUserProfile();
      if (!profile) {
        router.push("/login");
      } else {
        setUserRole(profile.role);
      }
      setLoadingRole(false);
    }
    checkSession();
  }, [router]);

  const initialSingleStudentState: Partial<ParsedRow> = {
    first_name: "",
    last_name: "",
    roll_number: undefined,
    current_grade: "10",
    section: "A",
    register_no: "",
    gender: "",
    birth_date: "",
    dob_in_words: "",
    birth_place: "",
    phones: "",
    address: "",
    country: "India",
    state: "",
    dist: "",
    taluka: "",
    colony: "",
    distance: "",
    admit_in_class: "",
    last_class: "",
    last_school_attended: "",
    admission_date: "",
    father_name: "",
    father_occupation: "",
    father_qualification: "",
    father_uid_no: "",
    mother_name: "",
    mother_occupation: "",
    mother_qualification: "",
    mother_uid_no: "",
    mother_tongue: "",
    guardian: "",
    sibling: "",
    single_parent: false,
    orphan: false,
    aadhar_number: "",
    aapar_id: "",
    pen_number: "",
    saral_id: "",
    nationality: "Indian",
    religion: "",
    caste: "",
    sub_caste: "",
    progress: "",
    conduct: "",
    reason_for_leaving: "",
    leaving_date: "",
    remarks: "",
    bloodgroup: "",
    height: "",
    weight: "",
    handicap: false,
    login_email: "",
    muman: "",
    qrcode: "",
    rfid: "",
    parent_name: "",
    parent_phone: "",
    student_email: "",
  };

  const [singleStudent, setSingleStudent] = useState<Partial<ParsedRow>>(initialSingleStudentState);
  const [expandedSection, setExpandedSection] = useState<string | null>("core");

  const handleUpdateSingleStudentField = (field: keyof ParsedRow, value: any) => {
    setSingleStudent((prev) => ({ ...prev, [field]: value }));
  };

  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [status, setStatus] = useState<{ type: "idle" | "success" | "error" | "processing"; message: string }>({
    type: "idle",
    message: "",
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const itemsPerPage = 25;

  useEffect(() => {
    setCurrentPage(1);
    setExpandedIndex(null);
  }, [parsedData.length]);

  const handleSingleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const fname = singleStudent.first_name?.trim();
    const lname = singleStudent.last_name?.trim();
    if (!fname || !lname) return;

    const newRow: ParsedRow = {
      ...singleStudent,
      first_name: fname,
      last_name: lname,
      roll_number: Number(singleStudent.roll_number) || (parsedData.length + 1),
      current_grade: singleStudent.current_grade || "10",
      section: (singleStudent.section || "A").toUpperCase(),
      // Mappings and fallbacks
      parent_name: singleStudent.parent_name?.trim() || `${fname}'s Parent`,
      parent_phone: singleStudent.parent_phone?.trim() || "",
      student_email: singleStudent.student_email?.trim() || `${fname.toLowerCase()}.${lname.toLowerCase()}@school.edu`,
      login_email: singleStudent.login_email?.trim() || `${fname.toLowerCase()}.${lname.toLowerCase()}@school.edu`,
    };

    setParsedData([...parsedData, newRow]);
    setSingleStudent(initialSingleStudentState);
    setExpandedSection("core");
  };

  const handleRemoveRow = (index: number) => {
    setParsedData(parsedData.filter((_, idx) => idx !== index));
  };

  const totalPages = Math.ceil(parsedData.length / itemsPerPage) || 1;
  const paginatedData = parsedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const handleUpdateRowField = (index: number, field: keyof ParsedRow, value: any) => {
    setParsedData((prev) =>
      prev.map((row, idx) => {
        if (idx === index) {
          return { ...row, [field]: value };
        }
        return row;
      })
    );
  };

  const handleIngest = async () => {
    if (parsedData.length === 0) return;
    setStatus({ type: "processing", message: "Executing transaction batch write..." });

    try {
      const result = await importStudentsCSV(parsedData);
      if (result.success) {
        setStatus({
          type: "success",
          message: `Successfully ingested batch of ${result.count} students. Modifiers ledger calculations mapped.`,
        });
        setParsedData([]);
        setTimeout(() => {
          router.push("/admin");
        }, 1500);
      } else {
        setStatus({
          type: "error",
          message: "Failed to write batch transaction. Please check your data fields.",
        });
      }
    } catch (error: any) {
      setStatus({ type: "error", message: error.message || "An unexpected write failure occurred." });
    }
  };

  const downloadXLSXTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      TEMPLATE_HEADERS,
      TEMPLATE_HEADERS.map(h => TEMPLATE_SAMPLE_ROWS[0][h as keyof typeof TEMPLATE_SAMPLE_ROWS[0]] || "")
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Roster Template");
    XLSX.writeFile(wb, "students_bulk_import_template.xlsx");
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setStatus({ type: "processing", message: "Reading and parsing spreadsheet..." });
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const rows = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1 });
        if (rows.length <= 1) {
          setStatus({ type: "error", message: "Spreadsheet contains no data rows." });
          return;
        }

        const headers = rows[0];

        const nameIndex = getHeaderIndex(headers, "student_name");
        const firstNameIndex = getHeaderIndex(headers, "first_name");
        const surnameIndex = getHeaderIndex(headers, "surname");
        const rollIndex = getHeaderIndex(headers, "roll_id");
        const phoneIndex = getHeaderIndex(headers, "phone");
        const phonesIndex = getHeaderIndex(headers, "phones");
        const classIndex = getHeaderIndex(headers, "class");
        const sectionIndex = getHeaderIndex(headers, "section");
        const fatherIndex = getHeaderIndex(headers, "father_name");
        const motherIndex = getHeaderIndex(headers, "mother_name");
        const parentNameIndex = getHeaderIndex(headers, "parent_name");
        const emailIndex = getHeaderIndex(headers, "email");
        const loginEmailIndex = getHeaderIndex(headers, "loginemail");
        
        // Demographic indices
        const registerNoIndex = getHeaderIndex(headers, "registerno");
        const genderIndex = getHeaderIndex(headers, "gender");
        const birthDateIndex = getHeaderIndex(headers, "birth_date");
        const dobInWordsIndex = getHeaderIndex(headers, "dob_in_words");
        const birthPlaceIndex = getHeaderIndex(headers, "birth_place");
        const addressIndex = getHeaderIndex(headers, "address");
        const countryIndex = getHeaderIndex(headers, "country");
        const stateIndex = getHeaderIndex(headers, "state");
        const distIndex = getHeaderIndex(headers, "dist");
        const talukaIndex = getHeaderIndex(headers, "taluka");
        const colonyIndex = getHeaderIndex(headers, "colony");
        const distanceIndex = getHeaderIndex(headers, "distance");
        const admitInClassIndex = getHeaderIndex(headers, "admit_in_class");
        const lastClassIndex = getHeaderIndex(headers, "last_class");
        const lastSchoolIndex = getHeaderIndex(headers, "last_school_attended");
        const admissionDateIndex = getHeaderIndex(headers, "admission_date");
        const fatherOccIndex = getHeaderIndex(headers, "father_occupation");
        const fatherQualIndex = getHeaderIndex(headers, "father_qualification");
        const fatherUidIndex = getHeaderIndex(headers, "father_uid_no");
        const motherOccIndex = getHeaderIndex(headers, "mother_occupation");
        const motherQualIndex = getHeaderIndex(headers, "mother_qualification");
        const motherUidIndex = getHeaderIndex(headers, "mother_uid_no");
        const motherTongueIndex = getHeaderIndex(headers, "mother_tongue");
        const guardianIndex = getHeaderIndex(headers, "guardian");
        const siblingIndex = getHeaderIndex(headers, "sibling");
        const singleParentIndex = getHeaderIndex(headers, "single_parent");
        const orphanIndex = getHeaderIndex(headers, "orphan");
        const aadharIndex = getHeaderIndex(headers, "aadhar_number");
        const aaparIndex = getHeaderIndex(headers, "aapar_id");
        const penIndex = getHeaderIndex(headers, "pen_number");
        const saralIndex = getHeaderIndex(headers, "saral_id");
        const nationalityIndex = getHeaderIndex(headers, "nationality");
        const religionIndex = getHeaderIndex(headers, "religion");
        const casteIndex = getHeaderIndex(headers, "caste");
        const subCasteIndex = getHeaderIndex(headers, "sub_caste");
        const progressIndex = getHeaderIndex(headers, "progress");
        const conductIndex = getHeaderIndex(headers, "conduct");
        const reasonLeavingIndex = getHeaderIndex(headers, "reason_for_leaving");
        const leavingDateIndex = getHeaderIndex(headers, "leaving_date");
        const remarksIndex = getHeaderIndex(headers, "remarks");
        const bloodgroupIndex = getHeaderIndex(headers, "bloodgroup");
        const heightIndex = getHeaderIndex(headers, "height");
        const weightIndex = getHeaderIndex(headers, "weight");
        const handicapIndex = getHeaderIndex(headers, "handicap");
        const mumanIndex = getHeaderIndex(headers, "muman");
        const qrcodeIndex = getHeaderIndex(headers, "qrcode");
        const rfidIndex = getHeaderIndex(headers, "rfid");

        const newParsedRows: ParsedRow[] = [];

        for (let r = 1; r < rows.length; r++) {
          const row = rows[r];
          if (!row || row.length === 0) continue;

          let sName = "";
          if (nameIndex !== -1 && row[nameIndex]) {
            sName = String(row[nameIndex]).trim();
          } else {
            const fn = firstNameIndex !== -1 && row[firstNameIndex] ? String(row[firstNameIndex]).trim() : "";
            const sn = surnameIndex !== -1 && row[surnameIndex] ? String(row[surnameIndex]).trim() : "";
            sName = `${fn} ${sn}`.trim();
          }
          if (!sName) continue;

          // Parse name
          const parts = sName.split(/\s+/);
          const first_name = parts[0] || "";
          const last_name = parts.slice(1).join(" ") || "";

          // Class
          let classVal = "";
          if (classIndex !== -1 && row[classIndex]) {
            classVal = String(row[classIndex]).trim();
          }
          let resolvedGrade = "10";
          const match = classVal.match(/\d+/);
          if (match) {
            resolvedGrade = match[0];
          }

          // Section
          let resolvedSection = "A";
          if (sectionIndex !== -1 && row[sectionIndex]) {
            resolvedSection = String(row[sectionIndex]).trim().toUpperCase() || "A";
          }

          // Parent Phone
          let pPhone = "";
          if (phoneIndex !== -1 && row[phoneIndex]) {
            pPhone = cleanScientificNotation(row[phoneIndex]);
          } else if (phonesIndex !== -1 && row[phonesIndex]) {
            pPhone = cleanScientificNotation(row[phonesIndex]);
          }

          // Parent Name
          let pName = "";
          if (parentNameIndex !== -1 && row[parentNameIndex]) {
            pName = cleanScientificNotation(row[parentNameIndex]);
          } else if (fatherIndex !== -1 && row[fatherIndex]) {
            pName = cleanScientificNotation(row[fatherIndex]);
          } else if (motherIndex !== -1 && row[motherIndex]) {
            pName = cleanScientificNotation(row[motherIndex]);
          } else if (guardianIndex !== -1 && row[guardianIndex]) {
            pName = cleanScientificNotation(row[guardianIndex]);
          }

          // Student Email
          let sEmail = "";
          if (emailIndex !== -1 && row[emailIndex]) {
            sEmail = String(row[emailIndex]).trim();
          } else if (loginEmailIndex !== -1 && row[loginEmailIndex]) {
            sEmail = String(row[loginEmailIndex]).trim();
          }

          const getVal = (idx: number) => idx !== -1 && row[idx] !== undefined && row[idx] !== null ? cleanScientificNotation(row[idx]) : undefined;
          const getBool = (idx: number) => {
            if (idx === -1 || row[idx] === undefined || row[idx] === null) return undefined;
            const strVal = String(row[idx]).toLowerCase();
            return strVal === "true" || strVal === "yes" || strVal === "1";
          };

          newParsedRows.push({
            first_name,
            last_name,
            roll_number: rollIndex !== -1 && row[rollIndex] ? Number(row[rollIndex]) || 0 : 0,
            current_grade: resolvedGrade,
            section: resolvedSection,
            parent_name: pName || undefined,
            parent_phone: pPhone || undefined,
            student_email: sEmail || undefined,
            register_no: getVal(registerNoIndex),
            gender: getVal(genderIndex),
            birth_date: getVal(birthDateIndex),
            dob_in_words: getVal(dobInWordsIndex),
            birth_place: getVal(birthPlaceIndex),
            phones: getVal(phonesIndex),
            address: getVal(addressIndex),
            country: getVal(countryIndex),
            state: getVal(stateIndex),
            dist: getVal(distIndex),
            taluka: getVal(talukaIndex),
            colony: getVal(colonyIndex),
            distance: getVal(distanceIndex),
            admit_in_class: getVal(admitInClassIndex),
            last_class: getVal(lastClassIndex),
            last_school_attended: getVal(lastSchoolIndex),
            admission_date: getVal(admissionDateIndex),
            father_name: getVal(fatherIndex),
            father_occupation: getVal(fatherOccIndex),
            father_qualification: getVal(fatherQualIndex),
            father_uid_no: getVal(fatherUidIndex),
            mother_name: getVal(motherIndex),
            mother_occupation: getVal(motherOccIndex),
            mother_qualification: getVal(motherQualIndex),
            mother_uid_no: getVal(motherUidIndex),
            mother_tongue: getVal(motherTongueIndex),
            guardian: getVal(guardianIndex),
            sibling: getVal(siblingIndex),
            single_parent: getBool(singleParentIndex),
            orphan: getBool(orphanIndex),
            aadhar_number: getVal(aadharIndex),
            aapar_id: getVal(aaparIndex),
            pen_number: getVal(penIndex),
            saral_id: getVal(saralIndex),
            nationality: getVal(nationalityIndex),
            religion: getVal(religionIndex),
            caste: getVal(casteIndex),
            sub_caste: getVal(subCasteIndex),
            progress: getVal(progressIndex),
            conduct: getVal(conductIndex),
            reason_for_leaving: getVal(reasonLeavingIndex),
            leaving_date: getVal(leavingDateIndex),
            remarks: getVal(remarksIndex),
            bloodgroup: getVal(bloodgroupIndex),
            height: getVal(heightIndex),
            weight: getVal(weightIndex),
            handicap: getBool(handicapIndex),
            login_email: sEmail || undefined,
            muman: getVal(mumanIndex),
            qrcode: getVal(qrcodeIndex),
            rfid: getVal(rfidIndex),
          });
        }

        setParsedData((prev) => [...prev, ...newParsedRows]);
        setStatus({ type: "idle", message: "" });
      } catch (err: any) {
        console.error(err);
        setStatus({ type: "error", message: `Failed to parse file: ${err.message}` });
      }
    };

    reader.readAsArrayBuffer(files[0]);
    e.target.value = ""; // reset input
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Add Students</h1>
        <p className="text-xs text-zinc-505 mt-0.5 font-normal">Add new students manually or in bulk using standard template spreadsheets.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          {/* Selection Card: Single */}
          <Card className="border border-zinc-200 shadow-xs relative focus-within:z-30 hover:z-20">
            <CardHeader className="p-5">
              <CardTitle className="text-sm font-semibold">
                Add Single Student
              </CardTitle>
              <CardDescription>
                Enter the student's details below to verify and add them to the queue.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0 space-y-4">
              <form onSubmit={handleSingleAdd} className="space-y-3">
                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                  {/* Section 1: Core Enrollment */}
                  <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white shadow-xs">
                    <button
                      type="button"
                      onClick={() => setExpandedSection(expandedSection === "core" ? null : "core")}
                      className="w-full flex items-center justify-between p-3.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-[#1572FE]">🔑</span> Core Enrollment
                      </span>
                      {expandedSection === "core" ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
                    </button>
                    {expandedSection === "core" && (
                      <div className="p-3.5 border-t border-zinc-200 bg-zinc-50/20 space-y-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-zinc-500 uppercase">First Name <span className="text-red-500">*</span></label>
                          <Input
                            value={singleStudent.first_name || ""}
                            onChange={(e) => handleUpdateSingleStudentField("first_name", e.target.value)}
                            placeholder="e.g. Rahul"
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-zinc-500 uppercase">Last Name <span className="text-red-500">*</span></label>
                          <Input
                            value={singleStudent.last_name || ""}
                            onChange={(e) => handleUpdateSingleStudentField("last_name", e.target.value)}
                            placeholder="e.g. Sharma"
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-zinc-500 uppercase">Roll Number (Optional)</label>
                          <Input
                            type="number"
                            value={singleStudent.roll_number || ""}
                            onChange={(e) => handleUpdateSingleStudentField("roll_number", e.target.value)}
                            placeholder="e.g. 76"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-zinc-500 uppercase">Grade</label>
                            <Select value={singleStudent.current_grade || "10"} onChange={(e) => handleUpdateSingleStudentField("current_grade", e.target.value)}>
                              <option value="9">Grade 9</option>
                              <option value="10">Grade 10</option>
                              <option value="11">Grade 11</option>
                              <option value="12">Grade 12</option>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-zinc-500 uppercase">Section</label>
                            <Select value={singleStudent.section || "A"} onChange={(e) => handleUpdateSingleStudentField("section", e.target.value)}>
                              <option value="A">Section A</option>
                              <option value="B">Section B</option>
                              <option value="C">Section C</option>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-zinc-500 uppercase">Register No (Optional)</label>
                          <Input
                            value={singleStudent.register_no || ""}
                            onChange={(e) => handleUpdateSingleStudentField("register_no", e.target.value)}
                            placeholder="e.g. 9578"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-zinc-500 uppercase">Admit in Class (Optional)</label>
                          <Input
                            value={singleStudent.admit_in_class || ""}
                            onChange={(e) => handleUpdateSingleStudentField("admit_in_class", e.target.value)}
                            placeholder="e.g. 9th"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-zinc-500 uppercase">Admission Date (Optional)</label>
                          <Input
                            value={singleStudent.admission_date || ""}
                            onChange={(e) => handleUpdateSingleStudentField("admission_date", e.target.value)}
                            placeholder="DD/MM/YYYY"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Section 2: Personal Profile */}
                  <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white shadow-xs">
                    <button
                      type="button"
                      onClick={() => setExpandedSection(expandedSection === "personal" ? null : "personal")}
                      className="w-full flex items-center justify-between p-3.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-[#1572FE]">👤</span> Personal Profile
                      </span>
                      {expandedSection === "personal" ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
                    </button>
                    {expandedSection === "personal" && (
                      <div className="p-3.5 border-t border-zinc-200 bg-zinc-50/20 space-y-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-zinc-500 uppercase">Gender</label>
                          <Input
                            value={singleStudent.gender || ""}
                            onChange={(e) => handleUpdateSingleStudentField("gender", e.target.value)}
                            placeholder="e.g. Male / Female"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-zinc-500 uppercase">Birth Date</label>
                          <Input
                            value={singleStudent.birth_date || ""}
                            onChange={(e) => handleUpdateSingleStudentField("birth_date", e.target.value)}
                            placeholder="DD/MM/YYYY"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-zinc-500 uppercase">DOB in Words</label>
                          <Input
                            value={singleStudent.dob_in_words || ""}
                            onChange={(e) => handleUpdateSingleStudentField("dob_in_words", e.target.value)}
                            placeholder="e.g. Eleventh May Two Thousand Fifteen"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-zinc-500 uppercase">Birth Place</label>
                          <Input
                            value={singleStudent.birth_place || ""}
                            onChange={(e) => handleUpdateSingleStudentField("birth_place", e.target.value)}
                            placeholder="e.g. Mumbai"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-zinc-500 uppercase">Nationality</label>
                          <Input
                            value={singleStudent.nationality || ""}
                            onChange={(e) => handleUpdateSingleStudentField("nationality", e.target.value)}
                            placeholder="e.g. Indian"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-zinc-500 uppercase">Religion</label>
                          <Input
                            value={singleStudent.religion || ""}
                            onChange={(e) => handleUpdateSingleStudentField("religion", e.target.value)}
                            placeholder="e.g. Hindu / Islam"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-zinc-500 uppercase">Caste</label>
                          <Input
                            value={singleStudent.caste || ""}
                            onChange={(e) => handleUpdateSingleStudentField("caste", e.target.value)}
                            placeholder="e.g. General"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-zinc-500 uppercase">Sub Caste</label>
                          <Input
                            value={singleStudent.sub_caste || ""}
                            onChange={(e) => handleUpdateSingleStudentField("sub_caste", e.target.value)}
                            placeholder="Sub Caste"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-zinc-500 uppercase">Mother Tongue</label>
                          <Input
                            value={singleStudent.mother_tongue || ""}
                            onChange={(e) => handleUpdateSingleStudentField("mother_tongue", e.target.value)}
                            placeholder="e.g. Hindi"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Section 3: Physical & Health */}
                  <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white shadow-xs">
                    <button
                      type="button"
                      onClick={() => setExpandedSection(expandedSection === "health" ? null : "health")}
                      className="w-full flex items-center justify-between p-3.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-[#1572FE]">📋</span> Physical & Health
                      </span>
                      {expandedSection === "health" ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
                    </button>
                    {expandedSection === "health" && (
                      <div className="p-3.5 border-t border-zinc-200 bg-zinc-50/20 space-y-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-zinc-500 uppercase">Blood Group</label>
                          <Input
                            value={singleStudent.bloodgroup || ""}
                            onChange={(e) => handleUpdateSingleStudentField("bloodgroup", e.target.value)}
                            placeholder="e.g. B+"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-zinc-500 uppercase">Height (cm)</label>
                          <Input
                            value={singleStudent.height || ""}
                            onChange={(e) => handleUpdateSingleStudentField("height", e.target.value)}
                            placeholder="Height in cm"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-zinc-500 uppercase">Weight (kg)</label>
                          <Input
                            value={singleStudent.weight || ""}
                            onChange={(e) => handleUpdateSingleStudentField("weight", e.target.value)}
                            placeholder="Weight in kg"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-zinc-500 uppercase">Handicap</label>
                          <Select
                            value={singleStudent.handicap ? "true" : "false"}
                            onChange={(e) => handleUpdateSingleStudentField("handicap", e.target.value === "true")}
                          >
                            <option value="false">No</option>
                            <option value="true">Yes</option>
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Section 4: Contact & Address */}
                  <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white shadow-xs">
                    <button
                      type="button"
                      onClick={() => setExpandedSection(expandedSection === "contact" ? null : "contact")}
                      className="w-full flex items-center justify-between p-3.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-[#1572FE]">🏠</span> Contact & Address
                      </span>
                      {expandedSection === "contact" ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
                    </button>
                    {expandedSection === "contact" && (
                      <div className="p-3.5 border-t border-zinc-200 bg-zinc-50/20 space-y-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-zinc-500 uppercase">Alternate Phone Numbers</label>
                          <Input
                            value={singleStudent.phones || ""}
                            onChange={(e) => handleUpdateSingleStudentField("phones", e.target.value)}
                            placeholder="Other phone numbers"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-zinc-500 uppercase">Student Email</label>
                          <Input
                            type="email"
                            value={singleStudent.student_email || ""}
                            onChange={(e) => handleUpdateSingleStudentField("student_email", e.target.value)}
                            placeholder="Student email"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-zinc-500 uppercase">Login Email</label>
                          <Input
                            type="email"
                            value={singleStudent.login_email || ""}
                            onChange={(e) => handleUpdateSingleStudentField("login_email", e.target.value)}
                            placeholder="Login email"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-zinc-500 uppercase">Address</label>
                          <textarea
                            value={singleStudent.address || ""}
                            onChange={(e) => handleUpdateSingleStudentField("address", e.target.value)}
                            placeholder="Full address"
                            rows={3}
                            className="flex w-full rounded-xl border border-[#d4d4d8] bg-[#FFFFFF] px-4 py-2.5 text-sm text-[#09090b] shadow-sm focus:outline-none focus:ring-2 focus:ring-[rgba(21,114,254,0.15)] focus:border-[#1572FE] transition-all placeholder:text-[#a1a1aa] resize-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-zinc-500 uppercase">Colony / Area</label>
                          <Input
                            value={singleStudent.colony || ""}
                            onChange={(e) => handleUpdateSingleStudentField("colony", e.target.value)}
                            placeholder="Colony"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-zinc-500 uppercase">Distance (km)</label>
                          <Input
                            value={singleStudent.distance || ""}
                            onChange={(e) => handleUpdateSingleStudentField("distance", e.target.value)}
                            placeholder="Distance to school in km"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-zinc-500 uppercase">Taluka</label>
                          <Input
                            value={singleStudent.taluka || ""}
                            onChange={(e) => handleUpdateSingleStudentField("taluka", e.target.value)}
                            placeholder="Taluka / Block"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-zinc-500 uppercase">District</label>
                          <Input
                            value={singleStudent.dist || ""}
                            onChange={(e) => handleUpdateSingleStudentField("dist", e.target.value)}
                            placeholder="District"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-zinc-500 uppercase">State</label>
                          <Input
                            value={singleStudent.state || ""}
                            onChange={(e) => handleUpdateSingleStudentField("state", e.target.value)}
                            placeholder="State"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-zinc-500 uppercase">Country</label>
                          <Input
                            value={singleStudent.country || ""}
                            onChange={(e) => handleUpdateSingleStudentField("country", e.target.value)}
                            placeholder="Country"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Section 5: Family Details */}
                  <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white shadow-xs">
                    <button
                      type="button"
                      onClick={() => setExpandedSection(expandedSection === "family" ? null : "family")}
                      className="w-full flex items-center justify-between p-3.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-[#1572FE]">👪</span> Family Details
                      </span>
                      {expandedSection === "family" ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
                    </button>
                    {expandedSection === "family" && (
                      <div className="p-3.5 border-t border-zinc-200 bg-zinc-50/20 space-y-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-zinc-500 uppercase">Parent Name</label>
                          <Input
                            value={singleStudent.parent_name || ""}
                            onChange={(e) => handleUpdateSingleStudentField("parent_name", e.target.value)}
                            placeholder="Primary Parent Name"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-zinc-500 uppercase">Parent Phone</label>
                          <Input
                            value={singleStudent.parent_phone || ""}
                            onChange={(e) => handleUpdateSingleStudentField("parent_phone", e.target.value)}
                            placeholder="Primary Parent Phone"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-zinc-500 uppercase">Father Name</label>
                          <Input
                            value={singleStudent.father_name || ""}
                            onChange={(e) => handleUpdateSingleStudentField("father_name", e.target.value)}
                            placeholder="Father Name"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-zinc-500 uppercase">Father Occupation</label>
                          <Input
                            value={singleStudent.father_occupation || ""}
                            onChange={(e) => handleUpdateSingleStudentField("father_occupation", e.target.value)}
                            placeholder="Father Occupation"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-zinc-500 uppercase">Father Qualification</label>
                          <Input
                            value={singleStudent.father_qualification || ""}
                            onChange={(e) => handleUpdateSingleStudentField("father_qualification", e.target.value)}
                            placeholder="Father Qualification"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-zinc-500 uppercase">Father Aadhar/UID</label>
                          <Input
                            value={singleStudent.father_uid_no || ""}
                            onChange={(e) => handleUpdateSingleStudentField("father_uid_no", e.target.value)}
                            placeholder="Father UID"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-zinc-500 uppercase">Mother Name</label>
                          <Input
                            value={singleStudent.mother_name || ""}
                            onChange={(e) => handleUpdateSingleStudentField("mother_name", e.target.value)}
                            placeholder="Mother Name"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-zinc-500 uppercase">Mother Occupation</label>
                          <Input
                            value={singleStudent.mother_occupation || ""}
                            onChange={(e) => handleUpdateSingleStudentField("mother_occupation", e.target.value)}
                            placeholder="Mother Occupation"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-zinc-500 uppercase">Mother Qualification</label>
                          <Input
                            value={singleStudent.mother_qualification || ""}
                            onChange={(e) => handleUpdateSingleStudentField("mother_qualification", e.target.value)}
                            placeholder="Mother Qualification"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-zinc-500 uppercase">Mother Aadhar/UID</label>
                          <Input
                            value={singleStudent.mother_uid_no || ""}
                            onChange={(e) => handleUpdateSingleStudentField("mother_uid_no", e.target.value)}
                            placeholder="Mother UID"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-zinc-500 uppercase">Guardian Name</label>
                          <Input
                            value={singleStudent.guardian || ""}
                            onChange={(e) => handleUpdateSingleStudentField("guardian", e.target.value)}
                            placeholder="Guardian Name (if other than parent)"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-zinc-500 uppercase">Sibling Details</label>
                          <Input
                            value={singleStudent.sibling || ""}
                            onChange={(e) => handleUpdateSingleStudentField("sibling", e.target.value)}
                            placeholder="Sibling details"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-zinc-500 uppercase">Single Parent</label>
                          <Select
                            value={singleStudent.single_parent ? "true" : "false"}
                            onChange={(e) => handleUpdateSingleStudentField("single_parent", e.target.value === "true")}
                          >
                            <option value="false">No</option>
                            <option value="true">Yes</option>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-zinc-500 uppercase">Orphan</label>
                          <Select
                            value={singleStudent.orphan ? "true" : "false"}
                            onChange={(e) => handleUpdateSingleStudentField("orphan", e.target.value === "true")}
                          >
                            <option value="false">No</option>
                            <option value="true">Yes</option>
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Section 6: Academic Details */}
                  <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white shadow-xs">
                    <button
                      type="button"
                      onClick={() => setExpandedSection(expandedSection === "academic" ? null : "academic")}
                      className="w-full flex items-center justify-between p-3.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-[#1572FE]">🎓</span> Academic History
                      </span>
                      {expandedSection === "academic" ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
                    </button>
                    {expandedSection === "academic" && (
                      <div className="p-3.5 border-t border-zinc-200 bg-zinc-50/20 space-y-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-zinc-500 uppercase">Last Class</label>
                          <Input
                            value={singleStudent.last_class || ""}
                            onChange={(e) => handleUpdateSingleStudentField("last_class", e.target.value)}
                            placeholder="e.g. 9th std"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-zinc-500 uppercase">Last School Attended</label>
                          <Input
                            value={singleStudent.last_school_attended || ""}
                            onChange={(e) => handleUpdateSingleStudentField("last_school_attended", e.target.value)}
                            placeholder="Previous school name"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-zinc-500 uppercase">Progress</label>
                          <Input
                            value={singleStudent.progress || ""}
                            onChange={(e) => handleUpdateSingleStudentField("progress", e.target.value)}
                            placeholder="e.g. Good / Average"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-zinc-500 uppercase">Conduct</label>
                          <Input
                            value={singleStudent.conduct || ""}
                            onChange={(e) => handleUpdateSingleStudentField("conduct", e.target.value)}
                            placeholder="e.g. Satisfactory"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-zinc-500 uppercase">Leaving Date</label>
                          <Input
                            value={singleStudent.leaving_date || ""}
                            onChange={(e) => handleUpdateSingleStudentField("leaving_date", e.target.value)}
                            placeholder="DD/MM/YYYY"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-zinc-500 uppercase">Reason for Leaving</label>
                          <Input
                            value={singleStudent.reason_for_leaving || ""}
                            onChange={(e) => handleUpdateSingleStudentField("reason_for_leaving", e.target.value)}
                            placeholder="Reason for leaving last school"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-zinc-500 uppercase">Remarks</label>
                          <Input
                            value={singleStudent.remarks || ""}
                            onChange={(e) => handleUpdateSingleStudentField("remarks", e.target.value)}
                            placeholder="Any remarks"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Section 7: Registry Identifiers */}
                  <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white shadow-xs">
                    <button
                      type="button"
                      onClick={() => setExpandedSection(expandedSection === "identifiers" ? null : "identifiers")}
                      className="w-full flex items-center justify-between p-3.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-[#1572FE]">🛡️</span> Registry Identifiers
                      </span>
                      {expandedSection === "identifiers" ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
                    </button>
                    {expandedSection === "identifiers" && (
                      <div className="p-3.5 border-t border-zinc-200 bg-zinc-50/20 space-y-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-zinc-500 uppercase">Aadhar Number</label>
                          <Input
                            value={singleStudent.aadhar_number || ""}
                            onChange={(e) => handleUpdateSingleStudentField("aadhar_number", e.target.value)}
                            placeholder="Aadhar Number"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-zinc-500 uppercase">APAAR ID</label>
                          <Input
                            value={singleStudent.aapar_id || ""}
                            onChange={(e) => handleUpdateSingleStudentField("aapar_id", e.target.value)}
                            placeholder="APAAR ID"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-zinc-500 uppercase">PEN Number</label>
                          <Input
                            value={singleStudent.pen_number || ""}
                            onChange={(e) => handleUpdateSingleStudentField("pen_number", e.target.value)}
                            placeholder="PEN Number"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-zinc-500 uppercase">SARAL ID</label>
                          <Input
                            value={singleStudent.saral_id || ""}
                            onChange={(e) => handleUpdateSingleStudentField("saral_id", e.target.value)}
                            placeholder="SARAL ID"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-zinc-500 uppercase">Muman</label>
                          <Input
                            value={singleStudent.muman || ""}
                            onChange={(e) => handleUpdateSingleStudentField("muman", e.target.value)}
                            placeholder="Muman Number"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-zinc-500 uppercase">RFID</label>
                          <Input
                            value={singleStudent.rfid || ""}
                            onChange={(e) => handleUpdateSingleStudentField("rfid", e.target.value)}
                            placeholder="RFID Device Tag"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-zinc-500 uppercase">QR Code</label>
                          <Input
                            value={singleStudent.qrcode || ""}
                            onChange={(e) => handleUpdateSingleStudentField("qrcode", e.target.value)}
                            placeholder="QR Code Data"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <Button type="submit" variant="outline" className="w-full mt-2 hover:border-[#1572FE] hover:bg-blue-50/20 text-[#1572FE] flex items-center justify-center gap-1.5">
                  <Plus className="w-4 h-4" /> Add Student to Queue
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Selection Card: Bulk */}
          <Card className="border border-zinc-200 shadow-xs relative bg-[#fff8f5] border-orange-200/60 hover:z-20">
            <CardHeader className="p-5">
              <CardTitle className="text-sm font-semibold text-orange-950 flex items-center gap-1.5">
                <Upload className="w-4.5 h-4.5 text-orange-600" />
                Bulk Student Import / Export
              </CardTitle>
              <CardDescription className="text-orange-900/80">
                Download the structured format sheet, enter enrollment parameters, and upload it back.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0 space-y-4">
              <div className="space-y-3">
                {!loadingRole && userRole === "developer" && (
                  <Button 
                    onClick={downloadXLSXTemplate} 
                    variant="outline" 
                    className="w-full h-9 bg-white border-zinc-200 hover:border-zinc-300 text-xs font-semibold flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5 text-zinc-550" /> Download Expected Template (.xlsx)
                  </Button>
                )}
                {!loadingRole && userRole !== "developer" && (
                  <div className="text-[10px] text-zinc-500 font-medium text-center bg-zinc-50 border border-zinc-150 p-2.5 rounded-xl">
                    ⚠️ Expected template download is restricted to developers only.
                  </div>
                )}
                
                <div className="border-t border-zinc-200/60 pt-3">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide mb-1.5">Upload Spreadsheet</div>
                  <input
                    type="file"
                    id="bulk-student-file"
                    className="hidden"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileImport}
                  />
                  <Button 
                    onClick={() => document.getElementById("bulk-student-file")?.click()}
                    className="w-full h-9 bg-[#1572FE] hover:bg-[#0f62d4] text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" /> Upload File (.xlsx, .xls, .csv)
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview / Validation Grid */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border border-zinc-200 h-full flex flex-col justify-between relative focus-within:z-30 hover:z-20">
            <div>
              <CardHeader className="p-5 border-b border-zinc-100 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">Verify Student List</CardTitle>
                  <CardDescription>Review student row properties before database commitment.</CardDescription>
                </div>
                <Badge variant={parsedData.length > 0 ? "success" : "neutral"}>
                  {parsedData.length} records in queue
                </Badge>
              </CardHeader>
              
              <CardContent className="p-0">
                {status.type === "processing" && (
                  <div className="p-8 text-center text-zinc-500 text-xs flex flex-col items-center gap-3">
                    <RefreshCw className="w-6 h-6 animate-spin text-emerald-850" />
                    <span>{status.message}</span>
                  </div>
                )}

                {status.type === "success" && (
                  <div className="p-8 text-center text-blue-800 text-xs flex flex-col items-center gap-2">
                    <CheckCircle2 className="w-8 h-8 text-blue-700" />
                    <span className="font-semibold text-sm">{status.message}</span>
                  </div>
                )}

                {status.type === "error" && (
                  <div className="p-5 text-red-700 text-xs flex items-start gap-2 bg-red-50 border-b border-red-150">
                    <AlertCircle className="w-4.5 h-4.5 shrink-0" />
                    <span>{status.message}</span>
                  </div>
                )}

                {status.type !== "processing" && status.type !== "success" && parsedData.length === 0 && (
                  <div className="p-12 text-center text-zinc-400 text-xs">
                    Your student rows will show up here for you to verify before saving them to the system.
                  </div>
                )}

                {parsedData.length > 0 && status.type !== "success" && status.type !== "processing" && (
                  <>
                    {/* Clean Scrollable Data Table Preview */}
                    <div className="overflow-x-auto w-full border border-zinc-200 rounded-xl bg-white shadow-xs">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-zinc-50/75 border-b border-zinc-200 text-[10px] sm:text-[11px] font-bold text-zinc-500 uppercase tracking-wider select-none">
                            <th className="py-3 px-4 text-center w-16">Roll</th>
                            <th className="py-3 px-4 min-w-[150px]">Student Name</th>
                            <th className="py-3 px-4 text-center w-20">Grade</th>
                            <th className="py-3 px-4 text-center w-20">Section</th>
                            <th className="py-3 px-4 min-w-[150px]">Parent Name</th>
                            <th className="py-3 px-4 min-w-[130px]">Parent Phone</th>
                            <th className="py-3 px-4 min-w-[120px]">Aadhar No</th>
                            <th className="py-3 px-4 text-right w-24">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-150 text-xs">
                          {paginatedData.map((row, relativeIdx) => {
                            const idx = (currentPage - 1) * itemsPerPage + relativeIdx;
                            const isExpanded = expandedIndex === idx;
                            const isMissingCritical = !row.first_name || !row.last_name || !row.parent_name || !row.parent_phone;

                            return (
                              <React.Fragment key={idx}>
                                {/* Row */}
                                <tr 
                                  onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                                  className={`hover:bg-zinc-550/5/20 transition-colors cursor-pointer ${
                                    isExpanded ? "bg-blue-50/15" : isMissingCritical ? "bg-amber-50/10" : "bg-white"
                                  }`}
                                >
                                  {/* Roll */}
                                  <td className="py-3 px-4 text-center font-semibold text-zinc-500">
                                    #{row.roll_number || (idx + 1)}
                                  </td>
                                  
                                  {/* Student Name */}
                                  <td className="py-3 px-4">
                                    <span className="font-semibold text-zinc-900 block text-sm">
                                      {row.first_name || row.last_name ? `${row.first_name || ""} ${row.last_name || ""}`.trim() : (
                                        <span className="text-red-500 italic">Unnamed Student</span>
                                      )}
                                    </span>
                                  </td>
                                  
                                  {/* Grade */}
                                  <td className="py-3 px-4 text-center font-medium text-zinc-600">
                                    {row.current_grade || "—"}
                                  </td>
                                  
                                  {/* Section */}
                                  <td className="py-3 px-4 text-center font-medium text-zinc-700">
                                    {row.section || "—"}
                                  </td>
                                  
                                  {/* Parent Name */}
                                  <td className={`py-3 px-4 ${!row.parent_name ? "bg-amber-50/30" : ""}`}>
                                    {row.parent_name ? (
                                      <span className="text-zinc-800 font-medium">{row.parent_name}</span>
                                    ) : (
                                      <span className="text-[9px] bg-amber-50 border border-amber-200 text-amber-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">
                                        Missing
                                      </span>
                                    )}
                                  </td>
                                  
                                  {/* Parent Phone */}
                                  <td className={`py-3 px-4 ${!row.parent_phone ? "bg-amber-50/30" : ""}`}>
                                    {row.parent_phone ? (
                                      <span className="text-zinc-650 font-medium font-mono">{row.parent_phone}</span>
                                    ) : (
                                      <span className="text-[9px] bg-amber-50 border border-amber-200 text-amber-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">
                                        Missing
                                      </span>
                                    )}
                                  </td>
                                  
                                  {/* Aadhar */}
                                  <td className="py-3 px-4 text-zinc-600 font-mono">
                                    {row.aadhar_number || "—"}
                                  </td>

                                  {/* Actions */}
                                  <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center justify-end gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 p-0"
                                        onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                                      >
                                        {isExpanded ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 text-red-500 hover:text-red-750 hover:bg-red-50 p-0"
                                        onClick={() => handleRemoveRow(idx)}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>

                                {/* Collapsible Row containing the interactive editor form */}
                                {isExpanded && (
                                  <tr className="bg-[#f9fafb]/50">
                                    <td colSpan={8} className="p-0 border-t border-zinc-200">
                                      <div className="px-4 py-4 md:px-6 md:pb-6 md:pt-3 text-[11px] text-zinc-700 animate-fade-in">
                                        
                                        {/* Section 0: Required / Core Enrollment Details */}
                                        <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg mb-4 space-y-3">
                                          <h5 className="font-semibold text-zinc-800 flex items-center gap-1.5 text-xs">
                                            🔑 Core Enrollment Details
                                          </h5>
                                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            <div className="space-y-1">
                                              <label className="text-[10px] font-semibold text-zinc-500 uppercase flex items-center justify-between">
                                                <span>First Name</span>
                                                {!row.first_name && <span className="text-red-500 text-[8px] font-bold">Required</span>}
                                              </label>
                                              <Input
                                                type="text"
                                                placeholder="First Name"
                                                className={`h-8 text-xs bg-white ${!row.first_name ? 'border-red-350 focus:border-red-500' : 'border-zinc-200'}`}
                                                value={row.first_name || ""}
                                                onChange={(e) => handleUpdateRowField(idx, "first_name", e.target.value)}
                                              />
                                            </div>
                                            <div className="space-y-1">
                                              <label className="text-[10px] font-semibold text-zinc-500 uppercase flex items-center justify-between">
                                                <span>Last Name</span>
                                                {!row.last_name && <span className="text-red-500 text-[8px] font-bold">Required</span>}
                                              </label>
                                              <Input
                                                type="text"
                                                placeholder="Last Name"
                                                className={`h-8 text-xs bg-white ${!row.last_name ? 'border-red-350 focus:border-red-500' : 'border-zinc-200'}`}
                                                value={row.last_name || ""}
                                                onChange={(e) => handleUpdateRowField(idx, "last_name", e.target.value)}
                                              />
                                            </div>
                                            <div className="space-y-1">
                                              <label className="text-[10px] font-semibold text-zinc-500 uppercase">Roll Number</label>
                                              <Input
                                                type="number"
                                                placeholder="Roll Number"
                                                className="h-8 text-xs bg-white border-zinc-200"
                                                value={row.roll_number || ""}
                                                onChange={(e) => handleUpdateRowField(idx, "roll_number", Number(e.target.value) || 0)}
                                              />
                                            </div>
                                            <div className="space-y-1">
                                              <label className="text-[10px] font-semibold text-zinc-500 uppercase flex items-center justify-between">
                                                <span>Parent Name</span>
                                                {!row.parent_name && <span className="text-red-500 text-[8px] font-bold">Required</span>}
                                              </label>
                                              <Input
                                                type="text"
                                                placeholder="Parent Name"
                                                className={`h-8 text-xs bg-white ${!row.parent_name ? 'border-red-350 focus:border-red-500' : 'border-zinc-200'}`}
                                                value={row.parent_name || ""}
                                                onChange={(e) => handleUpdateRowField(idx, "parent_name", e.target.value)}
                                              />
                                            </div>
                                            <div className="space-y-1">
                                              <label className="text-[10px] font-semibold text-zinc-500 uppercase flex items-center justify-between">
                                                <span>Parent Phone</span>
                                                {!row.parent_phone && <span className="text-red-500 text-[8px] font-bold">Required</span>}
                                              </label>
                                              <Input
                                                type="text"
                                                placeholder="Parent Phone"
                                                className={`h-8 text-xs bg-white ${!row.parent_phone ? 'border-red-350 focus:border-red-500' : 'border-zinc-200'}`}
                                                value={row.parent_phone || ""}
                                                onChange={(e) => handleUpdateRowField(idx, "parent_phone", e.target.value)}
                                              />
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                              <div className="space-y-1">
                                                <label className="text-[10px] font-semibold text-zinc-500 uppercase">Grade</label>
                                                <select
                                                  value={row.current_grade || "10"}
                                                  onChange={(e) => handleUpdateRowField(idx, "current_grade", e.target.value)}
                                                  className="w-full h-8 text-xs bg-white border border-zinc-200 rounded px-2"
                                                >
                                                  <option value="9">Grade 9</option>
                                                  <option value="10">Grade 10</option>
                                                  <option value="11">Grade 11</option>
                                                  <option value="12">Grade 12</option>
                                                </select>
                                              </div>
                                              <div className="space-y-1">
                                                <label className="text-[10px] font-semibold text-zinc-500 uppercase">Section</label>
                                                <select
                                                  value={row.section || "A"}
                                                  onChange={(e) => handleUpdateRowField(idx, "section", e.target.value.toUpperCase())}
                                                  className="w-full h-8 text-xs bg-white border border-zinc-200 rounded px-2"
                                                >
                                                  <option value="A">Section A</option>
                                                  <option value="B">Section B</option>
                                                  <option value="C">Section C</option>
                                                </select>
                                              </div>
                                            </div>
                                          </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                          
                                          {/* Section 1: Personal Profile */}
                                          <div className="space-y-2.5">
                                            <h5 className="font-semibold text-zinc-800 border-b border-zinc-200/60 pb-1 flex items-center gap-1.5 text-xs">
                                              👤 Personal & Health Profile
                                            </h5>
                                            <div className="grid grid-cols-2 gap-x-2 gap-y-2">
                                              <div className="flex flex-col gap-0.5">
                                                <span className="text-zinc-400 text-[10px]">Gender:</span>
                                                <input
                                                  type="text"
                                                  value={row.gender || ""}
                                                  placeholder="—"
                                                  onChange={(e) => handleUpdateRowField(idx, "gender", e.target.value)}
                                                  className="w-full bg-transparent border-b border-zinc-250 py-0.5 text-zinc-800 focus:outline-none focus:border-[#1572FE] text-[11px]"
                                                />
                                              </div>
                                              <div className="flex flex-col gap-0.5">
                                                <span className="text-zinc-400 text-[10px]">Blood Group:</span>
                                                <input
                                                  type="text"
                                                  value={row.bloodgroup || ""}
                                                  placeholder="—"
                                                  onChange={(e) => handleUpdateRowField(idx, "bloodgroup", e.target.value)}
                                                  className="w-full bg-transparent border-b border-zinc-250 py-0.5 text-zinc-800 focus:outline-none focus:border-[#1572FE] text-[11px]"
                                                />
                                              </div>
                                              <div className="flex flex-col gap-0.5">
                                                <span className="text-zinc-400 text-[10px]">DOB:</span>
                                                <input
                                                  type="text"
                                                  value={row.birth_date || ""}
                                                  placeholder="—"
                                                  onChange={(e) => handleUpdateRowField(idx, "birth_date", e.target.value)}
                                                  className="w-full bg-transparent border-b border-zinc-250 py-0.5 text-zinc-800 focus:outline-none focus:border-[#1572FE] text-[11px]"
                                                />
                                              </div>
                                              <div className="flex flex-col gap-0.5">
                                                <span className="text-zinc-400 text-[10px]">DOB Words:</span>
                                                <input
                                                  type="text"
                                                  value={row.dob_in_words || ""}
                                                  placeholder="—"
                                                  onChange={(e) => handleUpdateRowField(idx, "dob_in_words", e.target.value)}
                                                  className="w-full bg-transparent border-b border-zinc-250 py-0.5 text-zinc-800 focus:outline-none focus:border-[#1572FE] text-[11px]"
                                                />
                                              </div>
                                              <div className="flex flex-col gap-0.5">
                                                <span className="text-zinc-400 text-[10px]">Birth Place:</span>
                                                <input
                                                  type="text"
                                                  value={row.birth_place || ""}
                                                  placeholder="—"
                                                  onChange={(e) => handleUpdateRowField(idx, "birth_place", e.target.value)}
                                                  className="w-full bg-transparent border-b border-zinc-250 py-0.5 text-zinc-800 focus:outline-none focus:border-[#1572FE] text-[11px]"
                                                />
                                              </div>
                                              <div className="flex flex-col gap-0.5">
                                                <span className="text-zinc-400 text-[10px]">Nationality:</span>
                                                <input
                                                  type="text"
                                                  value={row.nationality || ""}
                                                  placeholder="—"
                                                  onChange={(e) => handleUpdateRowField(idx, "nationality", e.target.value)}
                                                  className="w-full bg-transparent border-b border-zinc-250 py-0.5 text-zinc-800 focus:outline-none focus:border-[#1572FE] text-[11px]"
                                                />
                                              </div>
                                              <div className="flex flex-col gap-0.5">
                                                <span className="text-zinc-400 text-[10px]">Religion:</span>
                                                <input
                                                  type="text"
                                                  value={row.religion || ""}
                                                  placeholder="—"
                                                  onChange={(e) => handleUpdateRowField(idx, "religion", e.target.value)}
                                                  className="w-full bg-transparent border-b border-zinc-250 py-0.5 text-zinc-800 focus:outline-none focus:border-[#1572FE] text-[11px]"
                                                />
                                              </div>
                                              <div className="flex flex-col gap-0.5">
                                                <span className="text-zinc-400 text-[10px]">Caste:</span>
                                                <input
                                                  type="text"
                                                  value={row.caste || ""}
                                                  placeholder="—"
                                                  onChange={(e) => handleUpdateRowField(idx, "caste", e.target.value)}
                                                  className="w-full bg-transparent border-b border-zinc-250 py-0.5 text-zinc-800 focus:outline-none focus:border-[#1572FE] text-[11px]"
                                                />
                                              </div>
                                              <div className="flex flex-col gap-0.5">
                                                <span className="text-zinc-400 text-[10px]">Sub Caste:</span>
                                                <input
                                                  type="text"
                                                  value={row.sub_caste || ""}
                                                  placeholder="—"
                                                  onChange={(e) => handleUpdateRowField(idx, "sub_caste", e.target.value)}
                                                  className="w-full bg-transparent border-b border-zinc-250 py-0.5 text-zinc-800 focus:outline-none focus:border-[#1572FE] text-[11px]"
                                                />
                                              </div>
                                              <div className="flex flex-col gap-0.5">
                                                <span className="text-zinc-400 text-[10px]">Height (cm):</span>
                                                <input
                                                  type="text"
                                                  value={row.height || ""}
                                                  placeholder="—"
                                                  onChange={(e) => handleUpdateRowField(idx, "height", e.target.value)}
                                                  className="w-full bg-transparent border-b border-zinc-250 py-0.5 text-zinc-800 focus:outline-none focus:border-[#1572FE] text-[11px]"
                                                />
                                              </div>
                                              <div className="flex flex-col gap-0.5">
                                                <span className="text-zinc-400 text-[10px]">Weight (kg):</span>
                                                <input
                                                  type="text"
                                                  value={row.weight || ""}
                                                  placeholder="—"
                                                  onChange={(e) => handleUpdateRowField(idx, "weight", e.target.value)}
                                                  className="w-full bg-transparent border-b border-zinc-250 py-0.5 text-zinc-800 focus:outline-none focus:border-[#1572FE] text-[11px]"
                                                />
                                              </div>
                                              <div className="flex flex-col gap-0.5">
                                                <span className="text-zinc-400 text-[10px]">Handicap:</span>
                                                <select
                                                  value={row.handicap ? "true" : "false"}
                                                  onChange={(e) => handleUpdateRowField(idx, "handicap", e.target.value === "true")}
                                                  className="w-full bg-transparent border-b border-zinc-250 py-0.5 text-zinc-800 focus:outline-none focus:border-[#1572FE] text-[11px]"
                                                >
                                                  <option value="false">No</option>
                                                  <option value="true">Yes</option>
                                                </select>
                                              </div>
                                            </div>
                                          </div>

                                          {/* Section 2: Contact & Address */}
                                          <div className="space-y-2.5">
                                            <h5 className="font-semibold text-zinc-800 border-b border-zinc-200/60 pb-1 flex items-center gap-1.5 text-xs">
                                              🏠 Contact & Address Info
                                            </h5>
                                            <div className="space-y-2">
                                              <div className="flex flex-col gap-0.5">
                                                <span className="text-zinc-400 text-[10px]">Alt Phones:</span>
                                                <input
                                                  type="text"
                                                  value={row.phones || ""}
                                                  placeholder="—"
                                                  onChange={(e) => handleUpdateRowField(idx, "phones", e.target.value)}
                                                  className="w-full bg-transparent border-b border-zinc-250 py-0.5 text-zinc-800 focus:outline-none focus:border-[#1572FE] text-[11px]"
                                                />
                                              </div>
                                              <div className="flex flex-col gap-0.5">
                                                <span className="text-zinc-400 text-[10px]">Address:</span>
                                                <textarea
                                                  value={row.address || ""}
                                                  placeholder="—"
                                                  rows={2}
                                                  onChange={(e) => handleUpdateRowField(idx, "address", e.target.value)}
                                                  className="w-full bg-transparent border border-zinc-250 rounded p-1 text-zinc-800 focus:outline-none focus:border-[#1572FE] text-[11px] resize-none"
                                                />
                                              </div>
                                              <div className="grid grid-cols-2 gap-x-2 gap-y-2">
                                                <div className="flex flex-col gap-0.5">
                                                  <span className="text-zinc-400 text-[10px]">Colony/Area:</span>
                                                  <input
                                                    type="text"
                                                    value={row.colony || ""}
                                                    placeholder="—"
                                                    onChange={(e) => handleUpdateRowField(idx, "colony", e.target.value)}
                                                    className="w-full bg-transparent border-b border-zinc-250 py-0.5 text-zinc-800 focus:outline-none focus:border-[#1572FE] text-[11px]"
                                                  />
                                                </div>
                                                <div className="flex flex-col gap-0.5">
                                                  <span className="text-zinc-400 text-[10px]">Distance (km):</span>
                                                  <input
                                                    type="text"
                                                    value={row.distance || ""}
                                                    placeholder="—"
                                                    onChange={(e) => handleUpdateRowField(idx, "distance", e.target.value)}
                                                    className="w-full bg-transparent border-b border-zinc-250 py-0.5 text-zinc-800 focus:outline-none focus:border-[#1572FE] text-[11px]"
                                                  />
                                                </div>
                                                <div className="flex flex-col gap-0.5">
                                                  <span className="text-zinc-400 text-[10px]">Taluka:</span>
                                                  <input
                                                    type="text"
                                                    value={row.taluka || ""}
                                                    placeholder="—"
                                                    onChange={(e) => handleUpdateRowField(idx, "taluka", e.target.value)}
                                                    className="w-full bg-transparent border-b border-zinc-250 py-0.5 text-zinc-800 focus:outline-none focus:border-[#1572FE] text-[11px]"
                                                  />
                                                </div>
                                                <div className="flex flex-col gap-0.5">
                                                  <span className="text-zinc-400 text-[10px]">District:</span>
                                                  <input
                                                    type="text"
                                                    value={row.dist || ""}
                                                    placeholder="—"
                                                    onChange={(e) => handleUpdateRowField(idx, "dist", e.target.value)}
                                                    className="w-full bg-transparent border-b border-zinc-250 py-0.5 text-zinc-800 focus:outline-none focus:border-[#1572FE] text-[11px]"
                                                  />
                                                </div>
                                                <div className="flex flex-col gap-0.5">
                                                  <span className="text-zinc-400 text-[10px]">State:</span>
                                                  <input
                                                    type="text"
                                                    value={row.state || ""}
                                                    placeholder="—"
                                                    onChange={(e) => handleUpdateRowField(idx, "state", e.target.value)}
                                                    className="w-full bg-transparent border-b border-zinc-250 py-0.5 text-zinc-800 focus:outline-none focus:border-[#1572FE] text-[11px]"
                                                  />
                                                </div>
                                                <div className="flex flex-col gap-0.5">
                                                  <span className="text-zinc-400 text-[10px]">Country:</span>
                                                  <input
                                                    type="text"
                                                    value={row.country || ""}
                                                    placeholder="—"
                                                    onChange={(e) => handleUpdateRowField(idx, "country", e.target.value)}
                                                    className="w-full bg-transparent border-b border-zinc-250 py-0.5 text-zinc-800 focus:outline-none focus:border-[#1572FE] text-[11px]"
                                                  />
                                                </div>
                                              </div>
                                            </div>
                                          </div>

                                          {/* Section 3: Family details */}
                                          <div className="space-y-2.5">
                                            <h5 className="font-semibold text-zinc-800 border-b border-zinc-200/60 pb-1 flex items-center gap-1.5 text-xs">
                                              👪 Parent / Guardian Info
                                            </h5>
                                            <div className="space-y-2">
                                              <div className="flex flex-col gap-0.5">
                                                <span className="text-zinc-400 text-[10px]">Father Name:</span>
                                                <input
                                                  type="text"
                                                  value={row.father_name || ""}
                                                  placeholder="—"
                                                  onChange={(e) => handleUpdateRowField(idx, "father_name", e.target.value)}
                                                  className="w-full bg-transparent border-b border-zinc-250 py-0.5 text-zinc-800 focus:outline-none focus:border-[#1572FE] text-[11px]"
                                                />
                                              </div>
                                              <div className="grid grid-cols-2 gap-x-2 gap-y-2">
                                                <div className="flex flex-col gap-0.5">
                                                  <span className="text-zinc-400 text-[10px]">Father Occ:</span>
                                                  <input
                                                    type="text"
                                                    value={row.father_occupation || ""}
                                                    placeholder="—"
                                                    onChange={(e) => handleUpdateRowField(idx, "father_occupation", e.target.value)}
                                                    className="w-full bg-transparent border-b border-zinc-250 py-0.5 text-zinc-800 focus:outline-none focus:border-[#1572FE] text-[11px]"
                                                  />
                                                </div>
                                                <div className="flex flex-col gap-0.5">
                                                  <span className="text-zinc-400 text-[10px]">Father Qual:</span>
                                                  <input
                                                    type="text"
                                                    value={row.father_qualification || ""}
                                                    placeholder="—"
                                                    onChange={(e) => handleUpdateRowField(idx, "father_qualification", e.target.value)}
                                                    className="w-full bg-transparent border-b border-zinc-250 py-0.5 text-zinc-800 focus:outline-none focus:border-[#1572FE] text-[11px]"
                                                  />
                                                </div>
                                                <div className="col-span-2 flex flex-col gap-0.5">
                                                  <span className="text-zinc-400 text-[10px]">Father UID (Aadhar):</span>
                                                  <input
                                                    type="text"
                                                    value={row.father_uid_no || ""}
                                                    placeholder="—"
                                                    onChange={(e) => handleUpdateRowField(idx, "father_uid_no", e.target.value)}
                                                    className="w-full bg-transparent border-b border-zinc-250 py-0.5 text-zinc-800 focus:outline-none focus:border-[#1572FE] text-[11px]"
                                                  />
                                                </div>
                                              </div>
                                              
                                              <div className="border-t border-zinc-200/60 my-1.5 pt-1.5 space-y-2">
                                                <div className="flex flex-col gap-0.5">
                                                  <span className="text-zinc-400 text-[10px]">Mother Name:</span>
                                                  <input
                                                    type="text"
                                                    value={row.mother_name || ""}
                                                    placeholder="—"
                                                    onChange={(e) => handleUpdateRowField(idx, "mother_name", e.target.value)}
                                                    className="w-full bg-transparent border-b border-zinc-250 py-0.5 text-zinc-800 focus:outline-none focus:border-[#1572FE] text-[11px]"
                                                  />
                                                </div>
                                                <div className="grid grid-cols-2 gap-x-2 gap-y-2">
                                                  <div className="flex flex-col gap-0.5">
                                                    <span className="text-zinc-400 text-[10px]">Mother Occ:</span>
                                                    <input
                                                      type="text"
                                                      value={row.mother_occupation || ""}
                                                      placeholder="—"
                                                      onChange={(e) => handleUpdateRowField(idx, "mother_occupation", e.target.value)}
                                                      className="w-full bg-transparent border-b border-zinc-250 py-0.5 text-zinc-800 focus:outline-none focus:border-[#1572FE] text-[11px]"
                                                    />
                                                  </div>
                                                  <div className="flex flex-col gap-0.5">
                                                    <span className="text-zinc-400 text-[10px]">Mother Qual:</span>
                                                    <input
                                                      type="text"
                                                      value={row.mother_qualification || ""}
                                                      placeholder="—"
                                                      onChange={(e) => handleUpdateRowField(idx, "mother_qualification", e.target.value)}
                                                      className="w-full bg-transparent border-b border-zinc-250 py-0.5 text-zinc-800 focus:outline-none focus:border-[#1572FE] text-[11px]"
                                                    />
                                                  </div>
                                                  <div className="col-span-2 flex flex-col gap-0.5">
                                                    <span className="text-zinc-400 text-[10px]">Mother UID (Aadhar):</span>
                                                    <input
                                                      type="text"
                                                      value={row.mother_uid_no || ""}
                                                      placeholder="—"
                                                      onChange={(e) => handleUpdateRowField(idx, "mother_uid_no", e.target.value)}
                                                      className="w-full bg-transparent border-b border-zinc-250 py-0.5 text-zinc-800 focus:outline-none focus:border-[#1572FE] text-[11px]"
                                                    />
                                                  </div>
                                                </div>
                                              </div>

                                              <div className="border-t border-zinc-200/60 my-1.5 pt-1.5 grid grid-cols-2 gap-x-2 gap-y-2">
                                                <div className="flex flex-col gap-0.5">
                                                  <span className="text-zinc-400 text-[10px]">Mother Tongue:</span>
                                                  <input
                                                    type="text"
                                                    value={row.mother_tongue || ""}
                                                    placeholder="—"
                                                    onChange={(e) => handleUpdateRowField(idx, "mother_tongue", e.target.value)}
                                                    className="w-full bg-transparent border-b border-zinc-250 py-0.5 text-zinc-800 focus:outline-none focus:border-[#1572FE] text-[11px]"
                                                  />
                                                </div>
                                                <div className="flex flex-col gap-0.5">
                                                  <span className="text-zinc-400 text-[10px]">Guardian Name:</span>
                                                  <input
                                                    type="text"
                                                    value={row.guardian || ""}
                                                    placeholder="—"
                                                    onChange={(e) => handleUpdateRowField(idx, "guardian", e.target.value)}
                                                    className="w-full bg-transparent border-b border-zinc-250 py-0.5 text-zinc-800 focus:outline-none focus:border-[#1572FE] text-[11px]"
                                                  />
                                                </div>
                                                <div className="flex flex-col gap-0.5">
                                                  <span className="text-zinc-400 text-[10px]">Sibling Details:</span>
                                                  <input
                                                    type="text"
                                                    value={row.sibling || ""}
                                                    placeholder="—"
                                                    onChange={(e) => handleUpdateRowField(idx, "sibling", e.target.value)}
                                                    className="w-full bg-transparent border-b border-zinc-250 py-0.5 text-zinc-800 focus:outline-none focus:border-[#1572FE] text-[11px]"
                                                  />
                                                </div>
                                                <div className="flex flex-col gap-0.5">
                                                  <span className="text-zinc-400 text-[10px]">Single Parent:</span>
                                                  <select
                                                    value={row.single_parent ? "true" : "false"}
                                                    onChange={(e) => handleUpdateRowField(idx, "single_parent", e.target.value === "true")}
                                                    className="w-full bg-transparent border-b border-zinc-250 py-0.5 text-zinc-800 focus:outline-none focus:border-[#1572FE] text-[11px]"
                                                  >
                                                    <option value="false">No</option>
                                                    <option value="true">Yes</option>
                                                  </select>
                                                </div>
                                                <div className="flex flex-col gap-0.5">
                                                  <span className="text-zinc-400 text-[10px]">Orphan:</span>
                                                  <select
                                                    value={row.orphan ? "true" : "false"}
                                                    onChange={(e) => handleUpdateRowField(idx, "orphan", e.target.value === "true")}
                                                    className="w-full bg-transparent border-b border-zinc-250 py-0.5 text-zinc-800 focus:outline-none focus:border-[#1572FE] text-[11px]"
                                                  >
                                                    <option value="false">No</option>
                                                    <option value="true">Yes</option>
                                                  </select>
                                                </div>
                                              </div>
                                            </div>
                                          </div>

                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-zinc-200/60 mt-4 pt-4">
                                          {/* Academic History */}
                                          <div className="space-y-2.5">
                                            <h5 className="font-semibold text-zinc-800 border-b border-zinc-200/60 pb-1 flex items-center gap-1.5 text-xs">
                                              🎓 Academic & Schooling Records
                                            </h5>
                                            <div className="grid grid-cols-2 gap-x-2 gap-y-2">
                                              <div className="flex flex-col gap-0.5">
                                                <span className="text-zinc-400 text-[10px]">Admit in Class:</span>
                                                <input
                                                  type="text"
                                                  value={row.admit_in_class || ""}
                                                  placeholder="—"
                                                  onChange={(e) => handleUpdateRowField(idx, "admit_in_class", e.target.value)}
                                                  className="w-full bg-transparent border-b border-zinc-250 py-0.5 text-zinc-800 focus:outline-none focus:border-[#1572FE] text-[11px]"
                                                />
                                              </div>
                                              <div className="flex flex-col gap-0.5">
                                                <span className="text-zinc-400 text-[10px]">Last Class:</span>
                                                <input
                                                  type="text"
                                                  value={row.last_class || ""}
                                                  placeholder="—"
                                                  onChange={(e) => handleUpdateRowField(idx, "last_class", e.target.value)}
                                                  className="w-full bg-transparent border-b border-zinc-250 py-0.5 text-zinc-800 focus:outline-none focus:border-[#1572FE] text-[11px]"
                                                />
                                              </div>
                                              <div className="col-span-2 flex flex-col gap-0.5">
                                                <span className="text-zinc-400 text-[10px]">Last School Attended:</span>
                                                <input
                                                  type="text"
                                                  value={row.last_school_attended || ""}
                                                  placeholder="—"
                                                  onChange={(e) => handleUpdateRowField(idx, "last_school_attended", e.target.value)}
                                                  className="w-full bg-transparent border-b border-zinc-250 py-0.5 text-zinc-800 focus:outline-none focus:border-[#1572FE] text-[11px]"
                                                />
                                              </div>
                                              <div className="flex flex-col gap-0.5">
                                                <span className="text-zinc-400 text-[10px]">Admission Date:</span>
                                                <input
                                                  type="text"
                                                  value={row.admission_date || ""}
                                                  placeholder="—"
                                                  onChange={(e) => handleUpdateRowField(idx, "admission_date", e.target.value)}
                                                  className="w-full bg-transparent border-b border-zinc-250 py-0.5 text-zinc-800 focus:outline-none focus:border-[#1572FE] text-[11px]"
                                                />
                                              </div>
                                              <div className="flex flex-col gap-0.5">
                                                <span className="text-zinc-400 text-[10px]">Progress:</span>
                                                <input
                                                  type="text"
                                                  value={row.progress || ""}
                                                  placeholder="—"
                                                  onChange={(e) => handleUpdateRowField(idx, "progress", e.target.value)}
                                                  className="w-full bg-transparent border-b border-zinc-250 py-0.5 text-zinc-800 focus:outline-none focus:border-[#1572FE] text-[11px]"
                                                />
                                              </div>
                                              <div className="flex flex-col gap-0.5">
                                                <span className="text-zinc-400 text-[10px]">Conduct:</span>
                                                <input
                                                  type="text"
                                                  value={row.conduct || ""}
                                                  placeholder="—"
                                                  onChange={(e) => handleUpdateRowField(idx, "conduct", e.target.value)}
                                                  className="w-full bg-transparent border-b border-zinc-250 py-0.5 text-zinc-800 focus:outline-none focus:border-[#1572FE] text-[11px]"
                                                />
                                              </div>
                                              <div className="flex flex-col gap-0.5">
                                                <span className="text-zinc-400 text-[10px]">Leaving Date:</span>
                                                <input
                                                  type="text"
                                                  value={row.leaving_date || ""}
                                                  placeholder="—"
                                                  onChange={(e) => handleUpdateRowField(idx, "leaving_date", e.target.value)}
                                                  className="w-full bg-transparent border-b border-zinc-250 py-0.5 text-zinc-800 focus:outline-none focus:border-[#1572FE] text-[11px]"
                                                />
                                              </div>
                                              <div className="col-span-2 flex flex-col gap-0.5">
                                                <span className="text-zinc-400 text-[10px]">Reason for Leaving:</span>
                                                <input
                                                  type="text"
                                                  value={row.reason_for_leaving || ""}
                                                  placeholder="—"
                                                  onChange={(e) => handleUpdateRowField(idx, "reason_for_leaving", e.target.value)}
                                                  className="w-full bg-transparent border-b border-zinc-250 py-0.5 text-zinc-800 focus:outline-none focus:border-[#1572FE] text-[11px]"
                                                />
                                              </div>
                                              <div className="col-span-2 flex flex-col gap-0.5">
                                                <span className="text-zinc-400 text-[10px]">Remarks:</span>
                                                <input
                                                  type="text"
                                                  value={row.remarks || ""}
                                                  placeholder="—"
                                                  onChange={(e) => handleUpdateRowField(idx, "remarks", e.target.value)}
                                                  className="w-full bg-transparent border-b border-zinc-250 py-0.5 text-zinc-800 focus:outline-none focus:border-[#1572FE] text-[11px]"
                                                />
                                              </div>
                                            </div>
                                          </div>

                                          {/* Identifiers & Security */}
                                          <div className="space-y-2.5">
                                            <h5 className="font-semibold text-zinc-800 border-b border-zinc-200/60 pb-1 flex items-center gap-1.5 text-xs">
                                              🛡️ Registry Identifiers & Devices
                                            </h5>
                                            <div className="grid grid-cols-2 gap-x-2 gap-y-2">
                                              <div className="flex flex-col gap-0.5">
                                                <span className="text-zinc-400 text-[10px]">Aadhar No:</span>
                                                <input
                                                  type="text"
                                                  value={row.aadhar_number || ""}
                                                  placeholder="—"
                                                  onChange={(e) => handleUpdateRowField(idx, "aadhar_number", e.target.value)}
                                                  className="w-full bg-transparent border-b border-zinc-250 py-0.5 text-zinc-800 focus:outline-none focus:border-[#1572FE] text-[11px]"
                                                />
                                              </div>
                                              <div className="flex flex-col gap-0.5">
                                                <span className="text-zinc-400 text-[10px]">APAAR ID:</span>
                                                <input
                                                  type="text"
                                                  value={row.aapar_id || ""}
                                                  placeholder="—"
                                                  onChange={(e) => handleUpdateRowField(idx, "aapar_id", e.target.value)}
                                                  className="w-full bg-transparent border-b border-zinc-250 py-0.5 text-zinc-800 focus:outline-none focus:border-[#1572FE] text-[11px]"
                                                />
                                              </div>
                                              <div className="flex flex-col gap-0.5">
                                                <span className="text-zinc-400 text-[10px]">PEN Number:</span>
                                                <input
                                                  type="text"
                                                  value={row.pen_number || ""}
                                                  placeholder="—"
                                                  onChange={(e) => handleUpdateRowField(idx, "pen_number", e.target.value)}
                                                  className="w-full bg-transparent border-b border-zinc-250 py-0.5 text-zinc-800 focus:outline-none focus:border-[#1572FE] text-[11px]"
                                                />
                                              </div>
                                              <div className="flex flex-col gap-0.5">
                                                <span className="text-zinc-400 text-[10px]">SARAL ID:</span>
                                                <input
                                                  type="text"
                                                  value={row.saral_id || ""}
                                                  placeholder="—"
                                                  onChange={(e) => handleUpdateRowField(idx, "saral_id", e.target.value)}
                                                  className="w-full bg-transparent border-b border-zinc-250 py-0.5 text-zinc-800 focus:outline-none focus:border-[#1572FE] text-[11px]"
                                                />
                                              </div>
                                              <div className="col-span-2 flex flex-col gap-0.5">
                                                <span className="text-zinc-400 text-[10px]">Login Email:</span>
                                                <input
                                                  type="text"
                                                  value={row.login_email || ""}
                                                  placeholder="—"
                                                  onChange={(e) => handleUpdateRowField(idx, "login_email", e.target.value)}
                                                  className="w-full bg-transparent border-b border-zinc-250 py-0.5 text-zinc-800 focus:outline-none focus:border-[#1572FE] text-[11px]"
                                                />
                                              </div>
                                              <div className="flex flex-col gap-0.5">
                                                <span className="text-zinc-400 text-[10px]">Muman:</span>
                                                <input
                                                  type="text"
                                                  value={row.muman || ""}
                                                  placeholder="—"
                                                  onChange={(e) => handleUpdateRowField(idx, "muman", e.target.value)}
                                                  className="w-full bg-transparent border-b border-zinc-250 py-0.5 text-zinc-800 focus:outline-none focus:border-[#1572FE] text-[11px]"
                                                />
                                              </div>
                                              <div className="flex flex-col gap-0.5">
                                                <span className="text-zinc-400 text-[10px]">RFID:</span>
                                                <input
                                                  type="text"
                                                  value={row.rfid || ""}
                                                  placeholder="—"
                                                  onChange={(e) => handleUpdateRowField(idx, "rfid", e.target.value)}
                                                  className="w-full bg-transparent border-b border-zinc-250 py-0.5 text-zinc-800 focus:outline-none focus:border-[#1572FE] text-[11px]"
                                                />
                                              </div>
                                              <div className="col-span-2 flex flex-col gap-0.5">
                                                <span className="text-zinc-400 text-[10px]">QR Code:</span>
                                                <input
                                                  type="text"
                                                  value={row.qrcode || ""}
                                                  placeholder="—"
                                                  onChange={(e) => handleUpdateRowField(idx, "qrcode", e.target.value)}
                                                  className="w-full bg-transparent border-b border-zinc-250 py-0.5 text-zinc-800 focus:outline-none focus:border-[#1572FE] text-[11px]"
                                                />
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {totalPages > 1 && (
                      <div className="p-4 bg-zinc-50/50 border-t border-zinc-150 flex items-center justify-between text-xs text-zinc-550 select-none">
                        <div>
                          Showing <span className="font-semibold text-zinc-800">{((currentPage - 1) * itemsPerPage) + 1}</span> to{" "}
                          <span className="font-semibold text-zinc-800">
                            {Math.min(currentPage * itemsPerPage, parsedData.length)}
                          </span>{" "}
                          of <span className="font-semibold text-zinc-800">{parsedData.length}</span> students
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage === 1}
                            onClick={() => {
                              setCurrentPage(currentPage - 1);
                              setExpandedIndex(null);
                            }}
                            className="h-8 gap-1 font-semibold text-xs border-zinc-200"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" /> Previous
                          </Button>
                          <span className="font-medium text-zinc-650 px-2">
                            Page {currentPage} of {totalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage === totalPages}
                            onClick={() => {
                              setCurrentPage(currentPage + 1);
                              setExpandedIndex(null);
                            }}
                            className="h-8 gap-1 font-semibold text-xs border-zinc-200"
                          >
                            Next <ChevronRight className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </div>
            
            <CardFooter className="p-5 border-t border-zinc-100 bg-zinc-50/50 justify-end gap-3 shrink-0">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setParsedData([]);
                  setStatus({ type: "idle", message: "" });
                }}
                disabled={parsedData.length === 0 || status.type === "processing"}
              >
                Clear Queue
              </Button>
              <Button 
                size="sm" 
                onClick={handleIngest}
                disabled={parsedData.length === 0 || status.type === "processing"}
                className="gap-2 bg-[#1572FE] hover:bg-[#0f62d4] text-white cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" /> Save All Students to School Database
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}

