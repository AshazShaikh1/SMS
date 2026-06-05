"use client";

import React, { useState, useEffect } from "react";
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
  const [schoolName, setSchoolName] = useState("Antigravity Academy");
  const [academicYear, setAcademicYear] = useState("2026-2027");
  const [adminName, setAdminName] = useState("Ashaz Shaikh");

  // Dynamic Grade List State
  const [gradeFees, setGradeFees] = useState<{ grade: string; fee: number; extraCharge: number; discount: number }[]>([
    { grade: "Grade 1", fee: 15000, extraCharge: 0, discount: 0 },
    { grade: "Grade 2", fee: 18000, extraCharge: 0, discount: 0 },
    { grade: "Grade 3", fee: 20000, extraCharge: 0, discount: 0 },
    { grade: "Grade 4", fee: 22000, extraCharge: 0, discount: 0 },
    { grade: "Grade 5", fee: 25000, extraCharge: 0, discount: 0 },
    { grade: "Grade 6", fee: 30000, extraCharge: 0, discount: 0 },
    { grade: "Grade 7", fee: 35000, extraCharge: 0, discount: 0 },
    { grade: "Grade 8", fee: 40000, extraCharge: 0, discount: 0 },
    { grade: "Grade 9", fee: 45000, extraCharge: 0, discount: 0 },
    { grade: "Grade 10", fee: 50000, extraCharge: 0, discount: 0 },
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

  // STEP 3: Global Faculty Bulk Spreadsheet Grid (Assign to Class Dropdown, No Email collected)
  const [teachers, setTeachers] = useState<{ id: string; name: string; assignedClasses: string[] }[]>([
    { id: "teach-1", name: "Mrs. Susan Smith", assignedClasses: [] },
    { id: "teach-2", name: "Mr. Ramesh Kumar", assignedClasses: [] },
  ]);
  const [newTeacherName, setNewTeacherName] = useState("");
  const [newTeacherClasses, setNewTeacherClasses] = useState<string[]>([]);
  const [generatedUsername, setGeneratedUsername] = useState("");
  const [generatedPIN, setGeneratedPIN] = useState("");
  const [openTeacherDropdownId, setOpenTeacherDropdownId] = useState<string | null>(null);
  const [openAdderDropdown, setOpenAdderDropdown] = useState(false);

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

  // Click outside to close dropdowns handler
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".teacher-dropdown-container")) {
        setOpenTeacherDropdownId(null);
        setOpenAdderDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

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
      updated[index].fee = 0;
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
      updated[index].extraCharge = 0;
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
    const isInvalid = isNaN(num) || num < 0 || num >= 110;

    if (isInvalid) {
      setDiscountErrors(prev => ({ ...prev, [gradeName]: true }));
      setToast({ message: "Discount percentage must be under 110% and non-negative.", type: "error" });
      const updated = [...gradeFees];
      updated[index].discount = 0;
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
    setFeeErrors(prev => { const n = { ...prev }; delete n[gradeName]; return n; });
    setExtraErrors(prev => { const n = { ...prev }; delete n[gradeName]; return n; });
    setDiscountErrors(prev => { const n = { ...prev }; delete n[gradeName]; return n; });
  };

  const handleStep1Next = () => {
    const activeSchoolName = schoolName.trim() || "Antigravity Academy";
    const activeYear = academicYear.trim() || "2026-2027";
    const activeAdmin = adminName.trim() || "System Admin";

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
        assignedClasses: newTeacherClasses,
      },
    ]);
    setNewTeacherName("");
    setNewTeacherClasses([]);
    setOpenAdderDropdown(false);
  };

  const handleRemoveTeacher = (id: string) => {
    setTeachers(teachers.filter((t) => t.id !== id));
  };

  const handleToggleTeacherClass = (teacherId: string, classKey: string) => {
    setTeachers(
      teachers.map((t) => {
        if (t.id !== teacherId) return t;
        const exists = t.assignedClasses.includes(classKey);
        const assigned = exists
          ? t.assignedClasses.filter((c) => c !== classKey)
          : [...t.assignedClasses, classKey];
        return { ...t, assignedClasses: assigned };
      })
    );
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
          schoolName: schoolName.trim() || "Antigravity Academy",
          academicYear: academicYear.trim() || "2026-2027",
          adminName: adminName.trim() || "System Admin",
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
                  Enter your school name and set the annual fee for each grade.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-6">
                
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
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Set the yearly fee for each grade. Enter numbers only.
                      </p>
                    </div>

                    {/* Add Custom Grade Panel Inline */}
                    <div className="flex items-center gap-2 bg-zinc-50 p-2 rounded-xl border border-zinc-200 w-full sm:w-auto">
                      <Input
                        value={newGradeName}
                        onChange={(e) => setNewGradeName(e.target.value)}
                        placeholder="Grade 11"
                        className="h-8 text-xs max-w-[90px]"
                      />
                      <Input
                        value={newGradeFee}
                        onChange={(e) => setNewGradeFee(e.target.value)}
                        placeholder="Fee"
                        className="h-8 text-xs max-w-[80px]"
                      />
                      <Button
                        type="button"
                        onClick={handleAddGrade}
                        size="sm"
                        className="h-8 px-2.5 bg-[#064e3b] hover:bg-[#0f766e] text-white flex items-center gap-1"
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
              </CardContent>
              <CardFooter className="p-4 sm:p-6 border-t border-zinc-150 bg-zinc-50/50 justify-between items-center">
                <Link href="/login" className="text-xs font-semibold text-zinc-500 hover:text-zinc-850 flex items-center gap-1">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
                </Link>
                <Button onClick={handleStep1Next} className="gap-1.5 bg-[#064e3b] hover:bg-[#0f766e] active:bg-[#115e59] w-full sm:w-auto">
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
                  Step 3: Global Faculty Bulk Spreadsheet Grid
                </CardTitle>
                <CardDescription className="text-xs">
                  Onboard teachers and allocate them across classroom sections. Emails are generated automatically.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-6">
                
                {/* Faculty Input Adder with Assign to Class dropdown */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end border border-zinc-200 rounded-xl p-4 bg-zinc-50/20">
                  <div className="sm:col-span-6 space-y-1.5">
                    <label className="text-xs font-bold text-zinc-800">Teacher Full Name</label>
                    <Input
                      value={newTeacherName}
                      onChange={(e) => setNewTeacherName(e.target.value)}
                      placeholder="e.g. Mrs. Susan Smith"
                    />
                  </div>

                  {/* Assign to Class Dropdown inside Adder */}
                  <div className="sm:col-span-4 space-y-1.5 relative teacher-dropdown-container">
                    <label className="text-xs font-bold text-zinc-800">Assign to Class</label>
                    <button
                      type="button"
                      onClick={() => setOpenAdderDropdown(!openAdderDropdown)}
                      className="w-full text-left bg-white border border-zinc-200 rounded-lg p-2.5 flex items-center justify-between text-xs font-semibold hover:border-zinc-350 cursor-pointer h-10"
                    >
                      <span className="truncate text-zinc-650">
                        {newTeacherClasses.length === 0 
                          ? "Select classrooms..." 
                          : newTeacherClasses.map(c => c.replace("Grade ", "")).join(", ")
                        }
                      </span>
                      <span className="text-[10px] text-zinc-400">▼</span>
                    </button>

                    {openAdderDropdown && (
                      <div className="absolute left-0 right-0 mt-1.5 bg-white border border-zinc-200 rounded-xl shadow-lg z-30 max-h-48 overflow-y-auto p-2.5 space-y-1.5 w-full">
                        <div className="flex items-center justify-between pb-1 border-b border-zinc-100">
                          <span className="text-[10px] font-bold text-zinc-400 tracking-wider uppercase">Select Classrooms</span>
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenAdderDropdown(false);
                            }}
                            className="text-[9px] h-5 py-0.5 px-2 bg-[#064e3b]"
                          >
                            Done
                          </Button>
                        </div>
                        {preparedClasses.length === 0 ? (
                          <div className="text-[11px] text-zinc-400 p-1 font-semibold">No classes generated yet in Step 2</div>
                        ) : (
                          preparedClasses.map((cls) => {
                            const classKey = `${cls.gradeKey}-${cls.section}`;
                            const isChecked = newTeacherClasses.includes(classKey);
                            return (
                              <label
                                key={classKey}
                                className="flex items-center gap-2 text-[11px] text-zinc-700 hover:bg-zinc-50 p-1.5 rounded cursor-pointer font-medium"
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    const updated = isChecked
                                      ? newTeacherClasses.filter((c) => c !== classKey)
                                      : [...newTeacherClasses, classKey];
                                    setNewTeacherClasses(updated);
                                  }}
                                  className="w-4 h-4 text-[#064e3b] focus:ring-[#064e3b] border-zinc-300 rounded"
                                />
                                {cls.gradeKey.replace("Grade ", "")}-{cls.section}
                              </label>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddTeacher}
                      className="w-full gap-1 border-zinc-300 hover:border-emerald-600 hover:bg-[#ecfdf5] text-[#064e3b] h-10"
                    >
                      <Plus className="w-4 h-4" /> Add Row
                    </Button>
                  </div>
                </div>

                {/* Spreadsheet Table with Horizontal Scroll wrapper */}
                <div className="space-y-2.5">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                    Interactive Faculty Assignment Spreadsheet
                  </span>
                  
                  <div className="overflow-x-auto border border-zinc-200 rounded-xl bg-white">
                    <div className="min-w-[600px] divide-y divide-zinc-200">
                      {/* Headers */}
                      <div className="grid grid-cols-12 p-3 bg-zinc-50/70 text-xs font-bold text-zinc-500">
                        <div className="col-span-5">Teacher Full Name</div>
                        <div className="col-span-6 pl-2">Assigned Classrooms</div>
                        <div className="col-span-1 text-center">Delete</div>
                      </div>

                      {teachers.length === 0 ? (
                        <div className="text-center p-8 text-zinc-400 text-xs font-medium">
                          No teachers added to the roster yet. Add a row above.
                        </div>
                      ) : (
                        teachers.map((teacher) => (
                          <div key={teacher.id} className="grid grid-cols-12 p-3 items-start text-xs text-zinc-800 hover:bg-zinc-50/20 relative">
                            {/* Teacher Name Input */}
                            <div className="col-span-5 font-semibold text-zinc-900 pr-2 pt-2">
                              <input
                                type="text"
                                value={teacher.name}
                                onChange={(e) => {
                                  const updatedName = e.target.value;
                                  setTeachers(teachers.map(t => t.id === teacher.id ? { ...t, name: updatedName } : t));
                                }}
                                className="w-full bg-transparent border-0 focus:ring-0 font-semibold text-zinc-800 p-1.5 rounded hover:bg-zinc-150 outline-none"
                              />
                            </div>

                            {/* Assigned Classrooms Flow (Relative layout to prevent layout clipping) */}
                            <div className="col-span-6 pl-2 pt-2 relative teacher-dropdown-container">
                              <button
                                type="button"
                                onClick={() => setOpenTeacherDropdownId(openTeacherDropdownId === teacher.id ? null : teacher.id)}
                                className="w-full text-left bg-zinc-50 border border-zinc-200 rounded-lg p-2 flex items-center justify-between text-xs font-semibold hover:border-zinc-350 cursor-pointer"
                              >
                                <span className="truncate max-w-[240px]">
                                  {teacher.assignedClasses.length === 0 
                                    ? "0 classrooms assigned" 
                                    : teacher.assignedClasses.map(c => c.replace("Grade ", "")).join(", ")
                                  }
                                </span>
                                <span className="text-[10px] text-zinc-400">▼</span>
                              </button>

                              {/* Relative flow placement prevents overflow-hidden clipping inside tables */}
                              {openTeacherDropdownId === teacher.id && (
                                <div className="relative w-full mt-2 bg-white border border-zinc-200 rounded-xl shadow-sm z-20 max-h-48 overflow-y-auto p-2.5 space-y-1.5">
                                  <div className="flex items-center justify-between pb-1 border-b border-zinc-100">
                                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                                      Select Classrooms
                                    </span>
                                    <Button
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenTeacherDropdownId(null);
                                      }}
                                      className="text-[9px] h-5 py-0.5 px-2 bg-[#064e3b]"
                                    >
                                      Done
                                    </Button>
                                  </div>
                                  {preparedClasses.length === 0 ? (
                                    <div className="text-[11px] text-zinc-400 p-1">No classes available</div>
                                  ) : (
                                    preparedClasses.map((cls) => {
                                      const classKey = `${cls.gradeKey}-${cls.section}`;
                                      const isChecked = teacher.assignedClasses.includes(classKey);
                                      return (
                                        <label
                                          key={classKey}
                                          className="flex items-center gap-2 text-[11px] text-zinc-700 hover:bg-zinc-50 p-1.5 rounded cursor-pointer font-medium"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => handleToggleTeacherClass(teacher.id, classKey)}
                                            className="w-4 h-4 text-[#064e3b] focus:ring-[#064e3b] border-zinc-300 rounded"
                                          />
                                          {cls.gradeKey.replace("Grade ", "")}-{cls.section} (₹{cls.baseFee / 1000}k)
                                        </label>
                                      );
                                    })
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Row Delete Button */}
                            <div className="col-span-1 text-center pt-2">
                              <button
                                type="button"
                                onClick={() => handleRemoveTeacher(teacher.id)}
                                className="text-red-500 hover:text-red-800 p-1.5 cursor-pointer transition-colors"
                              >
                                <Trash2 className="w-4 h-4 mx-auto" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="p-4 sm:p-6 border-t border-zinc-150 bg-zinc-50/50 flex flex-col sm:flex-row justify-between gap-3">
                <Button variant="outline" onClick={() => setStep(2)} className="gap-1.5 w-full sm:w-auto">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </Button>
                <Button onClick={handleStep3Next} className="gap-1.5 bg-[#064e3b] hover:bg-[#0f766e] active:bg-[#115e59] w-full sm:w-auto">
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
