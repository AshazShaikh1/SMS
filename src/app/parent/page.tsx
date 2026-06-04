"use client";

import React, { useEffect, useState } from "react";
import { Landmark, Calendar, Award, FileText, CheckCircle, HelpCircle, Download } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getStudentLedger } from "@/lib/db/finance";
import { fetchGradebook, calculateWeightedGrades } from "@/lib/db/gradebooks";
import { fetchStudents } from "@/lib/db/students";
import { Student, Gradebook } from "@/lib/db/mockDb";

export default function ParentDashboard() {
  const parentId = "PAR_582910"; // Default demo parent
  const [children, setChildren] = useState<Student[]>([]);
  const [selectedChildId, setSelectedChildId] = useState("");
  
  // Ledger and gradebook maps
  const [ledger, setLedger] = useState<{ baseFee: number; modifiers: any[]; outstandingBalance: number } | null>(null);
  const [gradebook, setGradebook] = useState<Gradebook | null>(null);
  const [loading, setLoading] = useState(true);

  // Load children mapped to this parent
  useEffect(() => {
    async function loadParentData() {
      setLoading(true);
      const studentList = await fetchStudents();
      const mapped = studentList.filter((s) => s.personal_details.parent_id === parentId);
      setChildren(mapped);

      if (mapped.length > 0) {
        setSelectedChildId(mapped[0]._id);
      }
      setLoading(false);
    }
    loadParentData();
  }, []);

  // Fetch ledger and grade details whenever child changes
  useEffect(() => {
    if (!selectedChildId) return;

    async function loadChildDetails() {
      const child = children.find((c) => c._id === selectedChildId);
      if (child) {
        const l = await getStudentLedger(selectedChildId);
        setLedger(l);

        const gb = await fetchGradebook(
          "2026",
          "Term 1",
          child.academic_mapping.current_grade,
          child.academic_mapping.section,
          "MATH_101"
        );
        setGradebook(gb);
      }
    }
    loadChildDetails();
  }, [selectedChildId, children]);

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

  const selectedChild = children.find((c) => c._id === selectedChildId);
  const performance = selectedChild && gradebook ? calculateWeightedGrades(gradebook, [selectedChildId])[selectedChildId] : null;

  const handlePrintScorecard = () => {
    // Basic browser print mechanism to print the layout card cleanly
    window.print();
  };

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

      {/* Child Selector Tabs (Multi-child support) */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-wide">Linked Students</label>
        <div className="flex gap-2">
          {children.map((child) => (
            <button
              key={child._id}
              onClick={() => setSelectedChildId(child._id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                selectedChildId === child._id
                  ? "bg-emerald-950 text-white border-emerald-950 shadow-xs"
                  : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
              }`}
            >
              {child.personal_details.first_name} {child.personal_details.last_name}
            </button>
          ))}
        </div>
      </div>

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
              {/* Header profile metadata for printed copies */}
              <div className="hidden print:block border-b border-zinc-250 pb-3 mb-4 text-xs text-zinc-600">
                <div className="flex justify-between items-end">
                  <div>
                    <h2 className="text-lg font-bold text-zinc-900 leading-none">Antigravity School Academy</h2>
                    <span className="text-[10px] text-zinc-400 block mt-0.5">Unified Grade Scorecard System</span>
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
                    <span className="font-bold text-zinc-800 text-sm block">MATH_101 - Mathematics Class</span>
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
                <div className="text-zinc-400 text-xs text-center py-2">No gradebooks computed for this term yet.</div>
              )}

              {/* Score breakdown */}
              {gradebook && gradebook.assessments.length > 0 && (
                <div className="border-t border-zinc-150 pt-4 space-y-2">
                  <span className="text-[10px] font-bold text-zinc-800 uppercase tracking-wide">Exam & Test Breakdown</span>
                  <div className="space-y-2.5">
                    {gradebook.assessments.map((asm) => {
                      const score = asm.scores[selectedChildId];
                      return (
                        <div key={asm.assessment_id} className="flex justify-between items-center text-xs pb-2 border-b border-zinc-100 last:border-0 last:pb-0">
                          <div>
                            <span className="text-zinc-700 font-medium block">{asm.title}</span>
                            <span className="text-[9px] text-zinc-400 font-medium capitalize">
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
            </CardContent>
          </Card>

          {/* Compilation Button */}
          <Button onClick={handlePrintScorecard} variant="outline" className="w-full gap-2 border-zinc-250 hover:bg-emerald-50/20 hover:border-emerald-600 hover:text-emerald-950 font-semibold shadow-xs">
            <Download className="w-4 h-4" /> Compile Term 1 Report (Save PDF)
          </Button>
        </div>
      )}
    </div>
  );
}
