"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Landmark, Calendar, Award, FileText, CheckCircle, HelpCircle, Download, Loader2, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getStudentLedger, calculateOutstandingBalance, fetchTransactionsForStudent, FeeTransaction } from "@/lib/db/finance";
import { calculateWeightedGrades } from "@/lib/db/gradebooks";
import { Student, Gradebook } from "@/lib/db/mockDb";
import { supabase } from "@/lib/supabase/client";
import ChildSelector, { SiblingChild } from "./dashboard/components/ChildSelector";
import { fetchClassAttendanceHistory } from "@/lib/db/attendance";

export default function ParentDashboard() {
  const router = useRouter();
  const [children, setChildren] = useState<(Student & { student_profile_id: string; class_id: string })[]>([]);
  const [activeStudentId, setActiveStudentId] = useState("");
  
  // Ledger, gradebook, and attendance maps
  const [ledger, setLedger] = useState<{ baseFee: number; modifiers: any[]; outstandingBalance: number } | null>(null);
  const [gradebook, setGradebook] = useState<Gradebook | null>(null);
  const [attendanceRate, setAttendanceRate] = useState<number | null>(null);
  const [attendanceStats, setAttendanceStats] = useState<{ present: number; absent: number; late: number } | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [transactions, setTransactions] = useState<FeeTransaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);

  // Load children mapped to this parent
  useEffect(() => {
    async function loadParentData() {
      setLoading(true);
      
      // 1. Verify session
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // 2. Query students where parent_id = user.id
      const { data: childrenData, error: childrenError } = await supabase
        .from("students")
        .select(`
          id,
          roll_number,
          fee_modifiers,
          parent_id,
          profile_id,
          profile:profiles!students_profile_id_fkey(full_name, email),
          class:classes!students_class_id_fkey(id, grade_level, section, base_fee_amount)
        `)
        .eq("parent_id", user.id);

      if (childrenError || !childrenData) {
        console.error("Error fetching linked children:", childrenError);
        setLoading(false);
        return;
      }

      const mapped = childrenData.map((row: any) => {
        const fullName = row.profile?.full_name || "";
        const parts = fullName.trim().split(/\s+/);
        const first_name = parts[0] || "";
        const last_name = parts.slice(1).join(" ") || "";
        
        const current_grade = row.class?.grade_level?.replace("Grade ", "") || "";
        const sectionVal = row.class?.section || "";
        const baseFee = Number(row.class?.base_fee_amount) || 0;
        const modifiers = (row.fee_modifiers as any) || [];
        const outstanding = calculateOutstandingBalance(baseFee, modifiers);

        return {
          _id: row.id,
          student_profile_id: row.profile_id,
          class_id: row.class?.id || "",
          personal_details: {
            first_name,
            last_name,
            roll_number: row.roll_number,
            parent_id: row.parent_id || undefined,
          },
          academic_mapping: {
            current_grade,
            section: sectionVal,
            assigned_subjects: ["MATH_101"],
          },
          financial_ledger: {
            base_fee_package_id: `PKG_GRADE_${current_grade}`,
            custom_modifiers: modifiers,
            current_outstanding_balance: outstanding,
          },
        };
      });

      setChildren(mapped);

      if (mapped.length > 0) {
        setActiveStudentId(mapped[0]._id);
      }
      setLoading(false);
    }
    loadParentData();
  }, [router]);

  // Fetch ledger and grade details whenever active child changes
  useEffect(() => {
    if (!activeStudentId) return;

    async function loadChildDetails() {
      setDetailsLoading(true);
      const child = children.find((c) => c._id === activeStudentId);
      if (child) {
        try {
          // 1. Fetch Ledger
          const l = await getStudentLedger(activeStudentId);
          setLedger(l);

          // 2. Fetch published gradebooks for this child's class
          const { data: gbData } = await supabase
            .from("gradebooks")
            .select("*")
            .eq("class_id", child.class_id)
            .eq("status", "published");

          // Filter and map MATH_101 assessments
          const mathAssessments = (gbData || [])
            .filter((row: any) => row.assessment_name.startsWith("MATH_101:"))
            .map((row: any) => ({
              assessment_id: row.id,
              title: row.assessment_name.replace("MATH_101:", ""),
              type: row.assessment_type,
              max_marks: Number(row.total_marks),
              weight_percentage: Number(row.weight_percentage),
              scores: {
                [activeStudentId]: row.scores?.[child.student_profile_id] // Lookup by child's profile UUID
              } as any,
            }));

          if (mathAssessments.length > 0) {
            setGradebook({
              _id: child.class_id,
              status: "published",
              metadata: {
                academic_year: "2026",
                term: "Term 1",
                grade_level: child.academic_mapping.current_grade,
                section: child.academic_mapping.section,
                subject_id: "MATH_101",
                instructor_id: "TCH_3021",
              },
              assessments: mathAssessments,
            });
          } else {
            setGradebook(null);
          }

          // 3. Fetch live attendance rate history
          const history = await fetchClassAttendanceHistory(
            child.academic_mapping.current_grade,
            child.academic_mapping.section
          );

          let present = 0;
          let absent = 0;
          let late = 0;

          for (const record of history) {
            const status = record.records[activeStudentId] || record.records[child.student_profile_id];
            if (status === "present") present++;
            else if (status === "absent") absent++;
            else if (status === "late") late++;
          }

          const totalDays = present + absent + late;
          const rate = totalDays > 0 ? Math.round(((present + late * 0.5) / totalDays) * 100) : 100;
          
          setAttendanceRate(rate);
          setAttendanceStats({ present, absent, late });

          // 4. Fetch Transactions
          setTransactionsLoading(true);
          const txs = await fetchTransactionsForStudent(child.student_profile_id);
          setTransactions(txs);
          setTransactionsLoading(false);
        } catch (e) {
          console.error("Error loading child details:", e);
        }
      }
      setDetailsLoading(false);
    }
    loadChildDetails();
  }, [activeStudentId, children]);

  // Real-time listener for child fee transactions
  useEffect(() => {
    const child = children.find((c) => c._id === activeStudentId);
    const profileId = child?.student_profile_id;
    if (!activeStudentId || !profileId) return;

    const channel = supabase
      .channel(`parent-portal-payments-${activeStudentId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "fee_transactions",
          filter: `student_id=eq.${profileId}`,
        },
        async (payload) => {
          console.log("Real-time transaction change received:", payload);
          const l = await getStudentLedger(activeStudentId);
          setLedger(l);
          const txList = await fetchTransactionsForStudent(profileId);
          setTransactions(txList);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeStudentId, children]);

  if (loading) {
    return <div className="text-center text-xs text-zinc-405 py-12">Loading child data portals...</div>;
  }

  if (children.length === 0) {
    return (
      <div className="text-center text-xs text-zinc-405 py-12">
        No registered student records linked to parent account.
      </div>
    );
  }

  const selectedChild = children.find((c) => c._id === activeStudentId);
  const performance = selectedChild && gradebook ? calculateWeightedGrades(gradebook, [activeStudentId])[activeStudentId] : null;

  const handlePrintScorecard = () => {
    window.print();
  };

  // Build the selector child rail details list
  const childSelectorList: SiblingChild[] = children.map((c) => ({
    id: c._id,
    name: c.personal_details.first_name,
    gradeSection: `${c.academic_mapping.current_grade}-${c.academic_mapping.section}`,
  }));

  return (
    <div className="space-y-6">
      {/* Print styles override to print clean scorecard */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-scorecard, #printable-scorecard * {
            visibility: visible;
          }
          #printable-scorecard {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none;
            box-shadow: none;
          }
        }
      `}</style>

      {/* Sibling Child Switcher Rail */}
      <ChildSelector
        childrenList={childSelectorList}
        activeStudentId={activeStudentId}
        onSelect={(id) => setActiveStudentId(id)}
      />

      {selectedChild && ledger && (
        <div className="space-y-6">
          {/* Billing outstanding Card */}
          <Card className="border border-zinc-200 shadow-xs">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
                Remaining Balance Due
                <Badge variant={ledger.outstandingBalance > 0 ? "warning" : "success"} className="py-0.5 px-2 text-[10px] font-semibold">
                  {ledger.outstandingBalance > 0 ? "Outstanding" : "Paid"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0 space-y-4">
              {detailsLoading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-[#064e3b]" />
                </div>
              ) : (
                <>
                  <div>
                    <div className="text-3xl font-bold text-zinc-900">₹{ledger.outstandingBalance.toLocaleString("en-IN")}</div>
                    <p className="text-[10px] text-zinc-405 flex items-center gap-1.5 mt-1 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-zinc-400" /> Payment Deadline: June 30, 2026
                    </p>
                  </div>

                  {ledger.modifiers.length > 0 && (
                    <div className="border-t border-zinc-150 pt-3 space-y-1.5">
                      <span className="text-[10px] font-bold text-zinc-800 uppercase tracking-wide">Discounts & Fee Breakdown</span>
                      <div className="space-y-1">
                        {ledger.modifiers.map((mod) => {
                          const isDiscount = mod.application === "discount";
                          const amt = mod.type === "percentage" ? (mod.value / 100) * ledger.baseFee : mod.value;
                          return (
                            <div key={mod.id} className="flex justify-between items-center text-xs text-zinc-500">
                              <span>{mod.label}</span>
                              <span className={isDiscount ? "text-emerald-950 font-semibold" : "text-red-750 font-semibold"}>
                                {isDiscount ? "-" : "+"}₹{amt.toLocaleString("en-IN")}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Historical Transactions List Card */}
          <Card className="border border-zinc-200 shadow-xs overflow-hidden border-l-4 border-l-[#fed7aa]">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Payment Ledger Receipts
              </CardTitle>
              <CardDescription className="text-[10px] text-zinc-450 mt-0.5">
                Historical fee collection entries for this child
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0 space-y-4">
              {transactionsLoading ? (
                <div className="flex justify-center items-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-[#ea580c]" />
                </div>
              ) : transactions.length === 0 ? (
                <p className="text-xs text-zinc-450 italic py-2">No payment transactions found.</p>
              ) : (
                <div className="divide-y divide-zinc-150">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="py-3 flex justify-between items-center text-xs first:pt-0 last:pb-0">
                      <div className="space-y-1">
                        <span className="font-bold text-zinc-800 block text-sm">
                          ₹{Number(tx.amount_paid).toLocaleString("en-IN")}
                        </span>
                        <span className="text-[10px] text-zinc-405 block">
                          Mode: <span className="capitalize font-semibold text-zinc-600">{tx.payment_mode}</span>
                          {tx.reference_number && ` | Ref: ${tx.reference_number}`}
                        </span>
                      </div>
                      <div className="text-right space-y-1">
                        <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9.5px] font-bold py-0.5 px-1.5">
                          Success
                        </Badge>
                        <span className="text-[9px] text-zinc-400 block font-medium">
                          {new Date(tx.created_at).toLocaleDateString("en-IN")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Live Attendance Tracking Card */}
          <Card className="border border-zinc-200 shadow-xs">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
                Live Attendance Tracking
                <Badge variant={attendanceRate !== null && attendanceRate >= 75 ? "success" : "warning"} className="py-0.5 px-2 text-[10px] font-semibold">
                  {attendanceRate !== null ? `${attendanceRate}% Attendance` : "No Record"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0 space-y-4">
              {detailsLoading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-[#064e3b]" />
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="text-3xl font-bold text-zinc-900">{attendanceRate}%</div>
                      <p className="text-[10px] text-zinc-400 font-light leading-normal">Cumulative attendance rate for the current term</p>
                    </div>
                    {/* Circular progress bar */}
                    <div className="relative w-12 h-12 shrink-0">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-zinc-100"
                          strokeWidth="3.5"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className="text-[#064e3b]"
                          strokeWidth="3.5"
                          strokeDasharray={`${attendanceRate || 0}, 100`}
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                    </div>
                  </div>

                  {attendanceStats && (
                    <div className="grid grid-cols-3 gap-2 pt-3 border-t border-zinc-150 text-center text-xs">
                      <div className="bg-emerald-50/50 p-2 rounded-xl border border-emerald-100/30">
                        <span className="text-zinc-400 text-[9px] uppercase font-bold tracking-wider block">Present</span>
                        <span className="font-bold text-zinc-800">{attendanceStats.present} day(s)</span>
                      </div>
                      <div className="bg-red-50/30 p-2 rounded-xl border border-red-100/20">
                        <span className="text-zinc-400 text-[9px] uppercase font-bold tracking-wider block">Absent</span>
                        <span className="font-bold text-[#b91c1c]">{attendanceStats.absent} day(s)</span>
                      </div>
                      <div className="bg-amber-50/50 p-2 rounded-xl border border-amber-100/30">
                        <span className="text-zinc-400 text-[9px] uppercase font-bold tracking-wider block">Late</span>
                        <span className="font-bold text-zinc-800">{attendanceStats.late} day(s)</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Academic scorecard printable container */}
          <Card id="printable-scorecard" className="border border-zinc-200 shadow-xs relative overflow-hidden">
            {/* Watermark for prints */}
            <div className="hidden print:block absolute top-10 right-10 text-emerald-950/10 uppercase font-black text-6xl tracking-widest pointer-events-none select-none">
              Verified
            </div>

            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-850" /> Term 1 Report Card
              </CardTitle>
            </CardHeader>
            
            <CardContent className="p-5 pt-0 space-y-5">
              {detailsLoading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-[#064e3b]" />
                </div>
              ) : (
                <>
                  {/* Header profile metadata for printed copies */}
                  <div className="hidden print:block border-b border-zinc-250 pb-3 mb-4 text-xs text-zinc-600">
                    <div className="flex justify-between items-end">
                      <div>
                        <h2 className="text-lg font-bold text-zinc-900 leading-none">Antigravity School Academy</h2>
                        <span className="text-[10px] text-zinc-405 block mt-0.5">Unified Grade Scorecard System</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-zinc-800 block">Student: {selectedChild.personal_details.first_name} {selectedChild.personal_details.last_name}</span>
                        <span className="text-[10px] text-zinc-405 block">Grade Level {selectedChild.academic_mapping.current_grade}-{selectedChild.academic_mapping.section}</span>
                      </div>
                    </div>
                  </div>

                  {performance ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-zinc-800 text-sm block">Mathematics</span>
                        <span className="text-[10px] text-zinc-400">Class Average for Term 1</span>
                      </div>
                      <div className="text-right flex items-center gap-4">
                        <div>
                          <span className="text-xl font-bold text-zinc-800 font-mono block leading-none">{performance.percentage}%</span>
                          <span className="text-[10px] text-zinc-400 mt-0.5 block">Weight: {performance.maxScore}%</span>
                        </div>
                        <Badge variant="primary" className="py-1 px-3 text-sm font-bold w-10 h-10 rounded-full flex items-center justify-center">
                          {performance.gradeLetter}
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <div className="text-zinc-405 text-xs text-center py-2">No gradebooks computed for this term yet.</div>
                  )}

                  {/* Score breakdown */}
                  {gradebook && gradebook.assessments.length > 0 && (
                    <div className="border-t border-zinc-150 pt-4 space-y-2">
                      <span className="text-[10px] font-bold text-zinc-800 uppercase tracking-wide">Exam & Test Breakdown</span>
                      <div className="space-y-2.5">
                        {gradebook.assessments.map((asm) => {
                          const score = asm.scores[activeStudentId];
                          return (
                            <div key={asm.assessment_id} className="flex justify-between items-center text-xs pb-2 border-b border-zinc-100 last:border-0 last:pb-0">
                              <div>
                                <span className="text-zinc-700 font-medium block">{asm.title}</span>
                                <span className="text-[9px] text-zinc-405 font-medium capitalize">
                                  Type: {asm.type.replace("_", " ")} ({asm.weight_percentage}% weight)
                                </span>
                              </div>
                              <span className="font-semibold text-zinc-850 font-mono">
                                {score !== undefined ? `${score} / ${asm.max_marks}` : "Unrecorded"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Print/Save Scorecard Button */}
          <Button onClick={handlePrintScorecard} variant="outline" className="w-full gap-2 border-zinc-250 hover:bg-emerald-50/20 hover:border-emerald-600 hover:text-emerald-950 font-semibold shadow-xs cursor-pointer">
            <Download className="w-4 h-4" /> Compile Term 1 Report (Save PDF)
          </Button>
        </div>
      )}
    </div>
  );
}
