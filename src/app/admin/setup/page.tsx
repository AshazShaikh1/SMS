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
  Trash
} from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toast } from "@/components/ui/toast";
import { supabase } from "@/lib/supabase/client";

export default function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "warning" | "error" | "info" } | null>(null);

  // STEP 1: School Identity & Grade Pricing Matrix (with defaults for development)
  const [schoolName, setSchoolName] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [adminName, setAdminName] = useState("");

  // Master upload states removed - manual configuration active

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
  const [teachers, setTeachers] = useState<{ id: string; name: string; allocations: { subjectName: string; classes: string[] }[] }[]>([]);
  const [newTeacherName, setNewTeacherName] = useState("");
  const [step3Mode, setStep3Mode] = useState<"manual" | "upload">("manual");
  const [skippedRowsWarning, setSkippedRowsWarning] = useState<string[]>([]);
  const [generatedUsername, setGeneratedUsername] = useState("");
  const [generatedPIN, setGeneratedPIN] = useState("");

  // STEP 4: Robust Student Processing Terminal
  const [pastedText, setPastedText] = useState("");
  const [parsedStudents, setParsedStudents] = useState<{
    name: string;
    email: string;
    rollNumber: number;
    gradeLevel: string;
    section: string;
    parentName: string;
    parentEmail: string;
    parentPhone: string;
    repairedFields: {
      emailGenerated?: boolean;
      rollAssigned?: boolean;
      whatsappDisabled?: boolean;
    };
    baseFee: number;
  }[]>([]);



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
    setTeachers([
      ...teachers,
      {
        id: `teach-${crypto.randomUUID()}`,
        name: activeName,
        allocations: [],
      },
    ]);
    setNewTeacherName("");
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setPastedText(text);
      parseRosterData(text);
    };
    reader.readAsText(file);
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
      setStep(5);

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
        {step < 5 && (
          <div className="flex flex-col items-center gap-2 mb-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#064e3b] flex items-center justify-center text-white font-bold shadow-md">
              S
            </div>
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">School Setup Wizard</span>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 flex items-center justify-center gap-1.5">
              <Sparkles className="w-5 h-5 text-emerald-800" /> Register Your School
            </h2>
          </div>
        )}
        
        {/* Step Progress Bar */}
        {step < 5 && (
          <div className="flex justify-between items-center px-4 sm:px-12 text-xs font-semibold text-zinc-400 relative max-w-xl mx-auto pb-4">
            <div className="absolute top-[18px] left-8 right-8 border-t border-zinc-200 -translate-y-1/2 z-0" />
            {[
              { num: 1, label: "School Info" },
              { num: 2, label: "Classes" },
              { num: 3, label: "Teachers" },
              { num: 4, label: "Students" }
            ].map((sObj) => (
              <div key={sObj.num} className="relative z-10 flex flex-col items-center gap-1">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center border font-bold transition-all duration-300 ${
                    step >= sObj.num
                      ? "bg-[#064e3b] border-[#064e3b] text-white shadow-sm"
                      : "bg-white border-zinc-200 text-zinc-400"
                  }`}
                >
                  {step > sObj.num ? "✓" : sObj.num}
                </div>
                <span className={`text-[9px] sm:text-[10px] uppercase tracking-wider font-bold ${step === sObj.num ? "text-[#064e3b]" : "text-zinc-400"}`}>
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
            <div className="p-4 text-xs bg-emerald-50 border-b border-emerald-200 text-[#064e3b] font-medium animate-fade-in flex items-center gap-1.5 rounded-t-2xl">
              <CheckCircle2 className="w-4.5 h-4.5 text-emerald-700" />
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
                  Step 1: School Details & Annual Fees
                </CardTitle>
                <CardDescription className="text-xs">
                  Configure your school details and pricing manually.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-6">
                <div className="space-y-6">
                  {/* Identity Form */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-800">School Name</label>
                      <Input
                        value={schoolName}
                        onChange={(e) => setSchoolName(e.target.value)}
                        placeholder="e.g. Antigravity Academy"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-800">Academic Year</label>
                      <Input
                        value={academicYear}
                        onChange={(e) => setAcademicYear(e.target.value)}
                        placeholder="e.g. 2026-2027"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-800">Admin Owner Name</label>
                      <Input
                        value={adminName}
                        onChange={(e) => setAdminName(e.target.value)}
                        placeholder="e.g. Ashaz Shaikh"
                      />
                    </div>
                  </div>

                  {/* Grade Pricing Matrix with Add/Remove options */}
                  <div className="border-t border-zinc-150 pt-4 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                          Annual Fees per Grade
                        </span>
                        <p className="text-[11px] text-zinc-450 mt-0.5">
                          Set the yearly fee for each grade. Enter numbers only.
                        </p>
                      </div>

                      {/* Add Custom Grade Panel Inline */}
                      <div className="flex items-center gap-1.5 sm:gap-2 bg-zinc-50 p-2 rounded-xl border border-zinc-200 w-full sm:w-auto justify-between sm:justify-start">
                        <Input
                          value={newGradeName}
                          onChange={(e) => setNewGradeName(e.target.value)}
                          placeholder="Grade 11"
                          className="h-8 text-xs max-w-[90px] flex-1 sm:flex-none"
                        />
                        <Input
                          value={newGradeFee}
                          onChange={(e) => setNewGradeFee(e.target.value)}
                          placeholder="Fee"
                          className="h-8 text-xs max-w-[80px] flex-1 sm:flex-none"
                        />
                        <Button
                          type="button"
                          onClick={handleAddGrade}
                          size="sm"
                          className="h-8 px-2.5 bg-[#064e3b] hover:bg-[#0f766e] text-white flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add
                        </Button>
                      </div>
                    </div>

                    <div className="overflow-x-auto border border-zinc-200 rounded-xl bg-white">
                      <table className="min-w-full divide-y divide-zinc-200 text-left text-xs">
                        <thead className="bg-zinc-50/70 text-zinc-500 font-bold uppercase tracking-wider">
                          <tr>
                            <th className="px-4 py-3">Grade Level</th>
                            <th className="px-4 py-3">Base Tuition (₹)</th>
                            <th className="px-4 py-3">Extra Charge (₹)</th>
                            <th className="px-4 py-3">Discount (%)</th>
                            <th className="px-4 py-3 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 text-zinc-800">
                          {gradeFees.map((gf, index) => {
                            const hasFeeError = !!feeErrors[gf.grade];
                            const hasExtraError = !!extraErrors[gf.grade];
                            const hasDiscountError = !!discountErrors[gf.grade];

                            return (
                              <tr key={gf.grade} className="hover:bg-zinc-50/20">
                                <td className="px-4 py-2.5 font-bold text-zinc-900">{gf.grade}</td>
                                <td className="px-4 py-2.5">
                                  <div className="relative">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400 font-semibold">₹</span>
                                    <Input
                                      type="text"
                                      value={gf.fee === 0 ? "" : gf.fee}
                                      onChange={(e) => handleFeeChange(index, e.target.value)}
                                      className={`pl-5 h-8 text-xs font-semibold max-w-[120px] ${
                                        hasFeeError ? "border-[#EF4444] focus:border-[#EF4444] focus:ring-[#EF4444]/20 bg-red-50" : ""
                                      }`}
                                      placeholder="0"
                                    />
                                  </div>
                                </td>
                                <td className="px-4 py-2.5">
                                  <div className="relative">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400 font-semibold">₹</span>
                                    <Input
                                      type="text"
                                      value={gf.extraCharge === 0 ? "" : gf.extraCharge}
                                      onChange={(e) => handleExtraChange(index, e.target.value)}
                                      className={`pl-5 h-8 text-xs font-semibold max-w-[120px] ${
                                        hasExtraError ? "border-[#EF4444] focus:border-[#EF4444] focus:ring-[#EF4444]/20 bg-red-50" : ""
                                      }`}
                                      placeholder="0"
                                    />
                                  </div>
                                </td>
                                <td className="px-4 py-2.5">
                                  <div className="relative flex items-center max-w-[80px]">
                                    <Input
                                      type="text"
                                      value={gf.discount === 0 ? "" : gf.discount}
                                      onChange={(e) => handleDiscountChange(index, e.target.value)}
                                      className={`h-8 text-xs font-semibold w-full pr-5 ${
                                        hasDiscountError ? "border-[#EF4444] focus:border-[#EF4444] focus:ring-[#EF4444]/20 bg-red-50" : ""
                                      }`}
                                      placeholder="0"
                                    />
                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 font-semibold">%</span>
                                  </div>
                                </td>
                                <td className="px-4 py-2.5 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveGrade(gf.grade)}
                                    className="p-1.5 rounded-lg border border-zinc-200 hover:bg-red-50 hover:text-red-650 text-zinc-400 transition-colors cursor-pointer"
                                    title="Remove Grade"
                                  >
                                    <Trash className="w-3.5 h-3.5 mx-auto" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="p-4 sm:p-6 border-t border-zinc-150 bg-zinc-50/50 flex flex-col sm:flex-row gap-3.5 items-center sm:justify-between">
                <Link href="/login" className="text-xs font-semibold text-zinc-500 hover:text-zinc-850 flex items-center gap-1 order-2 sm:order-1">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
                </Link>
                <Button onClick={handleStep1Next} className="gap-1.5 bg-[#064e3b] hover:bg-[#0f766e] active:bg-[#115e59] w-full sm:w-auto order-1 sm:order-2 justify-center cursor-pointer">
                  Next: Section Matrix <ArrowRight className="w-3.5 h-3.5" />
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
                  Step 2: Mass Section Matrix Generator
                </CardTitle>
                <CardDescription className="text-xs">
                  Generate classroom divisions in bulk. Add or remove active section columns.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-6">
                
                {/* Manage Section Columns panel */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Active Columns:</span>
                    {sectionsList.map((sec) => (
                      <div key={sec} className="px-2 py-1 rounded bg-zinc-100 border border-zinc-200 text-xs font-bold text-zinc-700 flex items-center gap-1.5">
                        Section {sec}
                        <button
                          type="button"
                          onClick={() => handleRemoveSection(sec)}
                          className="text-zinc-400 hover:text-red-600 font-extrabold text-[10px] pl-1 border-l border-zinc-200 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddSection}
                      size="sm"
                      className="h-7 px-2 border-zinc-300 text-xs text-[#064e3b] flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Section Column
                    </Button>
                  </div>

                  <label className="flex items-center gap-2 text-xs font-bold text-zinc-700 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded border-zinc-300 text-[#064e3b] focus:ring-[#064e3b]"
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                    Select All Sections
                  </label>
                </div>

                {/* Matrix Table with horizontal scroll wrapper */}
                <div className="overflow-x-auto border border-zinc-200 rounded-xl bg-white">
                  <div className="min-w-[500px] divide-y divide-zinc-200">
                    {/* Header */}
                    <div className="flex p-3 bg-zinc-50/70 text-xs font-bold text-zinc-500 items-center">
                      <div className="w-1/3 text-left pl-2">Grade Level</div>
                      <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${sectionsList.length}, minmax(0, 1fr))` }}>
                        {sectionsList.map((sec) => (
                          <div key={sec} className="text-center">Section {sec}</div>
                        ))}
                      </div>
                      <div className="w-24 text-center">Row Toggle</div>
                    </div>

                    {/* Rows */}
                    {gradeFees.map((gf) => {
                      const gradeKey = gf.grade;
                      const sections = matrix[gradeKey] || {};
                      const allChecked = sectionsList.every((sec) => sections[sec]);

                      return (
                        <div key={gradeKey} className="flex p-3 items-center text-xs text-zinc-800 hover:bg-zinc-50/30">
                          <div className="w-1/3 text-left font-bold pl-2 text-zinc-900">{gradeKey}</div>
                          <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${sectionsList.length}, minmax(0, 1fr))` }}>
                            {sectionsList.map((sec) => (
                              <div key={sec} className="flex justify-center">
                                <input
                                  type="checkbox"
                                  checked={!!sections[sec]}
                                  onChange={(e) => handleToggleCell(gradeKey, sec, e.target.checked)}
                                  className="w-4.5 h-4.5 rounded border-zinc-300 text-[#064e3b] focus:ring-[#064e3b] cursor-pointer"
                                />
                              </div>
                            ))}
                          </div>
                          <div className="w-24 flex justify-center">
                            <label className="flex items-center gap-1 text-[10px] font-bold text-zinc-500 cursor-pointer hover:text-zinc-800">
                              <input
                                type="checkbox"
                                checked={allChecked}
                                onChange={(e) => handleSelectAllForGrade(gradeKey, e.target.checked)}
                                className="rounded border-zinc-300 text-[#064e3b] focus:ring-[#064e3b]"
                              />
                              All
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-center pt-2">
                  <Button
                    type="button"
                    onClick={handleGenerateStructure}
                    className="w-full sm:w-auto px-6 py-2 bg-[#064e3b] hover:bg-[#0f766e] active:bg-[#115e59] text-white rounded-xl shadow font-semibold text-xs flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4 text-[#ecfdf5]" /> Generate School Structure ({preparedClasses.length} Classrooms)
                  </Button>
                </div>

                {/* Structured scrollable Preview */}
                {preparedClasses.length > 0 && (
                  <div className="space-y-3 pt-4 border-t border-zinc-150">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                      Active Classrooms Generated Preview
                    </span>

                    {/* Isolated scrollable column view (One Row Per Grade) */}
                    <div className="max-h-60 overflow-y-auto border border-zinc-200 rounded-xl p-3 bg-white divide-y divide-zinc-150">
                      {Object.entries(groupedClassesByGrade).map(([grade, sections]) => (
                        <div key={grade} className="py-2.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                          <span className="font-bold text-zinc-800 min-w-[120px]">{grade}</span>
                          <div className="flex flex-wrap gap-1.5 flex-1 justify-start">
                            {sections.map((sec) => (
                              <span key={sec} className="px-2 py-0.5 rounded-md bg-[#ecfdf5] border border-[#064e3b]/10 text-[#064e3b] font-bold text-[10px]">
                                Section {sec}
                              </span>
                            ))}
                          </div>
                          <span className="text-[11px] font-semibold text-zinc-400">
                            ₹{(gradeFees.find((f) => f.grade === grade)?.fee || 0).toLocaleString("en-IN")} Base Fee
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="p-4 sm:p-6 border-t border-zinc-150 bg-zinc-50/50 flex flex-col sm:flex-row justify-between gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="gap-1.5 w-full sm:w-auto">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </Button>
                <Button onClick={handleStep2Next} className="gap-1.5 bg-[#064e3b] hover:bg-[#0f766e] active:bg-[#115e59] w-full sm:w-auto">
                  Next: Faculty Roster <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </CardFooter>
            </div>
          )}

          {/* ==================================================================
              STEP 3: GLOBAL FACULTY BULK SPREADSHEET GRID
              ================================================================== */}
          {step === 3 && (
            <div>
              <CardHeader className="p-4 sm:p-6 border-b border-zinc-150">
                <CardTitle className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-zinc-500">
                  Step 3: Global Faculty Roster & Allocations
                </CardTitle>
                <CardDescription className="text-xs">
                  Onboard teachers, define subjects, and allocate class divisions.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-6">
                {/* Tab Toggle for Step 3 Mode */}
                <div className="flex border-b border-zinc-200">
                  <button
                    type="button"
                    onClick={() => setStep3Mode("manual")}
                    className={`flex-1 pb-3 text-center text-xs font-bold border-b-2 transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      step3Mode === "manual"
                        ? "border-[#064e3b] text-[#064e3b]"
                        : "border-transparent text-zinc-400 hover:text-zinc-650"
                    }`}
                  >
                    ✍️ Add Manually
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep3Mode("upload")}
                    className={`flex-1 pb-3 text-center text-xs font-bold border-b-2 transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      step3Mode === "upload"
                        ? "border-[#064e3b] text-[#064e3b]"
                        : "border-transparent text-zinc-400 hover:text-zinc-650"
                    }`}
                  >
                    📄 Upload File
                  </button>
                </div>

                {step3Mode === "manual" ? (
                  <div className="space-y-6">
                    {/* Quick Add Teacher Bar */}
                    <div className="flex flex-col sm:flex-row gap-3 items-end border border-zinc-200 rounded-xl p-4 bg-zinc-50/20">
                      <div className="flex-1 w-full space-y-1.5">
                        <label className="text-xs font-bold text-zinc-800">Teacher Full Name</label>
                        <Input
                          value={newTeacherName}
                          onChange={(e) => setNewTeacherName(e.target.value)}
                          placeholder="e.g. Mrs. Susan Smith"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddTeacher();
                            }
                          }}
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={handleAddTeacher}
                        className="bg-[#064e3b] hover:bg-[#0f766e] text-white font-semibold h-10 px-5 flex items-center gap-1.5 w-full sm:w-auto"
                      >
                        <Plus className="w-4 h-4" /> Add Teacher
                      </Button>
                    </div>

                    {/* Teachers Card List */}
                    <div className="space-y-4">
                      {teachers.length === 0 ? (
                        <div className="text-center p-8 text-zinc-400 text-xs font-medium border border-zinc-200 rounded-xl bg-white">
                          No teachers added to the roster yet. Add a teacher above.
                        </div>
                      ) : (
                        teachers.map((teacher) => (
                          <Card key={teacher.id} className="border border-zinc-200 shadow-xs rounded-xl overflow-hidden bg-white">
                            <CardHeader className="p-3 bg-zinc-50/30 border-b border-zinc-150 flex flex-row items-center justify-between gap-4">
                              <div className="flex-1">
                                <input
                                  type="text"
                                  value={teacher.name}
                                  onChange={(e) => handleUpdateTeacherName(teacher.id, e.target.value)}
                                  className="w-full bg-transparent border-b border-transparent hover:border-zinc-300 focus:border-[#064e3b] font-bold text-zinc-800 p-1 outline-none text-xs"
                                  placeholder="Teacher Name"
                                />
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleRemoveTeacher(teacher.id)}
                                className="text-red-500 hover:text-red-800 hover:bg-red-50 border-zinc-200 h-8"
                              >
                                <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete Teacher
                              </Button>
                            </CardHeader>
                            <CardContent className="p-4 space-y-4">
                              <div className="space-y-3">
                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                                  Subject Allocations
                                </span>
                                
                                {teacher.allocations.length === 0 ? (
                                  <div className="text-xs text-zinc-400 italic py-1 pl-1">
                                    No subjects assigned. Click "+ Add Subject" below.
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    {teacher.allocations.map((alloc, allocIdx) => (
                                      <div key={allocIdx} className="p-3 border border-zinc-150 rounded-lg bg-zinc-50/20 flex flex-col md:flex-row gap-4 items-start md:items-center relative">
                                        {/* Subject Input */}
                                        <div className="w-full md:w-1/4 space-y-1">
                                          <span className="text-[9px] font-bold text-zinc-400 uppercase">Subject Name</span>
                                          <Input
                                            value={alloc.subjectName}
                                            onChange={(e) => handleUpdateSubjectName(teacher.id, allocIdx, e.target.value)}
                                            placeholder="e.g. Math"
                                            className="h-8 text-xs font-semibold bg-white"
                                          />
                                        </div>
                                        
                                        {/* Tokenized Class Picker */}
                                        <div className="flex-1 space-y-1 w-full">
                                          <span className="text-[9px] font-bold text-zinc-400 uppercase">Assign Classrooms</span>
                                          <div className="flex flex-wrap gap-1.5 p-2 bg-white border border-zinc-200 rounded-lg min-h-8">
                                            {preparedClasses.length === 0 ? (
                                              <span className="text-[10px] text-zinc-400 font-medium italic">No classes available from Step 2</span>
                                            ) : (
                                              preparedClasses.map((cls) => {
                                                const classKey = `${cls.gradeKey}-${cls.section}`;
                                                const isSelected = alloc.classes.includes(classKey);
                                                return (
                                                  <button
                                                    key={classKey}
                                                    type="button"
                                                    onClick={() => handleToggleAllocationClass(teacher.id, allocIdx, classKey)}
                                                    className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                                                      isSelected
                                                        ? "bg-[#064e3b] border-[#064e3b] text-white shadow-xs"
                                                        : "bg-zinc-50 border-zinc-200 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-805"
                                                    }`}
                                                  >
                                                    {cls.gradeKey.replace("Grade ", "")}-{cls.section}
                                                  </button>
                                                );
                                              })
                                            )}
                                          </div>
                                        </div>

                                        {/* Delete allocation button */}
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveAllocation(teacher.id, allocIdx)}
                                          className="absolute top-2 right-2 md:relative md:top-auto md:right-auto p-1.5 rounded-lg border border-zinc-200 hover:bg-red-50 hover:text-red-650 text-zinc-400 transition-colors cursor-pointer"
                                          title="Remove Subject"
                                        >
                                          <Trash className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                              
                              <div className="pt-2 border-t border-zinc-100 flex justify-start">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleAddAllocation(teacher.id)}
                                  className="text-xs font-semibold text-[#064e3b] border-emerald-250 hover:bg-emerald-50 h-8 cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5 mr-1" />
                                  {teacher.allocations.length === 0 ? "Add Subject" : "Add Another Subject"}
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Inline Warning Banner for Skipped/Unresolved Rows */}
                    {skippedRowsWarning.length > 0 && (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs space-y-1.5 animate-fade-in">
                        <div className="font-bold flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                          <span>Warnings: Some classrooms could not be resolved automatically</span>
                        </div>
                        <div className="max-h-28 overflow-y-auto pl-5 list-disc space-y-1 font-mono text-[10px]">
                          {skippedRowsWarning.map((warning, idx) => (
                            <div key={idx}>{warning}</div>
                          ))}
                        </div>
                        <p className="text-[10px] text-zinc-500 mt-1 font-sans">
                          * Unresolved classrooms were set as "unassigned". You can switch to manual mode to review and assign them.
                        </p>
                      </div>
                    )}

                    {/* File Drop/Upload Area */}
                    <div className="flex flex-col justify-center items-center border border-dashed border-zinc-300 rounded-xl p-8 bg-zinc-50/30 text-center relative hover:border-[#064e3b] transition-colors">
                      <Upload className="w-10 h-10 text-zinc-400 mb-3" />
                      <span className="text-xs font-bold text-zinc-700 block">Upload spreadsheet (.xlsx, .xls, .csv)</span>
                      <span className="text-[10px] text-zinc-400 mt-1.5 block">Drag and drop file here, or click to browse</span>
                      <input
                        type="file"
                        accept=".xlsx, .xls, .csv"
                        onChange={handleFileUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </div>

                    {/* Quick Preview of Parsed Teachers */}
                    {teachers.length > 0 && (
                      <div className="space-y-3">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                          Current Faculty Matrix Preview ({teachers.length} Staged Teachers)
                        </span>
                        <div className="border border-zinc-200 rounded-xl overflow-x-auto bg-white max-h-60">
                          <table className="min-w-full divide-y divide-zinc-200 text-left text-xs">
                            <thead className="bg-zinc-50/70 text-zinc-500 font-bold uppercase tracking-wider">
                              <tr>
                                <th className="px-4 py-3">Teacher</th>
                                <th className="px-4 py-3">Subject Allocations</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-200 text-zinc-800">
                              {teachers.map((t, idx) => (
                                <tr key={t.id || idx} className="hover:bg-zinc-50/10">
                                  <td className="px-4 py-3 font-bold text-zinc-900">{t.name}</td>
                                  <td className="px-4 py-3">
                                    {t.allocations.length === 0 ? (
                                      <span className="text-zinc-400 italic">No allocations</span>
                                    ) : (
                                      <div className="space-y-1.5">
                                        {t.allocations.map((alloc, aIdx) => (
                                          <div key={aIdx} className="flex flex-wrap items-center gap-1.5 text-[11px]">
                                            <span className="font-bold text-zinc-700 bg-zinc-100 px-1.5 py-0.5 rounded">{alloc.subjectName || "Unnamed Subject"}:</span>
                                            {alloc.classes.length === 0 ? (
                                              <span className="text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded text-[10px] font-bold">unassigned</span>
                                            ) : (
                                              alloc.classes.map((cKey) => (
                                                <span key={cKey} className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                                  cKey === "unassigned" 
                                                    ? "text-amber-600 bg-amber-50 border border-amber-100" 
                                                    : "text-emerald-800 bg-emerald-50 border border-emerald-100"
                                                }`}>
                                                  {cKey.replace("Grade ", "")}
                                                </span>
                                              ))
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
              <CardFooter className="p-4 sm:p-6 border-t border-zinc-150 bg-zinc-50/50 flex flex-col sm:flex-row justify-between gap-3">
                <Button variant="outline" onClick={() => setStep(2)} className="gap-1.5 w-full sm:w-auto cursor-pointer">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </Button>
                <Button onClick={handleStep3Next} className="gap-1.5 bg-[#064e3b] hover:bg-[#0f766e] active:bg-[#115e59] w-full sm:w-auto cursor-pointer">
                  Next: Add Students <ArrowRight className="w-3.5 h-3.5" />
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
                  Step 4: Add Students
                </CardTitle>
                <CardDescription className="text-xs">
                  Copy-paste messy Excel rows. You can also skip this stage in development by clicking Complete Launch.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-6">
                
                {/* File / Paste inputs container */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                  {/* File drop zone */}
                  <div className="lg:col-span-4 flex flex-col justify-center items-center border border-dashed border-zinc-300 rounded-xl p-5 bg-zinc-50/30 text-center relative hover:border-[#064e3b] transition-colors">
                    <Upload className="w-8 h-8 text-zinc-400 mb-2" />
                    <span className="text-xs font-bold text-zinc-700 block">Drop CSV File</span>
                    <span className="text-[10px] text-zinc-400 mt-1 block">Click to upload roster sheet</span>
                    <input
                      type="file"
                      accept=".csv, .txt"
                      onChange={handleFileUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>

                  {/* Textarea paste zone */}
                  <div className="lg:col-span-8 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-zinc-800 flex items-center gap-1">
                        <Clipboard className="w-4 h-4 text-emerald-800" /> Paste from Excel or Google Sheets
                      </label>
                    </div>
                    <textarea
                      rows={5}
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                      placeholder="Name, Email, Roll, Class, Parent Name, Parent Email, Parent Phone&#10;Rahul Sharma, rahul@gmail.com, 1, 10A, Sanjay Sharma, sanjay@gmail.com, 9876543210&#10;Priya Patel, , , 9B, , , &#10;Siddharth Singh, , 3, 10A, , , "
                      className="w-full text-xs font-mono p-3 border border-zinc-200 rounded-xl focus:border-[#064e3b] focus:ring-1 focus:ring-[#064e3b] bg-white outline-none"
                    />
                  </div>
                </div>

                {/* Ingest and repair buttons */}
                <div className="flex justify-end gap-3 flex-wrap">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => parseRosterData(pastedText)}
                    className="gap-1.5 border-zinc-300 hover:border-[#064e3b] hover:bg-[#ecfdf5] text-[#064e3b] text-xs h-9"
                  >
                    <FileSpreadsheet className="w-4 h-4" /> Analyze & Auto-Repair Data
                  </Button>
                </div>

                {/* Parsed results Preview table */}
                {parsedStudents.length > 0 && (
                  <div className="space-y-3 pt-3 border-t border-zinc-150">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                        Students to Add ({parsedStudents.length} students found)
                      </span>
                    </div>

                    <div className="border border-zinc-200 rounded-xl overflow-x-auto bg-white max-h-60">
                      <table className="min-w-full divide-y divide-zinc-200 text-left text-xs">
                        <thead className="bg-zinc-50/70 text-zinc-500 font-bold uppercase tracking-wider">
                          <tr>
                            <th className="px-4 py-2">Roll</th>
                            <th className="px-4 py-2">Student</th>
                            <th className="px-4 py-2">Class</th>
                            <th className="px-4 py-2">Parent Details</th>
                            <th className="px-4 py-2">Base Fee</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 text-zinc-800">
                          {parsedStudents.map((s, index) => (
                            <tr key={index} className="hover:bg-zinc-50/20">
                              <td className="px-4 py-2.5 font-mono font-bold text-zinc-650">
                                #{s.rollNumber}
                                {s.repairedFields.rollAssigned && (
                                  <span className="ml-1 text-[8px] bg-amber-50 border border-amber-200 text-amber-700 px-1 rounded uppercase font-bold">
                                    Auto
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-2.5">
                                <div className="font-bold text-zinc-900">{s.name}</div>
                                <div className="text-[10px] text-zinc-400 mt-0.5 flex items-center gap-1.5">
                                  <span>{s.email}</span>
                                  {s.repairedFields.emailGenerated && (
                                    <span className="text-[8px] bg-emerald-50 border border-emerald-100 text-emerald-700 px-1 rounded uppercase font-bold">
                                      Auto-Email
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-2.5 font-bold text-[#064e3b]">
                                {s.gradeLevel.replace("Grade ", "")}-{s.section}
                              </td>
                              <td className="px-4 py-2.5">
                                <div className="font-semibold text-zinc-800">{s.parentName}</div>
                                <div className="text-[10px] text-zinc-500 mt-0.5 flex items-center gap-1">
                                  <span>{s.parentEmail}</span>
                                  {s.repairedFields.whatsappDisabled && (
                                    <span className="text-[8px] bg-red-50 border border-red-150 text-red-650 px-1 rounded uppercase font-bold">
                                      WhatsApp Disabled
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-2.5 font-bold">
                                ₹{s.baseFee.toLocaleString("en-IN")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="p-4 sm:p-6 border-t border-zinc-150 bg-zinc-50/50 flex flex-col sm:flex-row justify-between gap-3">
                <Button variant="outline" onClick={() => setStep(3)} className="gap-1.5 w-full sm:w-auto" disabled={loading}>
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </Button>
                
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  {parsedStudents.length === 0 && (
                    <span className="text-[11px] text-zinc-400 font-medium mr-2 hidden sm:inline">
                      (No students - will launch with classes only)
                    </span>
                  )}
                  <Button
                    onClick={handleCompleteLaunch}
                    disabled={loading}
                    className="gap-2 bg-[#064e3b] hover:bg-[#0f766e] active:bg-[#115e59] shadow-md px-6 text-white font-bold w-full sm:w-auto"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" /> Completing Launch...
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-4 h-4 text-emerald-50" /> Complete Launch
                      </>
                    )}
                  </Button>
                </div>
              </CardFooter>
            </div>
          )}

          {/* ==================================================================
              STEP 5: SIMULATED SUCCESS LAUNCH SCREEN
              ================================================================== */}
          {step === 5 && (
            <div className="p-8 text-center space-y-6 animate-fade-in">
              <div className="mx-auto w-16 h-16 rounded-full bg-[#ecfdf5] border border-[#064e3b]/20 flex items-center justify-center text-[#064e3b] shadow-sm">
                <CheckCircle2 className="w-10 h-10 text-emerald-800" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-zinc-900">School Setup Registered!</h3>
                <p className="text-xs text-zinc-500 max-w-md mx-auto">
                  Your tenant environment for <span className="font-semibold text-zinc-800">{schoolName}</span> ({academicYear}) has been initialized.
                </p>
              </div>

              {/* Credentials Highlight Block */}
              <div className="max-w-md mx-auto bg-[#ecfdf5] border border-[#064e3b]/20 rounded-2xl p-6 text-center space-y-4 shadow-xs">
                <span className="text-[10px] font-bold text-[#064e3b] uppercase tracking-widest block">ADMINISTRATOR CREDENTIALS</span>
                
                <div className="space-y-1">
                  <div className="text-[10px] uppercase font-semibold text-zinc-400">Username</div>
                  <div className="text-md font-bold text-zinc-900 font-mono select-all bg-white py-1.5 px-4 rounded-lg border border-zinc-200 inline-block">
                    {generatedUsername}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[10px] uppercase font-semibold text-zinc-400">Security PIN (Password)</div>
                  <div className="text-md font-bold text-[#064e3b] font-mono select-all bg-white py-1.5 px-4 rounded-lg border border-zinc-200 inline-block tracking-wider">
                    {generatedPIN}
                  </div>
                </div>

                <p className="text-[10px] text-zinc-500 max-w-xs mx-auto leading-normal">
                  ⚠️ <strong>Save these credentials now.</strong> You must use this username and PIN to sign in to the portal and trigger the database materialization.
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
                  className="bg-[#064e3b] hover:bg-[#0f766e] text-white font-bold px-8 py-2.5 rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer"
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
