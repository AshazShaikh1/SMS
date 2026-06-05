"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Check, ClipboardCheck, RefreshCw, CheckCircle2, UserCheck, UserX, AlertCircle, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { fetchStudents } from "@/lib/db/students";
import { saveAttendance, fetchAttendance } from "@/lib/db/attendance";
import { Student } from "@/lib/db/mockDb";
import { AttendanceProgressRing } from "@/components/dashboard/AttendanceProgressRing";
import { Toast } from "@/components/ui/toast";
import { supabase } from "@/lib/supabase/client";

type RollStatus = "present" | "absent" | "late";

function AttendanceRollCallContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialGrade = searchParams.get("grade") || "10";
  const initialSection = searchParams.get("section") || "A";

  const [grade, setGrade] = useState(initialGrade);
  const [section, setSection] = useState(initialSection);
  const [date, setDate] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });

  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceSheet, setAttendanceSheet] = useState<Record<string, RollStatus>>({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load class list and past attendance
  useEffect(() => {
    async function loadClass() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const studentList = await fetchStudents(grade, section);
      setStudents(studentList);

      // Check if attendance has already been taken for this day
      const pastRecord = await fetchAttendance(grade, section, date);
      
      const sheet: Record<string, RollStatus> = {};
      studentList.forEach((s) => {
        if (pastRecord && pastRecord.records[s._id]) {
          sheet[s._id] = pastRecord.records[s._id];
        } else {
          sheet[s._id] = "present"; // Default-Present Mandate
        }
      });
      
      setAttendanceSheet(sheet);
      setLoading(false);
    }
    loadClass();
  }, [grade, section, date, router]);

  // Toggle status cycle: present -> absent -> late -> present
  const toggleAttendance = (studentId: string) => {
    const current = attendanceSheet[studentId] || "present";
    let next: RollStatus = "present";
    if (current === "present") next = "absent";
    else if (current === "absent") next = "late";
    else if (current === "late") next = "present";

    setAttendanceSheet({
      ...attendanceSheet,
      [studentId]: next,
    });
  };

  const handleMarkAllPresent = () => {
    const updated = { ...attendanceSheet };
    students.forEach((s) => {
      updated[s._id] = "present";
    });
    setAttendanceSheet(updated);
  };

  const handleSaveSheet = async () => {
    setSaving(true);
    setSaveSuccess(false);
    
    const success = await saveAttendance(grade, section, date, attendanceSheet);
    
    setSaving(false);
    if (success) {
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        router.push("/teacher");
      }, 1500);
    }
  };

  const stats = Object.values(attendanceSheet).reduce(
    (acc, status) => {
      acc[status]++;
      return acc;
    },
    { present: 0, absent: 0, late: 0 }
  );

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Daily Class Attendance</h1>
          <p className="text-xs text-zinc-505 mt-0.5 font-normal">All students are marked Present by default. Tap a student's card once if they are Absent, or twice if they are Late.</p>
        </div>
        <Button size="sm" variant="outline" onClick={handleMarkAllPresent} disabled={loading || students.length === 0}>
          Reset All to Present
        </Button>
      </div>

      {/* Class and Date Selectors */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Step 1: Choose Class & Date</h3>
        <Card className="border border-zinc-200 shadow-xs relative focus-within:z-30 hover:z-20">
        <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-wide">Grade</label>
            <Select value={grade} onChange={(e) => setGrade(e.target.value)}>
              <option value="9">Grade 9</option>
              <option value="10">Grade 10</option>
              <option value="11">Grade 11</option>
              <option value="12">Grade 12</option>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-wide">Section</label>
            <Select value={section} onChange={(e) => setSection(e.target.value)}>
              <option value="A">Section A</option>
              <option value="B">Section B</option>
              <option value="C">Section C</option>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-wide">Attendance Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="flex w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 cursor-pointer"
            />
          </div>
        </CardContent>
      </Card>
      </div>

      {/* Roster Attendance Board */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Step 2: Mark Student Status</h3>
        <div className="space-y-4">
        {/* Statistics Bar */}
        <div className="flex items-center justify-between border-b border-zinc-200 pb-2 flex-wrap gap-2">
          <div className="flex items-center gap-4 text-xs font-semibold text-zinc-550 flex-wrap">
            <span className="text-zinc-800">Class Roster Summary:</span>
            <span className="flex items-center gap-1.5 text-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-700" />
              {stats.present} Present
            </span>
            <span className="flex items-center gap-1.5 text-red-750">
              <span className="w-1.5 h-1.5 rounded-full bg-red-750" />
              {stats.absent} Absent
            </span>
            <span className="flex items-center gap-1.5 text-amber-700">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
              {stats.late} Late
            </span>
          </div>
          {!loading && students.length > 0 && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Attendance Rate:</span>
              <AttendanceProgressRing
                percentage={students.length > 0 ? Math.round(((stats.present + stats.late) / students.length) * 100) : 100}
                size={36}
                strokeWidth={3.5}
              />
            </div>
          )}
        </div>

        {/* Attendance Tapping Grid */}
        {loading ? (
          <div className="p-12 text-center text-zinc-400 text-xs">
            Loading student roster...
          </div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center text-zinc-400 text-xs border border-dashed border-zinc-200 rounded-xl">
            No students registered in Grade {grade} - {section}.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {students.map((student) => {
              const status = attendanceSheet[student._id] || "present";
              return (
                <Card
                  key={student._id}
                  onClick={() => toggleAttendance(student._id)}
                  className={`border cursor-pointer select-none transition-all duration-150 active:scale-[0.98] ${
                    status === "present"
                      ? "border-emerald-250 bg-emerald-50/10 hover:border-emerald-500 hover:bg-emerald-50/30"
                      : status === "absent"
                      ? "border-red-200 bg-red-50/10 hover:border-red-400 hover:bg-red-50/30"
                      : "border-amber-200 bg-amber-50/10 hover:border-amber-450 hover:bg-amber-50/30"
                  }`}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase ${
                        status === "present"
                          ? "bg-emerald-100 text-emerald-950"
                          : status === "absent"
                          ? "bg-red-100 text-red-750"
                          : "bg-amber-100 text-amber-800"
                      }`}>
                        {student.personal_details.first_name[0]}
                      </div>
                      
                      <div className="space-y-0.5">
                        <span className="font-semibold text-zinc-800 text-sm block">
                          {student.personal_details.first_name} {student.personal_details.last_name}
                        </span>
                        <span className="text-[10px] text-zinc-400">Roll Number: #{student.personal_details.roll_number}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {status === "present" && (
                        <Badge variant="success" className="gap-1 px-2.5 py-0.5 text-[10px] font-semibold">
                          <UserCheck className="w-3.5 h-3.5" /> Present
                        </Badge>
                      )}
                      {status === "absent" && (
                        <Badge variant="danger" className="gap-1 px-2.5 py-0.5 text-[10px] font-semibold">
                          <UserX className="w-3.5 h-3.5" /> Absent
                        </Badge>
                      )}
                      {status === "late" && (
                        <Badge variant="warning" className="gap-1 px-2.5 py-0.5 text-[10px] font-semibold">
                          <Clock className="w-3.5 h-3.5" /> Late
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
      </div>

      {/* Save Button Footer bar */}
      <Card className="border border-zinc-200 bg-zinc-50/50">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="text-xs text-zinc-500 font-medium">
            {saveSuccess ? (
              <span className="text-emerald-900 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4.5 h-4.5 text-emerald-700" /> Attendance recorded successfully.
              </span>
            ) : (
              <span>Ready to submit. Single tap saves all values.</span>
            )}
          </div>

          <Button onClick={handleSaveSheet} disabled={loading || students.length === 0 || saving} className="gap-2">
            {saving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Committing...
              </>
            ) : (
              <>
                <ClipboardCheck className="w-4 h-4" /> Save Attendance for Today
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {saveSuccess && (
        <Toast
          message="Attendance list recorded successfully."
          type="success"
          onClose={() => setSaveSuccess(false)}
        />
      )}
    </div>
  );
}

export default function AttendanceRollCall() {
  return (
    <Suspense fallback={<div className="text-center text-zinc-400 text-xs py-12">Loading roll call registry...</div>}>
      <AttendanceRollCallContent />
    </Suspense>
  );
}
