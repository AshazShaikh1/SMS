"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Landmark, UserPlus, FileEdit, GraduationCap, ChevronRight, LayoutGrid } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fetchStudents } from "@/lib/db/students";
import { Student } from "@/lib/db/mockDb";

export default function AdminDashboard() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const list = await fetchStudents();
      setStudents(list);
      setLoading(false);
    }
    loadData();
  }, []);

  const totalOutstanding = students.reduce(
    (sum, s) => sum + (s.financial_ledger?.current_outstanding_balance || 0),
    0
  );

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">School Dashboard</h1>
          <p className="text-xs text-zinc-505 mt-0.5">Quickly manage your school enrollment, see outstanding fees, and update student accounts.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/intake">
            <Button size="sm" variant="outline" className="gap-2">
              <UserPlus className="w-4 h-4" /> Add Students
            </Button>
          </Link>
          <Link href="/admin/finance">
            <Button size="sm" className="gap-2">
              <Landmark className="w-4 h-4" /> Adjust Ledgers
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="border border-zinc-200 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-5 border-none">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Total Enrolled Students</CardTitle>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-950 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="text-3xl font-bold text-zinc-900">{loading ? "..." : students.length}</div>
            <p className="text-[10px] text-zinc-405 mt-1">Students mapped across all active grades.</p>
          </CardContent>
        </Card>

        <Card className="border border-zinc-200 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-5 border-none">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Total Unpaid Fees</CardTitle>
            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-750 flex items-center justify-center">
              <Landmark className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="text-3xl font-bold text-zinc-900">
              {loading ? "..." : `₹${totalOutstanding.toLocaleString("en-IN")}`}
            </div>
            <p className="text-[10px] text-zinc-405 mt-1">Pending payment totals across student ledgers.</p>
          </CardContent>
        </Card>

        <Card className="border border-zinc-200 shadow-xs sm:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-5 border-none">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Quick Actions</CardTitle>
            <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-800 flex items-center justify-center">
              <LayoutGrid className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5 flex flex-wrap gap-2 pt-1">
            <Link href="/admin/intake">
              <Badge variant="primary" className="py-1 px-2.5 font-normal cursor-pointer hover:bg-emerald-900 hover:text-white transition-colors">
                Add Student List (CSV)
              </Badge>
            </Link>
            <Link href="/admin/finance">
              <Badge variant="secondary" className="py-1 px-2.5 font-normal cursor-pointer hover:bg-zinc-200 transition-colors">
                Edit Fees & Discounts
              </Badge>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Roster / Student Directory Section */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 tracking-tight">Active Student Directory</h2>
          <p className="text-xs text-zinc-450 mt-0.5">Quick oversight list. Select "Adjust Ledger" to configure modifier parameters.</p>
        </div>

        {/* Mobile View Roster List */}
        <div className="space-y-4 md:hidden">
          {loading ? (
            <div className="p-8 text-center text-zinc-405 text-xs bg-white border border-zinc-200 rounded-xl">
              Loading directory database...
            </div>
          ) : students.length === 0 ? (
            <div className="p-8 text-center text-zinc-405 text-xs bg-white border border-zinc-200 rounded-xl">
              No student records found. Add students to start.
            </div>
          ) : (
            students.map((student) => (
              <Card key={student._id} className="border border-zinc-200 shadow-xs p-4 space-y-4 bg-white">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-950 flex items-center justify-center font-bold text-xs uppercase">
                      {student.personal_details.first_name[0]}
                    </div>
                    <div>
                      <span className="font-semibold text-zinc-900 block leading-tight text-sm">
                        {student.personal_details.first_name} {student.personal_details.last_name}
                      </span>
                      <span className="text-[10px] text-zinc-400">Roll: #{student.personal_details.roll_number} | ID: {student._id}</span>
                    </div>
                  </div>
                  <Badge variant="secondary" className="font-normal text-[10px] py-0.5 px-2">
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
                  <Link href={`/admin/finance?studentId=${student._id}`}>
                    <Button size="sm" variant="outline" className="gap-1 px-3 py-1.5 h-8 text-xs border-zinc-250 hover:bg-emerald-50/20 hover:border-emerald-600 hover:text-emerald-950">
                      <FileEdit className="w-3.5 h-3.5" /> Edit Fees
                    </Button>
                  </Link>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Desktop View Table */}
        <Card className="border border-zinc-200 overflow-hidden shadow-xs hidden md:block">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200 text-left text-sm">
              <thead className="bg-zinc-50 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                <tr>
                  <th scope="col" className="px-6 py-4">Roll</th>
                  <th scope="col" className="px-6 py-4">Student Name</th>
                  <th scope="col" className="px-6 py-4">Grade & Section</th>
                  <th scope="col" className="px-6 py-4">Outstanding Balance</th>
                  <th scope="col" className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-zinc-200">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-zinc-400 text-xs">
                      Loading directory database...
                    </td>
                  </tr>
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-zinc-400 text-xs">
                      No student records found. Import using CSV intake.
                    </td>
                  </tr>
                ) : (
                  students.map((student) => (
                    <tr key={student._id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-6 py-4 text-zinc-500 text-xs font-medium">
                        #{student.personal_details.roll_number}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-950 flex items-center justify-center font-semibold text-xs uppercase">
                            {student.personal_details.first_name[0]}
                          </div>
                          <div>
                            <span className="font-medium text-zinc-900 block leading-tight">
                              {student.personal_details.first_name} {student.personal_details.last_name}
                            </span>
                            <span className="text-[10px] text-zinc-400">ID: {student._id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="secondary" className="font-normal text-[11px] py-0.5 px-2">
                          Grade {student.academic_mapping.current_grade} - {student.academic_mapping.section}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 font-semibold text-zinc-800 text-xs">
                        ₹{student.financial_ledger?.current_outstanding_balance.toLocaleString("en-IN")}
                      </td>
                      <td className="px-6 py-4 text-right text-xs">
                        <div className="flex justify-end gap-3">
                          <Link
                            href={`/admin/finance?studentId=${student._id}`}
                            className="inline-flex items-center gap-1 text-emerald-800 hover:text-emerald-950 font-semibold transition-colors"
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
        </Card>
      </div>
    </div>
  );
}
