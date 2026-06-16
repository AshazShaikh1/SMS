"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { 
  Users, 
  Landmark, 
  UserPlus, 
  FileEdit, 
  ChevronRight, 
  ChevronLeft, 
  Wallet, 
  Loader2, 
  Download, 
  Search, 
  X,
  FileSpreadsheet
} from "lucide-react";
import { FinancialHealthBar } from "@/components/dashboard/FinancialHealthBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fetchStudents } from "@/lib/db/students";
import { recordPayment } from "@/lib/db/finance";
import { Student } from "@/lib/db/mockDb";
import { supabase } from "@/lib/supabase/client";

export default function StudentDirectoryPage() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState("School Directory");

  // Dynamic Filters lists
  const [availableGrades, setAvailableGrades] = useState<string[]>([]);
  const [availableSections, setAvailableSections] = useState<string[]>([]);

  // Search & Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("all");
  const [selectedSection, setSelectedSection] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Record Payment States
  const [selectedPaymentStudent, setSelectedPaymentStudent] = useState<Student | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState<"cash" | "upi" | "bank_transfer">("cash");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  // Export states
  const [isExportingData, setIsExportingData] = useState(false);
  const [isExportingTemplate, setIsExportingTemplate] = useState(false);

  // Load students, classes, and school info
  useEffect(() => {
    async function loadData() {
      // Session verification
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // Fetch School ID and name
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
        // Fetch dynamic classes from Supabase classes table
        const { data: classesData } = await supabase
          .from("classes")
          .select("grade_level, section")
          .eq("school_id", currentSchoolId);

        if (classesData) {
          // Extract unique grades (e.g. "9", "10")
          const grades = Array.from(new Set(classesData.map(c => c.grade_level?.replace("Grade ", "")) || []))
            .filter(Boolean)
            .sort((a, b) => {
              const numA = parseInt(a, 10);
              const numB = parseInt(b, 10);
              if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
              return a.localeCompare(b);
            });
          setAvailableGrades(grades);

          // Extract unique sections (e.g. "A", "B")
          const sections = Array.from(new Set(classesData.map(c => c.section) || []))
            .filter(Boolean)
            .sort();
          setAvailableSections(sections);
        }
      }

      const list = await fetchStudents();
      setStudents(list);
      setLoading(false);
    }
    loadData();
  }, [router]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedGrade, selectedSection]);

  // Filter logic
  const filteredStudents = students.filter((student) => {
    const p = student.personal_details;
    const a = student.academic_mapping;
    
    const fullName = `${p.first_name || ""} ${p.last_name || ""}`.toLowerCase();
    const matchesSearch = 
      fullName.includes(searchQuery.toLowerCase()) || 
      String(p.roll_number).includes(searchQuery) ||
      (student._id && student._id.toLowerCase().includes(searchQuery.toLowerCase()));
      
    // Selected grade filter handles both standard and stripped formats (e.g. "Grade 9" vs "9")
    const matchesGrade = selectedGrade === "all" || 
      String(a.current_grade) === selectedGrade || 
      `Grade ${a.current_grade}` === selectedGrade || 
      a.current_grade.replace("Grade ", "") === selectedGrade;

    const matchesSection = selectedSection === "all" || a.section === selectedSection;
    
    return matchesSearch && matchesGrade && matchesSection;
  });

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage) || 1;
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Record Payment Submission Handler
  const handleRecordPaymentSubmit = async () => {
    if (!selectedPaymentStudent) return;
    
    const amtStr = paymentAmount.trim();
    if (!amtStr) {
      setPaymentError("Please enter a payment amount.");
      return;
    }

    if (!/^\d+(\.\d+)?$/.test(amtStr)) {
      setPaymentError("Amount paid must contain only numbers.");
      return;
    }

    const amt = Number(amtStr);
    if (amt <= 0) {
      setPaymentError("Payment amount must be greater than zero.");
      return;
    }

    const outstandingBalance = selectedPaymentStudent.financial_ledger?.current_outstanding_balance || 0;
    if (amt > outstandingBalance) {
      setPaymentError(`Payment amount cannot exceed student's actual outstanding balance (₹${outstandingBalance.toLocaleString("en-IN")}).`);
      return;
    }

    setPaymentSubmitting(true);
    setPaymentError(null);

    const res = await recordPayment({
      schoolId: schoolId || "",
      studentId: selectedPaymentStudent.personal_details.student_profile_id || "",
      amountPaid: amt,
      paymentMode,
      referenceNumber: referenceNumber.trim() || undefined,
    });

    if (res.success) {
      const list = await fetchStudents();
      setStudents(list);
      setSelectedPaymentStudent(null);
      setPaymentAmount("");
      setPaymentMode("cash");
      setReferenceNumber("");
      setPaymentError(null);
    } else {
      setPaymentError(res.error || "Failed to record payment transaction.");
    }
    setPaymentSubmitting(false);
  };

  // Requirement 2: Export All Demographic Data for All Students
  const handleExportAllData = async () => {
    if (isExportingData) return;
    setIsExportingData(true);

    try {
      const EXPORT_HEADERS = [
        "Student ID", "Roll Number", "First Name", "Last Name", "Grade", "Section", "Outstanding Balance (₹)", "Base Fee (₹)",
        "Parent Name", "Parent Email", "Parent Phone", "Register No", "Gender", "Birth Date", "DOB In Words",
        "Birth Place", "Additional Phones", "Login Email", "Address", "Country", "State", "District",
        "Taluka", "Colony", "Distance from School", "Admit in Class", "Last Class Attended",
        "Last School Attended", "Admission Date", "Father Name", "Father Occupation", "Father Qualification",
        "Father UID (Aadhaar)", "Mother Name", "Mother Occupation", "Mother Qualification", "Mother UID",
        "Mother Tongue", "Guardian Name", "Sibling Info", "Single Parent", "Orphan", "Aadhaar Number",
        "AAPAAR ID", "PEN Number", "SARAL ID", "Nationality", "Religion", "Caste", "Sub Caste",
        "Progress", "Conduct", "Reason for Leaving", "Leaving Date", "Remarks", "Blood Group",
        "Height", "Weight", "Handicapped", "Muman", "QRCode", "RFID"
      ];

      // Fetch all students WITH demographic details (includeDemographics = true)
      const allStudents = await fetchStudents(undefined, undefined, true);

      const rows = allStudents.map(student => {
        const p = student.personal_details;
        const a = student.academic_mapping;
        const f = student.financial_ledger;

        return [
          student._id || "",
          p.roll_number || "",
          p.first_name || "",
          p.last_name || "",
          a.current_grade || "",
          a.section || "",
          f.current_outstanding_balance || 0,
          f.base_fee || 0,
          p.parent_name || "",
          p.parent_phone || "",
          p.register_no || "",
          p.gender || "",
          p.birth_date || "",
          p.dob_in_words || "",
          p.birth_place || "",
          p.phones || "",
          p.login_email || "",
          p.address || "",
          p.country || "",
          p.state || "",
          p.dist || "",
          p.taluka || "",
          p.colony || "",
          p.distance || "",
          p.admit_in_class || "",
          p.last_class || "",
          p.last_school_attended || "",
          p.admission_date || "",
          p.father_name || "",
          p.father_occupation || "",
          p.father_qualification || "",
          p.father_uid_no || "",
          p.mother_name || "",
          p.mother_occupation || "",
          p.mother_qualification || "",
          p.mother_uid_no || "",
          p.mother_tongue || "",
          p.guardian || "",
          p.sibling || "",
          p.single_parent ? "TRUE" : "FALSE",
          p.orphan ? "TRUE" : "FALSE",
          p.aadhar_number || "",
          p.aapar_id || "",
          p.pen_number || "",
          p.saral_id || "",
          p.nationality || "",
          p.religion || "",
          p.caste || "",
          p.sub_caste || "",
          p.progress || "",
          p.conduct || "",
          p.reason_for_leaving || "",
          p.leaving_date || "",
          p.remarks || "",
          p.bloodgroup || "",
          p.height || "",
          p.weight || "",
          p.handicap ? "TRUE" : "FALSE",
          p.muman || "",
          p.qrcode || "",
          p.rfid || ""
        ];
      });

      const wsData = [EXPORT_HEADERS, ...rows];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Student Records");

      const fileName = `${schoolName.toLowerCase().replace(/[^a-z0-9]/g, "")}_student_records.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (err) {
      console.error("Failed to export student data:", err);
    } finally {
      setIsExportingData(false);
    }
  };

  // Requirement 3: Export blank student intake CSV/Excel upload template
  const handleExportTemplate = () => {
    setIsExportingTemplate(true);
    try {
      const EXPORT_HEADERS = [
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

      const SAMPLE_ROW = [
        "add", "", "John Doe", "1", "9876543210", "10th", "A", "PKG_GRADE_10", "FALSE",
        "John", "Doe", "REG1001", "Male", "2010-05-15", "Fifteenth May Two Thousand Ten", "New Delhi",
        "9876543210", "john.doe@school.edu", "123 Academic Street", "India", "Delhi", "New Delhi",
        "New Delhi", "Vasant Kunj", "2.5 km", "Grade 9", "Grade 9", "Greenwoods Public School", "2024-04-01",
        "Robert Doe", "Business", "MBA", "123456789012", "Mary Doe", "Homemaker", "Graduate", "987654321098",
        "English", "", "", "FALSE", "FALSE", "112233445566", "AAR1234", "PEN123", "SAR123", "Indian",
        "Christianity", "General", "", "Good", "Excellent", "", "", "New Student", "O+", "145 cm", "40 kg",
        "FALSE", "", "", ""
      ];

      const wsData = [EXPORT_HEADERS, SAMPLE_ROW];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Intake Template");

      XLSX.writeFile(wb, "student_intake_roster_template.xlsx");
    } catch (err) {
      console.error("Failed to export intake template:", err);
    } finally {
      setIsExportingTemplate(false);
    }
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedGrade("all");
    setSelectedSection("all");
  };

  return (
    <div className="space-y-8 animate-fade-in relative pb-12">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Student Directory</h1>
          <p className="text-xs text-zinc-505 mt-0.5">Manage records, filter by dynamic grade/section divisions, and export demographic databases.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={handleExportAllData}
            disabled={isExportingData}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer text-xs h-9"
          >
            {isExportingData ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Exporting...
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" /> Export Student Data
              </>
            )}
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportTemplate}
            disabled={isExportingTemplate}
            className="gap-2 border-zinc-200 text-zinc-700 hover:bg-zinc-50 font-semibold cursor-pointer text-xs h-9"
          >
            {isExportingTemplate ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Preparing...
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-3.5 h-3.5 text-blue-800" /> Export Intake Template
              </>
            )}
          </Button>

          <Link href="/admin/intake">
            <Button size="sm" variant="outline" className="gap-2 text-xs font-semibold cursor-pointer h-9">
              <UserPlus className="w-4 h-4 text-blue-800" /> Upload Roster
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar Card */}
      <div className="bg-white border border-zinc-200/60 p-4 rounded-2xl shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search students by name, roll number, or profile ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-50/50 border border-zinc-200 focus:border-[#1572FE] focus:ring-1 focus:ring-[#1572FE]/10 text-xs rounded-xl py-2.5 pl-10 pr-4 outline-none"
            />
          </div>

          <div className="flex gap-2">
            {/* Grade Select */}
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="bg-zinc-50/50 border border-zinc-200 focus:border-[#1572FE] focus:ring-1 focus:ring-[#1572FE]/10 text-xs rounded-xl py-2 px-3 outline-none cursor-pointer h-9 font-medium text-zinc-700"
            >
              <option value="all">All Grades</option>
              {availableGrades.map((grade) => (
                <option key={grade} value={grade}>
                  Grade {grade}
                </option>
              ))}
            </select>

            {/* Section Select */}
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="bg-zinc-50/50 border border-zinc-200 focus:border-[#1572FE] focus:ring-1 focus:ring-[#1572FE]/10 text-xs rounded-xl py-2 px-3 outline-none cursor-pointer h-9 font-medium text-zinc-700"
            >
              <option value="all">All Sections</option>
              {availableSections.map((sec) => (
                <option key={sec} value={sec}>
                  Section {sec}
                </option>
              ))}
            </select>

            {/* Clear Button */}
            {(searchQuery || selectedGrade !== "all" || selectedSection !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="text-zinc-505 hover:text-zinc-800 text-xs h-9"
              >
                Clear
              </Button>
            )}
          </div>
        </div>
        
        {/* Results indicator */}
        <div className="text-[10px] text-zinc-405 font-medium">
          Showing {filteredStudents.length} matching students in the directory roster.
        </div>
      </div>

      {/* Directory Table View Card */}
      <Card className="card-premium p-0 bg-white border border-zinc-200/50 shadow-sm rounded-2xl overflow-hidden card-accent-indigo">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-100 text-left text-sm">
            <thead className="bg-zinc-50/50 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
              <tr>
                <th scope="col" className="px-6 py-4">Roll</th>
                <th scope="col" className="px-6 py-4">Student Name</th>
                <th scope="col" className="px-6 py-4">Grade & Section</th>
                <th scope="col" className="px-6 py-4">Outstanding Balance</th>
                <th scope="col" className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-zinc-400 text-xs">
                    Loading student records...
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-zinc-400 text-xs">
                    No matching student records found.
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((student) => (
                  <tr key={student._id} className="hover:bg-zinc-50/30 transition-colors border-b border-zinc-100">
                    <td className="px-6 py-4 text-zinc-500 text-xs font-semibold">
                      #{student.personal_details.roll_number}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 text-blue-800 font-semibold flex items-center justify-center rounded-full text-sm uppercase shrink-0 shadow-sm border border-blue-100">
                          {student.personal_details.first_name ? student.personal_details.first_name[0] : "S"}
                        </div>
                        <div>
                          <span className="font-semibold text-zinc-900 block leading-tight">
                            {student.personal_details.first_name} {student.personal_details.last_name}
                          </span>
                          <span className="text-[10px] text-zinc-400">ID: {student._id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="secondary" className="font-normal text-[10px] py-0.5 px-2 bg-zinc-100 border border-zinc-200/50">
                        Grade {student.academic_mapping.current_grade} - {student.academic_mapping.section}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 font-bold text-zinc-800 text-xs">
                      ₹{student.financial_ledger?.current_outstanding_balance.toLocaleString("en-IN")}
                    </td>
                    <td className="px-6 py-4 text-right text-xs">
                      <div className="flex items-center justify-end gap-3.5">
                        <button
                          onClick={() => setSelectedPaymentStudent(student)}
                          className="inline-flex items-center gap-1.5 text-orange-700 hover:text-orange-900 font-bold transition-colors cursor-pointer"
                        >
                          Record Payment
                        </button>
                        <Link
                          href={`/admin/finance?studentId=${student._id}`}
                          className="inline-flex items-center gap-1.5 text-blue-800 hover:text-emerald-950 font-bold transition-colors"
                        >
                          <FileEdit className="w-3.5 h-3.5" /> Edit Fees
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View Roster List */}
        <div className="space-y-4 md:hidden p-4">
          {loading ? (
            <div className="p-8 text-center text-zinc-405 text-xs bg-white border border-zinc-100 rounded-xl">
              Loading student records...
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-8 text-center text-zinc-405 text-xs bg-white border border-zinc-100 rounded-xl">
              No matching student records found.
            </div>
          ) : (
            paginatedStudents.map((student) => (
              <div key={student._id} className="p-4 space-y-4 bg-white border border-zinc-100 rounded-xl">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 text-blue-800 font-semibold flex items-center justify-center rounded-full text-xs uppercase shadow-sm border border-blue-100">
                      {student.personal_details.first_name ? student.personal_details.first_name[0] : "S"}
                    </div>
                    <div>
                      <span className="font-semibold text-zinc-900 block leading-tight text-sm">
                        {student.personal_details.first_name} {student.personal_details.last_name}
                      </span>
                      <span className="text-[10px] text-zinc-400">Roll: #{student.personal_details.roll_number} | ID: {student._id}</span>
                    </div>
                  </div>
                  <Badge variant="secondary" className="font-normal text-[10px] py-0.5 px-2 bg-zinc-100 border border-zinc-200/50">
                    Grade {student.academic_mapping.current_grade}-{student.academic_mapping.section}
                  </Badge>
                </div>
                <div className="flex items-center justify-between border-t border-zinc-100 pt-3 text-xs">
                  <div>
                    <span className="text-zinc-400 block text-[10px] uppercase font-bold tracking-wider">Unpaid Fees</span>
                    <span className="font-bold text-zinc-800 text-sm">
                      ₹{student.financial_ledger?.current_outstanding_balance.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedPaymentStudent(student)}
                      className="gap-1.5 px-3 py-1.5 h-8 text-xs border-zinc-250 hover:bg-blue-50/20 hover:border-[#1572FE] hover:text-[#1572FE] font-semibold cursor-pointer"
                    >
                      Record Payment
                    </Button>
                    <Link href={`/admin/finance?studentId=${student._id}`}>
                      <Button size="sm" variant="outline" className="gap-1.5 px-3 py-1.5 h-8 text-xs border-zinc-250 hover:bg-blue-50/20 hover:border-[#1572FE] hover:text-[#1572FE] font-semibold">
                        <FileEdit className="w-3.5 h-3.5" /> Edit Fees
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Roster Pagination Footer */}
        {!loading && totalPages > 1 && (
          <div className="p-4 bg-zinc-50/50 border-t border-zinc-150 flex items-center justify-between text-xs text-zinc-550 select-none rounded-b-2xl">
            <div>
              Showing <span className="font-semibold text-zinc-800">{((currentPage - 1) * itemsPerPage) + 1}</span> to{" "}
              <span className="font-semibold text-zinc-800">
                {Math.min(currentPage * itemsPerPage, filteredStudents.length)}
              </span>{" "}
              of <span className="font-semibold text-zinc-800">{filteredStudents.length}</span> students
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
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
                onClick={() => setCurrentPage(currentPage + 1)}
                className="h-8 gap-1 font-semibold text-xs border-zinc-200"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Sliding Payment Panel */}
      {selectedPaymentStudent && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-fade-in"
            onClick={() => {
              setSelectedPaymentStudent(null);
              setPaymentAmount("");
              setPaymentMode("cash");
              setReferenceNumber("");
              setPaymentError(null);
            }}
          />

          {/* Panel */}
          <div className="relative w-full max-w-md bg-[#FAF9F6] h-full shadow-2xl flex flex-col border-l border-zinc-200 z-10 transition-all duration-300">
            {/* Header with light peach accent */}
            <div className="bg-gradient-to-r from-[#fff7f2] to-[#fffcfb] p-6 border-b border-[#fed7aa] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">Record Fee Payment</h3>
                <p className="text-[10px] text-zinc-400 mt-0.5">
                  Register payment for {selectedPaymentStudent.personal_details.first_name} {selectedPaymentStudent.personal_details.last_name}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedPaymentStudent(null);
                  setPaymentAmount("");
                  setPaymentMode("cash");
                  setReferenceNumber("");
                  setPaymentError(null);
                }}
                className="text-zinc-405 hover:text-zinc-600 font-bold text-xs p-1.5 rounded-lg hover:bg-zinc-150 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              {/* Live Outstanding Balance Card */}
              <div className="bg-[#fff8f5] border border-[#ffedd5] p-5 rounded-2xl space-y-1 shadow-xs">
                <span className="text-[9px] font-bold text-[#ea580c] uppercase tracking-wider block">
                  Current Outstanding Balance
                </span>
                <div className="text-2xl font-extrabold text-orange-950 font-mono">
                  ₹{selectedPaymentStudent.financial_ledger?.current_outstanding_balance.toLocaleString("en-IN")}
                </div>
              </div>

              {/* Input Fields */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">Amount Paid (₹)</label>
                  <input
                    type="text"
                    placeholder="e.g. 15000"
                    value={paymentAmount}
                    onChange={(e) => {
                      setPaymentAmount(e.target.value);
                      setPaymentError(null);
                    }}
                    className="w-full input-premium bg-white border border-zinc-200 focus:border-[#ea580c] focus:ring-[#ea580c]/15 text-sm rounded-xl py-2 px-3 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">Payment Mode</label>
                  <div className="grid grid-cols-3 gap-1.5 p-1 bg-zinc-100/80 rounded-xl border border-zinc-200">
                    {(["cash", "upi", "bank_transfer"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setPaymentMode(mode)}
                        className={`py-1.5 text-[10px] font-bold rounded-lg capitalize transition-all cursor-pointer ${
                          paymentMode === mode
                            ? "bg-[#fff2eb] text-[#ea580c] border border-[#fed7aa] shadow-xs"
                            : "bg-transparent text-zinc-400 hover:text-zinc-700 border border-transparent"
                        }`}
                      >
                        {mode.replace("_", " ")}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">Reference Number (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. TXN987293810, Cash receipt #5"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    className="w-full input-premium bg-white border border-zinc-200 focus:border-[#ea580c] focus:ring-[#ea580c]/15 text-sm rounded-xl py-2 px-3 outline-none"
                  />
                </div>
              </div>

              {/* Error messages */}
              {paymentError && (
                <div className="bg-red-50 border border-red-100 text-[#b91c1c] p-3 rounded-xl text-xs font-semibold">
                  {paymentError}
                </div>
              )}
            </div>

            {/* Footer buttons */}
            <div className="p-6 border-t border-zinc-100 bg-white flex items-center justify-end gap-3 shrink-0">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedPaymentStudent(null);
                  setPaymentAmount("");
                  setPaymentMode("cash");
                  setReferenceNumber("");
                  setPaymentError(null);
                }}
                className="border-zinc-200 text-zinc-505 hover:bg-zinc-50 font-semibold rounded-xl h-9"
              >
                Cancel
              </Button>
              <Button
                onClick={handleRecordPaymentSubmit}
                disabled={paymentSubmitting}
                className="bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold px-4 py-2 rounded-xl h-9 shadow-sm hover:shadow transition-all flex items-center justify-center gap-1.5 border border-[#ea580c]"
              >
                {paymentSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Recording...
                  </>
                ) : (
                  "Record Payment"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
