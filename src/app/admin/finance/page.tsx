"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { 
  Plus, 
  Trash2, 
  Landmark, 
  RefreshCw, 
  CheckCircle2, 
  User, 
  Search, 
  Calculator, 
  Download, 
  FileText,
  Users,
  Settings,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Toast } from "@/components/ui/toast";
import { fetchStudents } from "@/lib/db/students";
import { 
  getStudentLedger, 
  updateStudentLedger, 
  calculateOutstandingBalance, 
  FeeModifier, 
  fetchTransactionsForStudent, 
  FeeTransaction 
} from "@/lib/db/finance";
import { Student } from "@/lib/db/mockDb";
import { supabase } from "@/lib/supabase/client";
import { FinancialHealthBar } from "@/components/dashboard/FinancialHealthBar";

// Reusable preset packages (common templates for fees and scholarships)
const PRESET_PACKAGES = [
  { label: "Academic Merit Scholarship (25%)", application: "discount" as const, type: "percentage" as const, value: 25 },
  { label: "Academic Merit Scholarship (50%)", application: "discount" as const, type: "percentage" as const, value: 50 },
  { label: "Sports Scholarship (20%)", application: "discount" as const, type: "percentage" as const, value: 20 },
  { label: "Sibling Discount (10%)", application: "discount" as const, type: "percentage" as const, value: 10 },
  { label: "Staff Child Waiver (100%)", application: "discount" as const, type: "percentage" as const, value: 100 },
  { label: "Flat Sibling Discount (₹5,000)", application: "discount" as const, type: "fixed_amount" as const, value: 5000 },
  { label: "Computer & Lab Fee (₹2,500)", application: "charge" as const, type: "fixed_amount" as const, value: 2500 },
  { label: "Library Access Charge (₹1,000)", application: "charge" as const, type: "fixed_amount" as const, value: 1000 },
  { label: "Bus Transportation Fee (₹5,000)", application: "charge" as const, type: "fixed_amount" as const, value: 5000 },
  { label: "Sports Uniform Fee (₹1,500)", application: "charge" as const, type: "fixed_amount" as const, value: 1500 }
];

function FinanceLedgerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialStudentId = searchParams.get("studentId") || "";

  const [activeTab, setActiveTab] = useState<"individual" | "batch">("individual");
  const [students, setStudents] = useState<Student[]>([]);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState("School Billing");
  const [loading, setLoading] = useState(true);

  // Dynamic filter collections loaded from DB
  const [availableGrades, setAvailableGrades] = useState<string[]>([]);
  const [availableSections, setAvailableSections] = useState<string[]>([]);

  // Tab 1: Individual Ledger States
  const [selectedStudentId, setSelectedStudentId] = useState(initialStudentId);
  const [studentDetails, setStudentDetails] = useState<Student | null>(null);
  const [baseFee, setBaseFee] = useState(0);
  const [modifiers, setModifiers] = useState<FeeModifier[]>([]);
  const [outstandingBalance, setOutstandingBalance] = useState(0);
  
  // Tab 1 search & pagination
  const [individualSearch, setIndividualSearch] = useState("");
  const [individualGradeFilter, setIndividualGradeFilter] = useState("all");
  const [individualSectionFilter, setIndividualSectionFilter] = useState("all");
  const [individualCurrentPage, setIndividualCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Tab 1 Modifier form states
  const [presetSelection, setPresetSelection] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState<"percentage" | "fixed_amount">("fixed_amount");
  const [newValue, setNewValue] = useState("");
  const [newApplication, setNewApplication] = useState<"charge" | "discount">("discount");

  // Tab 1 Payment history logs
  const [transactions, setTransactions] = useState<FeeTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  // Tab 2: Batch Adjustments States
  const [batchPresetSelection, setBatchPresetSelection] = useState("");
  const [batchLabel, setBatchLabel] = useState("");
  const [batchType, setBatchType] = useState<"percentage" | "fixed_amount">("fixed_amount");
  const [batchApplication, setBatchApplication] = useState<"charge" | "discount">("discount");
  const [batchValue, setBatchValue] = useState("");

  const [batchTargetType, setBatchTargetType] = useState<"grade" | "section" | "all">("grade");
  const [batchTargetGrade, setBatchTargetGrade] = useState("");
  const [batchTargetSection, setBatchTargetSection] = useState("");
  const [checkedStudentIds, setCheckedStudentIds] = useState<Record<string, boolean>>({});

  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [batchStatusText, setBatchStatusText] = useState("");

  // Notification states
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "warning" | "error" | "info" } | null>(null);
  const [inputError, setInputError] = useState(false);

  // Load student records, school id, and unique classes
  async function loadRoster() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    // Fetch School Name, Role and School ID
    const { data: profile } = await supabase
      .from("profiles")
      .select("school_id, school:schools(school_name)")
      .eq("id", user.id)
      .single();
    
    let currentSchoolId = "";
    if (profile) {
      currentSchoolId = profile.school_id;
      setSchoolId(currentSchoolId);
      if (profile.school) {
        setSchoolName((profile.school as any).school_name);
      }
    }

    if (currentSchoolId) {
      // Load classes
      const { data: classesData } = await supabase
        .from("classes")
        .select("grade_level, section")
        .eq("school_id", currentSchoolId);

      if (classesData) {
        const grades = Array.from(new Set(classesData.map(c => c.grade_level?.replace("Grade ", "")) || []))
          .filter(Boolean)
          .sort((a, b) => {
            const numA = parseInt(a, 10);
            const numB = parseInt(b, 10);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return a.localeCompare(b);
          });
        setAvailableGrades(grades);
        if (grades.length > 0) {
          setBatchTargetGrade(grades[0]);
        }

        const sections = Array.from(new Set(classesData.map(c => c.section) || []))
          .filter(Boolean)
          .sort();
        setAvailableSections(sections);
        if (sections.length > 0) {
          setBatchTargetSection(sections[0]);
        }
      }
    }

    const list = await fetchStudents();
    setStudents(list);
    setLoading(false);
  }

  useEffect(() => {
    loadRoster();
  }, [router]);

  // Sync active student preview
  useEffect(() => {
    if (!selectedStudentId) {
      setStudentDetails(null);
      setModifiers([]);
      setBaseFee(0);
      setOutstandingBalance(0);
      setTransactions([]);
      return;
    }

    async function loadLedger() {
      const details = students.find((s) => s._id === selectedStudentId);
      if (details) {
        setStudentDetails(details);
        const ledger = await getStudentLedger(selectedStudentId);
        if (ledger) {
          setBaseFee(ledger.baseFee);
          setModifiers(ledger.modifiers);
          setOutstandingBalance(ledger.outstandingBalance);
        }

        // Load transaction payment history logs
        if (details.personal_details.student_profile_id) {
          setLoadingTransactions(true);
          const txs = await fetchTransactionsForStudent(details.personal_details.student_profile_id);
          setTransactions(txs);
          setLoadingTransactions(false);
        }
      }
    }
    loadLedger();
  }, [selectedStudentId, students]);

  // Real-time calculation previews
  useEffect(() => {
    if (baseFee > 0) {
      const computed = calculateOutstandingBalance(baseFee, modifiers);
      setOutstandingBalance(computed);
    }
  }, [baseFee, modifiers]);

  // Preset Selection Form Sync (Tab 1)
  const handlePresetChange = (presetName: string) => {
    setPresetSelection(presetName);
    if (!presetName) {
      setNewLabel("");
      setNewValue("");
      return;
    }
    const preset = PRESET_PACKAGES.find(p => p.label === presetName);
    if (preset) {
      setNewLabel(preset.label.split(" (")[0]);
      setNewType(preset.type);
      setNewApplication(preset.application);
      setNewValue(String(preset.value));
    }
  };

  // Preset Selection Form Sync (Tab 2 Batch)
  const handleBatchPresetChange = (presetName: string) => {
    setBatchPresetSelection(presetName);
    if (!presetName) {
      setBatchLabel("");
      setBatchValue("");
      return;
    }
    const preset = PRESET_PACKAGES.find(p => p.label === presetName);
    if (preset) {
      setBatchLabel(preset.label.split(" (")[0]);
      setBatchType(preset.type);
      setBatchApplication(preset.application);
      setBatchValue(String(preset.value));
    }
  };

  // Add individual adjustment
  const handleAddModifier = (e: React.FormEvent) => {
    e.preventDefault();
    const numericValue = Number(newValue);

    if (newType === "percentage" && newApplication === "discount") {
      if (isNaN(numericValue) || numericValue < 0 || numericValue > 100) {
        setInputError(true);
        setToast({ message: "Discount percentages must be between 0% and 100%.", type: "warning" });
        return;
      }
    }

    if (newType === "fixed_amount" && numericValue < 0) {
      setNewValue("0");
      setInputError(true);
      return;
    }

    if (!newLabel.trim() || !newValue.trim() || numericValue < 0) return;

    const modifier: FeeModifier = {
      id: `MOD_${Date.now()}`,
      label: newLabel.trim(),
      type: newType,
      value: Math.round(numericValue),
      application: newApplication,
    };

    setModifiers([...modifiers, modifier]);
    setNewLabel("");
    setNewValue("");
    setPresetSelection("");
    setInputError(false);
  };

  // Remove individual adjustment
  const handleRemoveModifier = (id: string) => {
    setModifiers(modifiers.filter((mod) => mod.id !== id));
  };

  // Save changes
  const handleCommitLedger = async () => {
    if (!selectedStudentId) return;
    setSaving(true);
    setSaveSuccess(false);

    const success = await updateStudentLedger(selectedStudentId, modifiers);
    setSaving(false);
    if (success) {
      setSaveSuccess(true);
      setToast({ message: "Billing parameters saved successfully!", type: "success" });
      setTimeout(async () => {
        setSaveSuccess(false);
        const list = await fetchStudents();
        setStudents(list);
      }, 1000);
    } else {
      setToast({ message: "Failed to update ledger records.", type: "error" });
    }
  };

  // Reset tab 1 filters
  useEffect(() => {
    setIndividualCurrentPage(1);
  }, [individualSearch, individualGradeFilter, individualSectionFilter]);

  // Tab 1 student filtering
  const filteredIndividualStudents = students.filter((s) => {
    const p = s.personal_details;
    const a = s.academic_mapping;
    const fullName = `${p.first_name || ""} ${p.last_name || ""}`.toLowerCase();
    
    const matchesSearch = fullName.includes(individualSearch.toLowerCase()) || 
      String(p.roll_number).includes(individualSearch) ||
      s._id.toLowerCase().includes(individualSearch.toLowerCase());

    const matchesGrade = individualGradeFilter === "all" || 
      a.current_grade.replace("Grade ", "") === individualGradeFilter;
      
    const matchesSection = individualSectionFilter === "all" || a.section === individualSectionFilter;

    return matchesSearch && matchesGrade && matchesSection;
  });

  const totalIndividualPages = Math.ceil(filteredIndividualStudents.length / itemsPerPage) || 1;
  const paginatedIndividualStudents = filteredIndividualStudents.slice(
    (individualCurrentPage - 1) * itemsPerPage,
    individualCurrentPage * itemsPerPage
  );

  // Tab 2: Filter targeted students list for batch preview
  const targetedStudentsForBatch = students.filter((s) => {
    const a = s.academic_mapping;
    const cleanGrade = a.current_grade.replace("Grade ", "");

    if (batchTargetType === "all") return true;
    if (batchTargetType === "grade") {
      return cleanGrade === batchTargetGrade;
    }
    if (batchTargetType === "section") {
      return cleanGrade === batchTargetGrade && a.section === batchTargetSection;
    }
    return false;
  });

  // Keep target student checked list synced with filter target list
  useEffect(() => {
    const newChecked: Record<string, boolean> = {};
    targetedStudentsForBatch.forEach(s => {
      newChecked[s._id] = true; // Checked by default
    });
    setCheckedStudentIds(newChecked);
  }, [batchTargetType, batchTargetGrade, batchTargetSection, students]);

  // Toggle single target student
  const toggleStudentCheck = (id: string) => {
    setCheckedStudentIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Toggle all visible targets
  const toggleAllTargets = (checked: boolean) => {
    const newChecked: Record<string, boolean> = {};
    targetedStudentsForBatch.forEach(s => {
      newChecked[s._id] = checked;
    });
    setCheckedStudentIds(newChecked);
  };

  // Run bulk batch allocations/removals
  const runBatchAdjustments = async (action: "add" | "remove") => {
    const selectedTargets = targetedStudentsForBatch.filter(s => checkedStudentIds[s._id]);
    if (selectedTargets.length === 0) {
      setToast({ message: "No target students are selected.", type: "warning" });
      return;
    }

    if (action === "add" && (!batchLabel.trim() || !batchValue.trim() || Number(batchValue) < 0)) {
      setToast({ message: "Please fill in a valid fee name and numeric amount value.", type: "warning" });
      return;
    }

    if (action === "remove" && !batchLabel.trim()) {
      setToast({ message: "Please type the exact name/label of the fee to remove.", type: "warning" });
      return;
    }

    setIsProcessingBatch(true);
    setBatchProgress(0);
    let successCount = 0;
    const valueNum = Number(batchValue) || 0;

    for (let i = 0; i < selectedTargets.length; i++) {
      const student = selectedTargets[i];
      setBatchStatusText(`Updating student ${i + 1} of ${selectedTargets.length}: ${student.personal_details.first_name}...`);
      
      // Load current modifiers
      const currentLedger = await getStudentLedger(student._id);
      let updatedModifiers = currentLedger ? [...currentLedger.modifiers] : [];

      if (action === "add") {
        // Add modifier
        const modifier: FeeModifier = {
          id: `MOD_BATCH_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          label: batchLabel.trim(),
          type: batchType,
          value: Math.round(valueNum),
          application: batchApplication
        };
        updatedModifiers.push(modifier);
      } else {
        // Remove matching labels
        updatedModifiers = updatedModifiers.filter(
          m => m.label.toLowerCase() !== batchLabel.trim().toLowerCase()
        );
      }

      const ok = await updateStudentLedger(student._id, updatedModifiers);
      if (ok) {
        successCount++;
      }
      setBatchProgress(Math.round(((i + 1) / selectedTargets.length) * 100));
    }

    setIsProcessingBatch(false);
    setToast({ 
      message: `Batch update completed! Successfully updated ${successCount} of ${selectedTargets.length} records.`, 
      type: "success" 
    });

    // Clear forms
    setBatchPresetSelection("");
    setBatchLabel("");
    setBatchValue("");
    
    // Refresh database student records
    setLoading(true);
    await loadRoster();
  };

  // Overall statistics calculation
  const totalOutstandingSum = students.reduce(
    (sum, s) => sum + (s.financial_ledger?.current_outstanding_balance || 0),
    0
  );

  const totalExpectedRevenue = students.reduce((sum, s) => {
    const base = s.financial_ledger?.base_fee || 0;
    const mods = s.financial_ledger?.custom_modifiers || [];
    let charges = 0;
    let discounts = 0;
    
    mods.forEach(m => {
      const amt = m.type === "percentage" ? (m.value / 100) * base : m.value;
      if (m.application === "charge") {
        charges += amt;
      } else {
        discounts += amt;
      }
    });

    return sum + Math.max(0, base + charges - discounts);
  }, 0);

  const totalCollectedSum = Math.max(0, totalExpectedRevenue - totalOutstandingSum);

  const totalActiveDiscountsCount = students.reduce((sum, s) => {
    const mods = s.financial_ledger?.custom_modifiers || [];
    const discountCount = mods.filter(m => m.application === "discount").length;
    return sum + discountCount;
  }, 0);

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Dynamic Progress indicator during batch operations */}
      {isProcessingBatch && (
        <div className="fixed bottom-6 right-6 bg-white border border-zinc-200 shadow-2xl rounded-2xl p-5 max-w-sm w-96 z-50 animate-fade-in flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-zinc-800 uppercase tracking-wide">Processing Batch Update</span>
            <span className="text-xs font-bold text-[#1572FE]">{batchProgress}%</span>
          </div>
          <div className="w-full bg-zinc-100 rounded-full h-2 overflow-hidden border border-zinc-200">
            <div 
              className="bg-[#1572FE] h-2 transition-all duration-300 rounded-full" 
              style={{ width: `${batchProgress}%` }}
            />
          </div>
          <p className="text-[10px] text-zinc-500 italic truncate">{batchStatusText}</p>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Fees, Discounts & Scholarships</h1>
        <p className="text-xs text-zinc-505 mt-0.5 font-normal">Apply extra fee charges, add scholarship discounts, review student accounts, or run bulk updates.</p>
      </div>

      {/* Global Billing Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Expected Revenue */}
        <div className="bg-white border border-zinc-200/50 rounded-2xl p-5 shadow-xs flex flex-col justify-between card-accent-blue">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Expected Total Billing</span>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-zinc-900 font-mono">
              ₹{loading ? "..." : totalExpectedRevenue.toLocaleString("en-IN")}
            </div>
            <p className="text-[10px] text-zinc-405 mt-1 font-medium">Standard tuition rates plus active charges.</p>
          </div>
        </div>

        {/* Collected Fees */}
        <div className="bg-white border border-zinc-200/50 rounded-2xl p-5 shadow-xs flex flex-col justify-between card-accent-emerald">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total Fees Collected</span>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-zinc-900 font-mono">
              ₹{loading ? "..." : totalCollectedSum.toLocaleString("en-IN")}
            </div>
            <p className="text-[10px] text-zinc-405 mt-1 font-medium">Net payments successfully recorded.</p>
          </div>
        </div>

        {/* Outstanding Balance */}
        <div className="bg-white border border-zinc-200/50 rounded-2xl p-5 shadow-xs flex flex-col justify-between card-accent-amber">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Outstanding Unpaid Fees</span>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-zinc-900 font-mono">
              ₹{loading ? "..." : totalOutstandingSum.toLocaleString("en-IN")}
            </div>
            {!loading && (
              <FinancialHealthBar collected={totalCollectedSum} remaining={totalOutstandingSum} />
            )}
          </div>
        </div>

        {/* Active Discounts count */}
        <div className="bg-white border border-zinc-200/50 rounded-2xl p-5 shadow-xs flex flex-col justify-between card-accent-rose">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Active Scholarships Applied</span>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-zinc-900 font-mono">
              {loading ? "..." : totalActiveDiscountsCount}
            </div>
            <p className="text-[10px] text-zinc-405 mt-1 font-medium">Discounts applied to individual accounts.</p>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-zinc-200/80 gap-6">
        <button
          onClick={() => setActiveTab("individual")}
          className={`pb-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === "individual"
              ? "border-[#1572FE] text-[#1572FE]"
              : "border-transparent text-zinc-400 hover:text-zinc-650"
          }`}
        >
          Student Billing Accounts
        </button>
        <button
          onClick={() => setActiveTab("batch")}
          className={`pb-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === "batch"
              ? "border-[#1572FE] text-[#1572FE]"
              : "border-transparent text-zinc-400 hover:text-zinc-650"
          }`}
        >
          Batch adjustments (Group actions)
        </button>
      </div>

      {/* Tab 1: Individual Student Ledger Editor */}
      {activeTab === "individual" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Student Search Directory Column (5/12 width) */}
          <div className="lg:col-span-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">1. Select a Student</h3>
              <p className="text-[11px] text-zinc-455">Find a student by name to review or update their billing ledger.</p>
            </div>

            <div className="bg-white border border-zinc-200/60 rounded-2xl p-4 shadow-xs space-y-3.5">
              {/* Search inputs */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search name or roll number..."
                    value={individualSearch}
                    onChange={(e) => setIndividualSearch(e.target.value)}
                    className="w-full bg-zinc-50/50 border border-zinc-200 focus:border-[#1572FE] focus:ring-1 focus:ring-[#1572FE]/10 text-xs rounded-xl py-2 pl-8 pr-3 outline-none"
                  />
                </div>
                <select
                  value={individualGradeFilter}
                  onChange={(e) => setIndividualGradeFilter(e.target.value)}
                  className="bg-zinc-50/50 border border-zinc-200 text-[10px] rounded-xl px-2.5 outline-none cursor-pointer text-zinc-650 font-medium h-9"
                >
                  <option value="all">All Grades</option>
                  {availableGrades.map((g) => (
                    <option key={g} value={g}>Grade {g}</option>
                  ))}
                </select>
                <select
                  value={individualSectionFilter}
                  onChange={(e) => setIndividualSectionFilter(e.target.value)}
                  className="bg-zinc-50/50 border border-zinc-200 text-[10px] rounded-xl px-2.5 outline-none cursor-pointer text-zinc-650 font-medium h-9"
                >
                  <option value="all">All Sections</option>
                  {availableSections.map((s) => (
                    <option key={s} value={s}>Sec {s}</option>
                  ))}
                </select>
              </div>

              {/* Table */}
              <div className="border border-zinc-200/60 rounded-xl overflow-hidden bg-white">
                <table className="min-w-full divide-y divide-zinc-100 text-left text-xs">
                  <thead className="bg-zinc-50/60 text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                    <tr>
                      <th scope="col" className="px-4 py-3">Roll</th>
                      <th scope="col" className="px-4 py-3">Name</th>
                      <th scope="col" className="px-4 py-3">Outstanding</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-zinc-100">
                    {loading ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-6 text-center text-zinc-400 text-[11px]">
                          Loading students...
                        </td>
                      </tr>
                    ) : filteredIndividualStudents.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-6 text-center text-zinc-400 text-[11px]">
                          No student profiles match your search criteria.
                        </td>
                      </tr>
                    ) : (
                      paginatedIndividualStudents.map((s) => {
                        const isSelected = selectedStudentId === s._id;
                        return (
                          <tr 
                            key={s._id} 
                            onClick={() => setSelectedStudentId(s._id)}
                            className={`hover:bg-zinc-50/40 cursor-pointer transition-colors border-b border-zinc-100 ${
                              isSelected ? "bg-[#1572FE]/5 hover:bg-[#1572FE]/5 font-semibold text-[#1572FE]" : ""
                            }`}
                          >
                            <td className="px-4 py-3 font-mono text-[10px] text-zinc-500">
                              #{s.personal_details.roll_number}
                            </td>
                            <td className="px-4 py-3">
                              <span className="block leading-tight text-zinc-800 font-semibold">
                                {s.personal_details.first_name} {s.personal_details.last_name}
                              </span>
                              <span className="text-[9px] text-zinc-400">G{s.academic_mapping.current_grade}-{s.academic_mapping.section}</span>
                            </td>
                            <td className="px-4 py-3 font-semibold text-zinc-800">
                              ₹{s.financial_ledger?.current_outstanding_balance.toLocaleString("en-IN")}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Roster Pagination */}
              {!loading && totalIndividualPages > 1 && (
                <div className="flex items-center justify-between text-[10px] text-zinc-405 select-none pt-1">
                  <span>Page {individualCurrentPage} of {totalIndividualPages}</span>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={individualCurrentPage === 1}
                      onClick={() => setIndividualCurrentPage(individualCurrentPage - 1)}
                      className="h-7 px-2 font-semibold text-[9px] border-zinc-200"
                    >
                      <ChevronLeft className="w-3 h-3" /> Prev
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={individualCurrentPage === totalIndividualPages}
                      onClick={() => setIndividualCurrentPage(individualCurrentPage + 1)}
                      className="h-7 px-2 font-semibold text-[9px] border-zinc-200"
                    >
                      Next <ChevronRight className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Student Billing Details Card Column (7/12 width) */}
          <div className="lg:col-span-7 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">2. Fee Details & Scholarship Adjustments</h3>
              <p className="text-[11px] text-zinc-455">Add extra charges or discount packages for the selected student account.</p>
            </div>

            <Card className="border border-zinc-200/80 shadow-sm bg-white rounded-2xl overflow-hidden flex flex-col justify-between card-accent-indigo">
              {!selectedStudentId ? (
                <div className="p-12 text-center text-zinc-400 text-xs flex flex-col items-center justify-center gap-2">
                  <User className="w-8 h-8 text-zinc-300" />
                  <span>Choose a student profile from the list on the left to review or edit their billing settings.</span>
                </div>
              ) : (
                <>
                  <div className="p-6 space-y-6">
                    {/* Student details top banner */}
                    {studentDetails && (
                      <div className="border border-zinc-200/60 rounded-xl p-4 bg-zinc-50/50 flex flex-col sm:flex-row justify-between gap-4 text-xs">
                        <div className="space-y-1">
                          <span className="font-bold text-zinc-800 text-sm block">
                            {studentDetails.personal_details.first_name} {studentDetails.personal_details.last_name}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-mono block">Student ID: {studentDetails._id}</span>
                          <Badge variant="secondary" className="font-normal text-[9px] py-0 px-2 bg-zinc-200 border border-zinc-200/20 text-zinc-700">
                            Grade {studentDetails.academic_mapping.current_grade} - Section {studentDetails.academic_mapping.section}
                          </Badge>
                        </div>
                        <div className="text-left sm:text-right space-y-1">
                          <span className="text-[10px] text-zinc-400 block font-bold uppercase tracking-wide">Base Tuition Rate</span>
                          <span className="text-base font-extrabold text-zinc-800 font-mono">₹{baseFee.toLocaleString("en-IN")}</span>
                        </div>
                      </div>
                    )}

                    {/* Modifiers form */}
                    <div className="space-y-3.5 border border-zinc-200 rounded-xl p-4 bg-zinc-50/20">
                      <div className="flex justify-between items-center pb-2 border-b border-zinc-100">
                        <span className="text-xs font-bold text-zinc-800 uppercase tracking-wide">Add Custom Fee or Discount</span>
                        <select
                          value={presetSelection}
                          onChange={(e) => handlePresetChange(e.target.value)}
                          className="bg-white border border-zinc-200 text-[10px] rounded-lg px-2 py-1 outline-none cursor-pointer text-zinc-650 font-semibold focus:border-[#1572FE] focus:ring-1 focus:ring-[#1572FE]/10"
                        >
                          <option value="">-- Apply a Preset Package --</option>
                          {PRESET_PACKAGES.map((preset) => (
                            <option key={preset.label} value={preset.label}>{preset.label}</option>
                          ))}
                        </select>
                      </div>

                      <form onSubmit={handleAddModifier} className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                        <div className="sm:col-span-5 space-y-1">
                          <label className="text-[9px] font-bold text-zinc-655 uppercase tracking-wide">Fee or Scholarship Label</label>
                          <Input
                            value={newLabel}
                            onChange={(e) => setNewLabel(e.target.value)}
                            placeholder="e.g. Science Lab Fee, Sports Waiver"
                            required
                          />
                        </div>
                        <div className="sm:col-span-2 space-y-1">
                          <label className="text-[9px] font-bold text-zinc-655 uppercase tracking-wide">Category</label>
                          <Select
                            value={newApplication}
                            onChange={(e) => setNewApplication(e.target.value as any)}
                          >
                            <option value="discount">Discount (-)</option>
                            <option value="charge">Extra charge (+)</option>
                          </Select>
                        </div>
                        <div className="sm:col-span-3 space-y-1">
                          <label className="text-[9px] font-bold text-zinc-655 uppercase tracking-wide">Adjustment Type</label>
                          <Select
                            value={newType}
                            onChange={(e) => {
                              const val = e.target.value as any;
                              setNewType(val);
                              if (val === "fixed_amount" && Number(newValue) < 0) {
                                setNewValue("0");
                              }
                            }}
                          >
                            <option value="fixed_amount">Fixed Amount (₹)</option>
                            <option value="percentage">Percentage (%)</option>
                          </Select>
                        </div>
                        <div className="sm:col-span-2 space-y-1">
                          <label className="text-[9px] font-bold text-zinc-655 uppercase tracking-wide">Value</label>
                          <div className="relative">
                            <Input
                              type="number"
                              value={newValue}
                              onChange={(e) => {
                                let val = e.target.value;
                                if (newType === "fixed_amount" && Number(val) < 0) {
                                  val = "0";
                                }
                                setNewValue(val);
                              }}
                              placeholder="e.g. 5000"
                              min="0"
                              required
                              className={`h-10 text-xs pr-6 ${inputError ? "border-red-400 focus:ring-red-200" : ""}`}
                            />
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400 font-bold font-mono">
                              {newType === "percentage" ? "%" : "₹"}
                            </span>
                          </div>
                        </div>
                        <div className="sm:col-span-12 flex justify-end pt-1">
                          <Button type="submit" variant="outline" className="text-xs h-8 font-semibold text-[#1572FE] border-zinc-200 hover:bg-blue-50/20 px-3.5">
                            <Plus className="w-3.5 h-3.5 mr-1" /> Add Adjustment
                          </Button>
                        </div>
                      </form>
                    </div>

                    {/* Applied Modifiers list */}
                    <div className="space-y-3">
                      <span className="text-xs font-bold text-zinc-800 uppercase tracking-wide block">Active Accounts Adjustments</span>
                      
                      {modifiers.length === 0 ? (
                        <div className="border border-dashed border-zinc-200 rounded-xl p-6 text-center text-zinc-400 text-xs bg-zinc-50/20">
                          Paying standard baseline fee rate. No custom extra fees or scholarships added.
                        </div>
                      ) : (
                        <div className="border border-zinc-200 rounded-xl overflow-hidden divide-y divide-zinc-200 bg-white">
                          {modifiers.map((mod) => {
                            const isDiscount = mod.application === "discount";
                            const isPercent = mod.type === "percentage";
                            return (
                              <div key={mod.id} className="flex justify-between items-center p-3 text-xs transition-colors hover:bg-zinc-50/30">
                                <div className="space-y-0.5">
                                  <span className="font-bold text-zinc-850">{mod.label}</span>
                                  <div className="flex gap-2">
                                    <Badge variant={isDiscount ? "primary" : "danger"} className="text-[8px] py-0 px-1 font-normal uppercase tracking-wider">
                                      {isDiscount ? "Discount" : "Extra Charge"}
                                    </Badge>
                                    <span className="text-[9px] text-zinc-400 font-medium">
                                      {isPercent ? `${mod.value}% off base` : `₹${mod.value.toLocaleString("en-IN")} flat`}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-4">
                                  <span className={`font-bold font-mono ${isDiscount ? "text-emerald-700" : "text-red-750"}`}>
                                    {isDiscount ? "-" : "+"}
                                    ₹{isPercent ? Math.round((mod.value / 100) * baseFee).toLocaleString("en-IN") : mod.value.toLocaleString("en-IN")}
                                  </span>
                                  <button
                                    onClick={() => handleRemoveModifier(mod.id)}
                                    className="text-zinc-400 hover:text-red-750 cursor-pointer p-1 rounded-lg hover:bg-zinc-50 transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Math Preview card */}
                    <div className="border border-zinc-200 rounded-xl p-4 bg-zinc-50/50 flex flex-col gap-2 text-xs text-zinc-500">
                      <div className="flex justify-between">
                        <span>Base Tuition Fee Rate:</span>
                        <span className="text-zinc-800 font-mono">₹{baseFee.toLocaleString("en-IN")}</span>
                      </div>
                      
                      {modifiers.map((mod) => {
                        const amt = mod.type === "percentage" ? (mod.value / 100) * baseFee : mod.value;
                        const isDiscount = mod.application === "discount";
                        return (
                          <div key={mod.id} className="flex justify-between text-[11px] font-mono">
                            <span>└ {mod.label}:</span>
                            <span className={isDiscount ? "text-emerald-700" : "text-red-750"}>
                              {isDiscount ? "-" : "+"}₹{Math.round(amt).toLocaleString("en-IN")}
                            </span>
                          </div>
                        );
                      })}

                      <div className="border-t border-zinc-200 pt-2.5 mt-1 flex justify-between items-center">
                        <span className="font-semibold text-zinc-900 text-sm">Preview Total Fees to Collect:</span>
                        <span className="font-extrabold text-indigo-950 text-base font-mono">₹{outstandingBalance.toLocaleString("en-IN")}</span>
                      </div>
                    </div>

                    {/* Transaction logs history (Requirement 2) */}
                    <div className="space-y-3 pt-2">
                      <span className="text-xs font-bold text-zinc-800 uppercase tracking-wide block">Payment History logs</span>
                      
                      {loadingTransactions ? (
                        <div className="p-6 text-center text-zinc-400 text-[11px] bg-zinc-50/20 border border-dashed border-zinc-200 rounded-xl">
                          <Loader2 className="w-4.5 h-4.5 animate-spin mx-auto text-zinc-400" />
                          <span className="mt-1 block">Retrieving transactions...</span>
                        </div>
                      ) : transactions.length === 0 ? (
                        <div className="border border-dashed border-zinc-200 rounded-xl p-6 text-center text-zinc-400 text-xs bg-zinc-50/10">
                          No payments registered in our ledger yet.
                        </div>
                      ) : (
                        <div className="border border-zinc-200 rounded-xl overflow-hidden divide-y divide-zinc-250 bg-white">
                          {transactions.map((tx) => (
                            <div key={tx.id} className="flex justify-between items-center p-3 text-[11px]">
                              <div className="space-y-0.5">
                                <span className="font-semibold text-zinc-800 block">
                                  ₹{tx.amount_paid.toLocaleString("en-IN")} via {tx.payment_mode.toUpperCase()}
                                </span>
                                {tx.reference_number && (
                                  <span className="text-[9px] text-zinc-400 font-mono block">Ref: {tx.reference_number}</span>
                                )}
                              </div>
                              <span className="text-[10px] text-zinc-455 font-mono">
                                {new Date(tx.created_at).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric"
                                })}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="p-5 border-t border-zinc-100 bg-zinc-50/40 flex justify-end gap-3 shrink-0">
                    {saveSuccess && (
                      <div className="text-emerald-700 text-xs font-semibold flex items-center gap-1.5 mr-auto">
                        <CheckCircle2 className="w-4 h-4 text-blue-700 animate-bounce" />
                        <span>Changes saved successfully!</span>
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedStudentId("")}
                      disabled={saving}
                      className="h-9 border-zinc-200 text-zinc-550 font-semibold"
                    >
                      Clear selection
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleCommitLedger}
                      disabled={saving}
                      className="gap-2 h-9 font-semibold text-xs bg-[#1572FE] hover:bg-[#0f62d4]"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Committing...
                        </>
                      ) : (
                        <>
                          <Landmark className="w-3.5 h-3.5" /> Save updates
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* Tab 2: Batch Fee Adjustments */}
      {activeTab === "batch" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Target configuration panel (5/12 width) */}
          <div className="lg:col-span-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">1. Configure Batch Adjustment</h3>
              <p className="text-[11px] text-zinc-455">Define the fee or discount to apply to multiple accounts.</p>
            </div>

            <Card className="border border-zinc-200/80 shadow-sm bg-white rounded-2xl p-5 space-y-4 card-accent-rose">
              {/* Preset Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-650 uppercase tracking-wide block">Select a Preset template</label>
                <select
                  value={batchPresetSelection}
                  onChange={(e) => handleBatchPresetChange(e.target.value)}
                  className="w-full bg-white border border-zinc-200 text-xs rounded-xl py-2 px-3 outline-none cursor-pointer text-zinc-700 focus:border-[#1572FE] focus:ring-1 focus:ring-[#1572FE]/10 h-10 font-semibold"
                >
                  <option value="">-- Apply a Preset Package --</option>
                  {PRESET_PACKAGES.map((preset) => (
                    <option key={preset.label} value={preset.label}>{preset.label}</option>
                  ))}
                </select>
              </div>

              {/* Custom manual inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-650 uppercase tracking-wide block">Fee or Scholarship name</label>
                  <Input
                    value={batchLabel}
                    onChange={(e) => setBatchLabel(e.target.value)}
                    placeholder="e.g. Science Lab Fee, Grade Discount"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-650 uppercase tracking-wide block">Category</label>
                  <Select
                    value={batchApplication}
                    onChange={(e) => setBatchApplication(e.target.value as any)}
                  >
                    <option value="discount">Discount (-)</option>
                    <option value="charge">Extra charge (+)</option>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-650 uppercase tracking-wide block">Value Type</label>
                  <Select
                    value={batchType}
                    onChange={(e) => setBatchType(e.target.value as any)}
                  >
                    <option value="fixed_amount">Fixed Amount (₹)</option>
                    <option value="percentage">Percentage (%)</option>
                  </Select>
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-650 uppercase tracking-wide block">Amount / Percentage value</label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={batchValue}
                      onChange={(e) => setBatchValue(e.target.value)}
                      placeholder="e.g. 5000"
                      min="0"
                      className="h-10 text-xs pr-6"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400 font-bold font-mono">
                      {batchType === "percentage" ? "%" : "₹"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Target options */}
              <div className="space-y-3 pt-3 border-t border-zinc-150">
                <span className="text-[10px] font-bold text-zinc-650 uppercase tracking-wide block">2. Target Audience</span>
                
                <div className="grid grid-cols-3 gap-2 p-1 bg-zinc-100/60 rounded-xl border border-zinc-200">
                  {([
                    { value: "grade", label: "By Grade" },
                    { value: "section", label: "By Section" },
                    { value: "all", label: "All Students" }
                  ] as const).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setBatchTargetType(opt.value)}
                      className={`py-1.5 text-[9px] font-bold rounded-lg transition-all cursor-pointer ${
                        batchTargetType === opt.value
                          ? "bg-white text-zinc-950 border border-zinc-200 shadow-xs"
                          : "bg-transparent text-zinc-400 hover:text-zinc-650 border border-transparent"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2.5 pt-1">
                  {batchTargetType !== "all" && (
                    <div className="flex-1 space-y-1">
                      <label className="text-[9px] font-bold text-zinc-450 uppercase tracking-wider block">Target Grade</label>
                      <select
                        value={batchTargetGrade}
                        onChange={(e) => setBatchTargetGrade(e.target.value)}
                        className="w-full bg-white border border-zinc-200 text-[11px] rounded-lg py-1.5 px-2.5 outline-none cursor-pointer text-zinc-650 font-medium"
                      >
                        {availableGrades.map((g) => (
                          <option key={g} value={g}>Grade {g}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {batchTargetType === "section" && (
                    <div className="flex-1 space-y-1">
                      <label className="text-[9px] font-bold text-zinc-450 uppercase tracking-wider block">Target Section</label>
                      <select
                        value={batchTargetSection}
                        onChange={(e) => setBatchTargetSection(e.target.value)}
                        className="w-full bg-white border border-zinc-200 text-[11px] rounded-lg py-1.5 px-2.5 outline-none cursor-pointer text-zinc-650 font-medium"
                      >
                        {availableSections.map((s) => (
                          <option key={s} value={s}>Section {s}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-zinc-150 flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={() => runBatchAdjustments("remove")}
                  variant="outline"
                  className="flex-1 bg-white hover:bg-rose-50 border-zinc-200 text-rose-700 hover:text-rose-900 font-bold h-10 text-xs rounded-xl cursor-pointer"
                >
                  Clear from Group
                </Button>
                <Button
                  onClick={() => runBatchAdjustments("add")}
                  className="flex-1 bg-[#1572FE] hover:bg-[#0f62d4] text-white font-bold h-10 text-xs rounded-xl cursor-pointer"
                >
                  Apply to Group
                </Button>
              </div>
            </Card>
          </div>

          {/* Target preview directory list column (7/12 width) */}
          <div className="lg:col-span-7 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">3. Target Student Group Checklist</h3>
              <p className="text-[11px] text-zinc-455">Manually check or uncheck individual students to include in this batch operation.</p>
            </div>

            <Card className="border border-zinc-200/80 shadow-sm bg-white rounded-2xl overflow-hidden card-accent-blue flex flex-col justify-between">
              <div>
                <CardHeader className="p-4 border-b border-zinc-150 bg-zinc-50/50 flex flex-row items-center justify-between">
                  <span className="text-xs font-bold text-zinc-700">
                    Target Group: {targetedStudentsForBatch.length} Students
                  </span>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => toggleAllTargets(true)}
                      className="text-[10px] text-zinc-500 hover:text-[#1572FE] px-2 py-0.5 h-7"
                    >
                      Check All
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => toggleAllTargets(false)}
                      className="text-[10px] text-zinc-500 hover:text-red-750 px-2 py-0.5 h-7"
                    >
                      Uncheck All
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  {targetedStudentsForBatch.length === 0 ? (
                    <div className="p-12 text-center text-zinc-400 text-xs">
                      No students are currently matching the targeted filters.
                    </div>
                  ) : (
                    <div className="max-h-96 overflow-y-auto divide-y divide-zinc-100">
                      {targetedStudentsForBatch.map((s) => {
                        const isChecked = !!checkedStudentIds[s._id];
                        const mods = s.financial_ledger?.custom_modifiers || [];
                        return (
                          <div 
                            key={s._id} 
                            onClick={() => toggleStudentCheck(s._id)}
                            className="flex items-center justify-between p-3.5 text-xs transition-colors hover:bg-zinc-50/30 cursor-pointer"
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}} // Controlled by row click
                                className="w-4 h-4 text-[#1572FE] border-zinc-300 rounded focus:ring-[#1572FE]/20"
                              />
                              <div>
                                <span className="font-bold text-zinc-800 block leading-tight">
                                  {s.personal_details.first_name} {s.personal_details.last_name}
                                </span>
                                <span className="text-[9px] text-zinc-400">Roll #{s.personal_details.roll_number} | ID: {s._id}</span>
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <Badge variant="secondary" className="font-normal text-[8px] py-0 px-1.5 bg-zinc-100 border border-zinc-200/50">
                                {mods.length} Adjustments
                              </Badge>
                              <span className="text-[10px] text-zinc-500 block font-semibold pt-0.5">
                                Current Balance: ₹{s.financial_ledger?.current_outstanding_balance.toLocaleString("en-IN")}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </div>

              <div className="p-4 border-t border-zinc-150 bg-zinc-50/50 text-[10px] text-zinc-400 font-light leading-relaxed">
                Note: Applying adjustments will append the discount/fee to all checkmarked students' billing structures. Clearing adjustments will search for any active modifiers with matching names on the checkmarked accounts and delete them.
              </div>
            </Card>
          </div>
        </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default function FinanceLedgerPage() {
  return (
    <Suspense fallback={<div className="text-center text-zinc-400 text-xs py-12">Loading ledger parameters...</div>}>
      <FinanceLedgerContent />
    </Suspense>
  );
}
