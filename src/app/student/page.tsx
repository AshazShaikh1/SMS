"use client";

import React, { useEffect, useState } from "react";
import { Landmark, Calendar, Award, CheckCircle, Clock, AlertTriangle, Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getStudentLedger } from "@/lib/db/finance";
import { fetchGradebook, calculateWeightedGrades } from "@/lib/db/gradebooks";
import { fetchStudents } from "@/lib/db/students";
import { Student, Gradebook } from "@/lib/db/mockDb";

export default function StudentDashboard() {
  const studentId = "STU_948201"; // Default demo student: Rahul Sharma
  const [student, setStudent] = useState<Student | null>(null);
  const [ledger, setLedger] = useState<{ baseFee: number; modifiers: any[]; outstandingBalance: number } | null>(null);
  const [gradebook, setGradebook] = useState<Gradebook | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStudentData() {
      setLoading(true);
      const studentList = await fetchStudents();
      const details = studentList.find((s) => s._id === studentId);
      
      if (details) {
        setStudent(details);
        const l = await getStudentLedger(studentId);
        setLedger(l);
        
        // Fetch gradebook for Grade 10 Section A
        const gb = await fetchGradebook("2026", "Term 1", "10", "A", "MATH_101");
        setGradebook(gb);
      }
      setLoading(false);
    }
    loadStudentData();
  }, []);

  if (loading) {
    return <div className="text-center text-xs text-zinc-400 py-12">Retrieving student records...</div>;
  }

  if (!student || !ledger) {
    return <div className="text-center text-xs text-zinc-400 py-12">Failed to load student profile.</div>;
  }

  // Calculate weighted aggregates
  const performance = gradebook ? calculateWeightedGrades(gradebook, [studentId])[studentId] : null;

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <div className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight text-zinc-900">
          Hello, {student.personal_details.first_name}!
        </h1>
        <p className="text-xs text-zinc-405 font-normal">Active enrollment: Grade {student.academic_mapping.current_grade}-{student.academic_mapping.section}</p>
      </div>

      {/* Today's Schedule */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Today's Schedule</h3>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
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
      <Card className="border border-zinc-200 shadow-xs">
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
              <Calendar className="w-3.5 h-3.5 text-zinc-400" /> Deadline: June 30, 2026 (Term 1 Billing Cycle)
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
      <Card className="border border-zinc-200 shadow-xs">
        <CardHeader className="p-5 pb-3">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-850" /> Your Classes & Grades
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 pt-0 space-y-4">
          {performance ? (
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-zinc-800 text-sm block">MATH_101 - Advanced Mathematics</span>
                <span className="text-[10px] text-zinc-400 block mt-0.5">Total class weight evaluated: {performance.maxScore}%</span>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-zinc-800 font-mono block leading-none">{performance.percentage}%</span>
                <Badge variant="primary" className="mt-1 justify-center py-0 px-2.5 font-bold text-xs">
                  Grade {performance.gradeLetter}
                </Badge>
              </div>
            </div>
          ) : (
            <div className="text-zinc-400 text-xs text-center py-2">No grade results input by teacher yet.</div>
          )}

          {/* Upcoming Exam Alert Banner */}
          <div className="bg-emerald-50/50 border border-emerald-250/30 rounded-lg p-3 flex items-start gap-2.5 text-xs text-emerald-950 font-medium">
            <Info className="w-4 h-4 text-emerald-850 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-emerald-905">Upcoming Exam:</span> Term 1 Geometry Final on June 15.
            </div>
          </div>

          {/* Mock Test and Final Exam Scores list */}
          {gradebook && gradebook.assessments.length > 0 && (
            <div className="border-t border-zinc-150 pt-3 space-y-2">
              <span className="text-[10px] font-bold text-zinc-800 uppercase tracking-wide">Recent Test Results</span>
              <div className="space-y-2">
                {gradebook.assessments.map((asm) => {
                  const score = asm.scores[studentId];
                  return (
                    <div key={asm.assessment_id} className="flex justify-between items-center text-xs">
                      <div>
                        <span className="text-zinc-700 font-medium block">{asm.title}</span>
                        <span className="text-[10px] text-zinc-400 capitalize">{asm.type.replace("_", " ")}</span>
                      </div>
                      <span className="font-semibold text-zinc-800 font-mono">
                        {score !== undefined ? `${score}/${asm.max_marks}` : "Pending"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attendance Metrics Card */}
      <Card className="border border-zinc-200 shadow-xs">
        <CardContent className="p-5 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">Attendance Rate</span>
              <span className="text-3xl font-bold text-zinc-900">100%</span>
              <span className="text-[10px] text-zinc-405 block">0 sessions marked absent/late</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-950 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-700" />
            </div>
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
