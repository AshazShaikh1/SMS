"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, ClipboardCheck, GraduationCap, Calendar, Clock, Star } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase/client";

export default function TeacherOverview() {
  const router = useRouter();
  const [teacherName, setTeacherName] = useState("Teacher Workspace");
  const [classesTaught, setClassesTaught] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTeacherData() {
      setLoading(true);
      
      // 1. Verify session
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // 2. Fetch teacher profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, school_id")
        .eq("id", user.id)
        .single();
      
      if (profile) {
        setTeacherName(profile.full_name);
      }

      const schoolId = profile?.school_id;
      if (!schoolId) {
        setLoading(false);
        return;
      }

      // 3. Fetch all classes for the school
      const { data: classesData } = await supabase
        .from("classes")
        .select("id, grade_level, section")
        .eq("school_id", schoolId);

      // 4. Fetch student counts per class
      const { data: studentsData } = await supabase
        .from("students")
        .select("id, class_id")
        .eq("school_id", schoolId);

      if (classesData) {
        const studentCounts: Record<string, number> = {};
        (studentsData || []).forEach((s: any) => {
          studentCounts[s.class_id] = (studentCounts[s.class_id] || 0) + 1;
        });

        const list = classesData.map((c: any) => ({
          grade: c.grade_level.replace("Grade ", ""),
          section: c.section,
          subject: "MATH_101",
          subjectName: "Mathematics Class",
          studentsCount: studentCounts[c.id] || 0,
          schedule: "Mon/Wed/Fri - 09:00 AM",
        }));
        setClassesTaught(list);
      }

      setLoading(false);
    }
    loadTeacherData();
  }, [router]);

  if (loading) {
    return <div className="text-center text-xs text-zinc-400 py-12">Loading your classes...</div>;
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Hello, {teacherName}</h1>
        <p className="text-xs text-zinc-505 mt-0.5 font-normal">View your active classes, take daily attendance, and enter student marks.</p>
      </div>

      {/* Stats Quick Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="border border-zinc-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-5 border-none">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Your Subject</CardTitle>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-950 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="text-2xl font-bold text-zinc-900">Mathematics</div>
            <p className="text-[10px] text-zinc-450 mt-1">Grade 10 Advanced Algebra</p>
          </CardContent>
        </Card>

        <Card className="border border-zinc-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-5 border-none">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Your Classes</CardTitle>
            <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-800 flex items-center justify-center">
              <Star className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="text-2xl font-bold text-zinc-900">2 Sections</div>
            <p className="text-[10px] text-zinc-450 mt-1">Grade 10 Section A & Grade 10 Section B</p>
          </CardContent>
        </Card>

        <Card className="border border-zinc-200 sm:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-5 border-none">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Today</CardTitle>
            <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-800 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="text-2xl font-bold text-zinc-900">June 4, 2026</div>
            <p className="text-[10px] text-zinc-405 mt-1">Current Academic Term: Term 1</p>
          </CardContent>
        </Card>
      </div>

      {/* Classroom grid mapping */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 tracking-tight">Choose a Class to Manage</h2>
          <p className="text-xs text-zinc-450 mt-0.5">Select a course section below to run daily operations.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {classesTaught.map((item) => (
            <Card key={item.section} className="border border-zinc-200 shadow-xs hover:border-emerald-500 transition-colors">
              <CardHeader className="p-5 border-b border-zinc-100 flex flex-row items-start justify-between">
                <div>
                  <Badge variant="primary" className="mb-2">Grade {item.grade}-{item.section}</Badge>
                  <CardTitle className="text-base">{item.subjectName}</CardTitle>
                  <CardDescription className="text-[10px] flex items-center gap-1.5 mt-1 font-mono">
                    <Clock className="w-3.5 h-3.5" /> {item.schedule}
                  </CardDescription>
                </div>
                <div className="text-right text-[10px] text-zinc-400">
                  <span className="font-bold text-zinc-850 text-base block">{item.studentsCount}</span>
                  students
                </div>
              </CardHeader>
              <CardContent className="p-5 flex gap-3.5">
                <Link
                  href={`/teacher/attendance?grade=${item.grade}&section=${item.section}`}
                  className="flex-1"
                >
                  <Button variant="outline" size="sm" className="w-full gap-2 border-zinc-250 hover:bg-emerald-50/20 hover:border-emerald-600 hover:text-emerald-950">
                    <ClipboardCheck className="w-4 h-4" /> Take Attendance
                  </Button>
                </Link>
                <Link
                  href={`/teacher/grading?grade=${item.grade}&section=${item.section}`}
                  className="flex-1"
                >
                  <Button size="sm" className="w-full gap-2">
                    <GraduationCap className="w-4 h-4" /> Enter Grades
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
