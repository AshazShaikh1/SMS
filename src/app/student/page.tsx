"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Landmark, Calendar, Award, CheckCircle, Clock, AlertTriangle, Info } from "lucide-react";
import { AttendanceProgressRing } from "@/components/dashboard/AttendanceProgressRing";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { calculateOutstandingBalance } from "@/lib/db/finance";
import { calculateWeightedGrades } from "@/lib/db/gradebooks";
import { Student, Gradebook, ExamNotice } from "@/lib/db/mockDb";
import { supabase } from "@/lib/supabase/client";

export default function StudentDashboard() {
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [student, setStudent] = useState<Student | null>(null);
  const [ledger, setLedger] = useState<{ baseFee: number; modifiers: any[]; outstandingBalance: number } | null>(null);
  const [gradebooks, setGradebooks] = useState<Gradebook[]>([]);
  const [examNotices, setExamNotices] = useState<ExamNotice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStudentData() {
      setLoading(true);
      
      // 1. Verify session
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // 2. Fetch Student record linked to profiles.id === user.id
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select(`
          id,
          roll_number,
          fee_modifiers,
          class_id,
          parent_id,
          profile:profiles!students_profile_id_fkey(full_name, email),
          class:classes!students_class_id_fkey(id, grade_level, section, base_fee_amount)
        `)
        .eq("profile_id", user.id)
        .single();

      if (studentError || !studentData) {
        console.error("Student profile mapping not found in database:", studentError);
        setLoading(false);
        return;
      }

      setStudentId(studentData.id);

      const fullName = (studentData.profile as any)?.full_name || "";
      const parts = fullName.trim().split(/\s+/);
      const first_name = parts[0] || "";
      const last_name = parts.slice(1).join(" ") || "";
      
      const current_grade = (studentData.class as any)?.grade_level?.replace("Grade ", "") || "";
      const sectionVal = (studentData.class as any)?.section || "";
      const baseFee = Number((studentData.class as any)?.base_fee_amount) || 0;
      const modifiers = (studentData.fee_modifiers as any) || [];
      const outstanding = calculateOutstandingBalance(baseFee, modifiers);

      const mappedStudent: Student = {
        _id: studentData.id,
        personal_details: {
          first_name,
          last_name,
          roll_number: studentData.roll_number,
          parent_id: studentData.parent_id || undefined,
        },
        academic_mapping: {
          current_grade,
          section: sectionVal,
          assigned_subjects: ["MATH_101", "SCI_202", "ENG_303"],
        },
        financial_ledger: {
          base_fee_package_id: `PKG_GRADE_${current_grade}`,
          custom_modifiers: modifiers,
          current_outstanding_balance: outstanding,
        },
      };

      setStudent(mappedStudent);
      setLedger({
        baseFee,
        modifiers,
        outstandingBalance: outstanding,
      });

      // 3. Fetch published gradebooks
      const { data: gbData, error: gbError } = await supabase
        .from("gradebooks")
        .select("*")
        .eq("class_id", studentData.class_id)
        .eq("status", "published");

      if (!gbError && gbData) {
        const subjectGradebooksMap: Record<string, Gradebook> = {};
        gbData.forEach((row: any) => {
          const parts = row.assessment_name.split(":");
          const subId = parts[0] || "GENERAL";
          const title = parts.slice(1).join(":") || row.assessment_name;

          if (!subjectGradebooksMap[subId]) {
            subjectGradebooksMap[subId] = {
              _id: `${studentData.class_id}_${subId}`,
              status: "published",
              metadata: {
                academic_year: "2026",
                term: "Term 1",
                grade_level: current_grade,
                section: sectionVal,
                subject_id: subId,
                instructor_id: "TCH_3021",
              },
              assessments: [],
            };
          }

          const score = row.scores?.[user.id]; // key is student's profile UUID

          subjectGradebooksMap[subId].assessments.push({
            assessment_id: row.id,
            title,
            type: row.assessment_type,
            max_marks: Number(row.total_marks),
            weight_percentage: Number(row.weight_percentage),
            scores: {
              [studentData.id]: score !== undefined ? Number(score) : undefined,
            } as any,
          });
        });
        setGradebooks(Object.values(subjectGradebooksMap));
      }

      // 4. Fetch exam notices
      const { data: noticesData } = await supabase
        .from("exam_notices")
        .select("*")
        .eq("class_id", studentData.class_id)
        .order("exam_date", { ascending: true });

      if (noticesData) {
        setExamNotices(noticesData as any[]);
      }

      setLoading(false);
    }
    loadStudentData();
  }, [router]);

  if (loading) {
    return <div className="text-center text-xs text-zinc-400 py-12">Loading your information...</div>;
  }

  if (!student || !ledger) {
    return <div className="text-center text-xs text-zinc-400 py-12">Failed to load student profile.</div>;
  }

  // Helper to resolve subject names
  const subjectNames: Record<string, string> = {
    "MATH_101": "Mathematics",
    "SCI_202": "Sciences",
    "ENG_303": "English Grammar",
  };
  const getSubjectName = (id: string) => subjectNames[id] || id;

  // Filter gradebooks to only show published scores
  const publishedGradebooks = gradebooks.filter((gb) => gb.status === "published");

  // Determine notices within next 7 days
  const now = new Date();
  const sevenDaysLater = new Date();
  sevenDaysLater.setDate(now.getDate() + 7);

  const isWithin7Days = (dateStr: string) => {
    const d = new Date(dateStr);
    const dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const maxDate = new Date(sevenDaysLater.getFullYear(), sevenDaysLater.getMonth(), sevenDaysLater.getDate());
    return dDate >= nowDate && dDate <= maxDate;
  };

  const upcomingExamNotices = examNotices.filter((n) => isWithin7Days(n.exam_date));

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden px-1">
      {/* Welcome Card */}
      <div className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight text-zinc-900">
          Hello, {student.personal_details.first_name}!
        </h1>
        <p className="text-xs text-zinc-405 font-normal">Grade {student.academic_mapping.current_grade}, Section {student.academic_mapping.section}</p>
      </div>

      {/* Today's Schedule & Exam Alerts */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Today's Schedule & Notices</h3>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin w-full max-w-full">
          {/* Inject upcoming exams within next 7 days at the absolute top/start of the stream */}
          {upcomingExamNotices.map((notice) => (
            <div key={notice.id} className="flex-none bg-[#FEF3C7] text-zinc-900 border border-amber-500/25 rounded-lg p-3 text-xs min-w-[200px] shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-[9px] font-bold text-amber-800 uppercase tracking-wider mb-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>Exam Notice (Next 7 Days)</span>
                </div>
                <span className="font-bold text-zinc-950 block truncate">{notice.exam_title}</span>
                <span className="text-[10px] text-zinc-500 block">{getSubjectName(notice.subject_name)}</span>
              </div>
              <div className="mt-2 pt-2 border-t border-amber-500/10 flex items-center gap-1 text-[10px] text-zinc-650 font-semibold">
                <Clock className="w-3 h-3 text-amber-700 shrink-0" />
                <span>{notice.exam_date} @ {notice.exam_time} ({notice.room_number})</span>
              </div>
            </div>
          ))}

          {/* Normal schedule streams */}
          <div className="flex-none bg-emerald-50 text-emerald-950 border border-emerald-250/30 rounded-lg p-3 text-xs min-w-[160px] shadow-xs">
            <span className="font-semibold block text-emerald-850">09:00 AM - 10:15 AM</span>
            <span className="font-medium text-zinc-900 mt-1 block">Math (Room 4)</span>
            <Badge variant="primary" className="mt-1.5 py-0 px-1 text-[9px] font-bold">Active Now</Badge>
          </div>
          <div className="flex-none bg-zinc-100 text-zinc-800 border border-zinc-200/50 rounded-lg p-3 text-xs min-w-[160px]">
            <span className="text-zinc-500 block">10:30 AM - 11:30 AM</span>
            <span className="font-medium text-zinc-900 mt-1 block">Science (Lab B)</span>
            <span className="text-[9px] text-zinc-400 mt-1.5 block">Next Period</span>
          </div>
          <div className="flex-none bg-zinc-100 text-zinc-800 border border-zinc-200/50 rounded-lg p-3 text-xs min-w-[160px]">
            <span className="text-zinc-500 block">11:45 AM - 01:00 PM</span>
            <span className="font-medium text-zinc-900 mt-1 block">English (Room 2)</span>
            <span className="text-[9px] text-zinc-400 mt-1.5 block">Afternoon</span>
          </div>
          <div className="flex-none bg-zinc-100 text-zinc-800 border border-zinc-200/50 rounded-lg p-3 text-xs min-w-[160px]">
            <span className="text-zinc-500 block">02:00 PM - 03:00 PM</span>
            <span className="font-medium text-zinc-900 mt-1 block">History (Room 1)</span>
            <span className="text-[9px] text-zinc-400 mt-1.5 block">Final Period</span>
          </div>
        </div>
      </div>

      {/* Financial Transparency Dues Card */}
      <Card className="border border-zinc-200 shadow-xs w-full">
        <CardHeader className="p-5 pb-3">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
            Remaining School Fees
            <Badge variant={ledger.outstandingBalance > 0 ? "warning" : "success"} className="py-0 px-2 font-normal text-[10px]">
              {ledger.outstandingBalance > 0 ? "Pending Payment" : "Settled"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 pt-0 space-y-4">
          <div>
            <div className="text-3xl font-bold text-zinc-900">₹{ledger.outstandingBalance.toLocaleString("en-IN")}</div>
            <p className="text-[10px] text-zinc-405 flex items-center gap-1.5 mt-1">
              <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" /> Deadline: June 30, 2026 (Term 1 Billing Cycle)
            </p>
          </div>

          {/* Applied Modifiers Breakdown */}
          {ledger.modifiers.length > 0 && (
            <div className="border-t border-zinc-150 pt-3 space-y-2">
              <span className="text-[10px] font-bold text-zinc-800 uppercase tracking-wide">Discounts & Fees Details</span>
              <div className="space-y-1.5">
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
        </CardContent>
      </Card>

      {/* Academic Performance Card */}
      <Card className="border border-zinc-200 shadow-xs w-full">
        <CardHeader className="p-5 pb-3">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
            <Award className="w-4 h-4 text-[#064e3b] shrink-0" /> Your Classes & Grades
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 pt-0 space-y-5">
          {publishedGradebooks.length === 0 ? (
            <div className="text-zinc-400 text-xs text-center py-6">No published grade results available at this time.</div>
          ) : (
            <div className="space-y-6 divide-y divide-zinc-100">
              {publishedGradebooks.map((gb, idx) => {
                const perf = calculateWeightedGrades(gb, [studentId])[studentId];
                const subjectLabel = getSubjectName(gb.metadata.subject_id);
                const isHighMark = perf && !["D", "F"].includes(perf.gradeLetter);
                
                return (
                  <div key={gb._id} className="pt-5 first:pt-0 space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      {/* Left: Subject Name */}
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-zinc-800 text-xs block truncate">{subjectLabel}</span>
                        <span className="text-[10px] text-zinc-405 block mt-0.5">{gb.metadata.term} • {gb.metadata.academic_year}</span>
                      </div>

                      {/* Middle: Progress Ring for evaluated weight */}
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col items-center">
                          <AttendanceProgressRing percentage={perf ? perf.maxScore : 0} size={42} strokeWidth={3.5} />
                          <span className="text-[9px] text-zinc-405 mt-1 font-semibold">Weight</span>
                        </div>
                      </div>

                      {/* Right: Average Score & Letter Grade Badge */}
                      <div className="text-right flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-sm font-bold text-zinc-800 font-mono block leading-none">{perf ? `${perf.percentage}%` : "Pending"}</span>
                          <span className="text-[9px] text-zinc-405 mt-1 block">Class Avg</span>
                        </div>
                        <Badge 
                          variant="secondary"
                          className={`w-9 h-7 justify-center font-extrabold text-xs rounded-lg border ${
                            isHighMark
                              ? "bg-[#E6F4EA] text-[#10B981] border-[#10B981]/30"
                              : "bg-[#FEE2E2] text-[#EF4444] border-[#EF4444]/30"
                          }`}
                        >
                          {perf ? perf.gradeLetter : "N/A"}
                        </Badge>
                      </div>
                    </div>

                    {/* Expandable Recent Test Results for this subject */}
                    {gb.assessments.length > 0 && (
                      <div className="bg-zinc-50/50 rounded-lg p-3 border border-zinc-150 space-y-2">
                        <span className="text-[9px] font-bold text-zinc-800 uppercase tracking-wider block">Recent Test Results</span>
                        <div className="space-y-1.5">
                          {gb.assessments.map((asm) => {
                            const score = asm.scores[studentId];
                            return (
                              <div key={asm.assessment_id} className="flex justify-between items-center text-[11px]">
                                <span className="text-zinc-650 font-medium">
                                  {asm.title}{" "}
                                  <span className="text-[9px] text-zinc-400 font-normal">
                                    ({asm.type.replace("_", " ")})
                                  </span>
                                </span>
                                <span className="font-semibold text-zinc-800 font-mono">
                                  {score !== undefined ? `${score}/${asm.max_marks}` : "Pending"}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Upcoming Exam Alert Banner */}
          {upcomingExamNotices.length > 0 && (
            <div className="bg-[#FEF3C7] border border-amber-500/25 rounded-lg p-3 flex items-start gap-2.5 text-xs text-zinc-900 font-medium">
              <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-805">Upcoming Exam Notice:</span> You have {upcomingExamNotices.length} scheduled exam(s) coming up in the next 7 days. Check your schedule above!
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attendance Metrics Card */}
      <Card className="border border-zinc-200 shadow-xs w-full">
        <CardContent className="p-5 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">Attendance Rate</span>
              <span className="text-[10px] text-zinc-405 block">0 sessions marked absent/late</span>
            </div>
            <AttendanceProgressRing percentage={100} size={64} strokeWidth={5} />
          </div>

          {/* Subject Attendance Breakdown list */}
          <div className="border-t border-zinc-150 pt-2.5">
            <div className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Subject Attendance Breakdown</div>
            <div className="text-xs text-zinc-600 mt-1 flex flex-wrap gap-x-3 gap-y-1">
              <span>Mathematics: <span className="font-semibold text-zinc-900">98%</span></span>
              <span className="text-zinc-300">|</span>
              <span>Science: <span className="font-semibold text-zinc-900">100%</span></span>
              <span className="text-zinc-300">|</span>
              <span>English: <span className="font-semibold text-zinc-900">100%</span></span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
