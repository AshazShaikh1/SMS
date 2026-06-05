"use client";

import React, { useEffect, useState, useTransition, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Plus, Trash2, Landmark, RefreshCw, CheckCircle2, User, Search, Calculator } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Toast } from "@/components/ui/toast";
import { fetchStudents } from "@/lib/db/students";
import { getStudentLedger, updateStudentLedger, calculateOutstandingBalance, FeeModifier } from "@/lib/db/finance";
import { Student } from "@/lib/db/mockDb";
import { supabase } from "@/lib/supabase/client";

function FinanceLedgerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialStudentId = searchParams.get("studentId") || "";

  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState(initialStudentId);
  const [studentDetails, setStudentDetails] = useState<Student | null>(null);

  // Ledger state variables
  const [baseFee, setBaseFee] = useState(0);
  const [modifiers, setModifiers] = useState<FeeModifier[]>([]);
  const [outstandingBalance, setOutstandingBalance] = useState(0);

  // Form input variables for creating a new modifier
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState<"percentage" | "fixed_amount">("fixed_amount");
  const [newValue, setNewValue] = useState("");
  const [newApplication, setNewApplication] = useState<"charge" | "discount">("discount");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "warning" | "error" | "info" } | null>(null);
  const [inputError, setInputError] = useState(false);

  // Load student list
  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const list = await fetchStudents();
      setStudents(list);
      setLoading(false);
    }
    loadData();
  }, [router]);

  // Sync with student details when selectedStudentId changes
  useEffect(() => {
    if (!selectedStudentId) {
      setStudentDetails(null);
      setModifiers([]);
      setBaseFee(0);
      setOutstandingBalance(0);
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
      }
    }
    loadLedger();
  }, [selectedStudentId, students]);

  // Recalculate preview in real-time as local modifiers change
  useEffect(() => {
    if (baseFee > 0) {
      const computed = calculateOutstandingBalance(baseFee, modifiers);
      setOutstandingBalance(computed);
    }
  }, [baseFee, modifiers]);

  const handleAddModifier = (e: React.FormEvent) => {
    e.preventDefault();
    const numericValue = Number(newValue);

    if (newType === "percentage" && newApplication === "discount") {
      if (isNaN(numericValue) || numericValue < 0 || numericValue > 100) {
        setInputError(true);
        setToast({
          message: "Discount percentages must be between 0% and 100%.",
          type: "warning"
        });
        return;
      }
    }

    if (newType === "fixed_amount") {
      if (numericValue < 0) {
        setNewValue("0");
        setInputError(true);
        return;
      }
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

    // Reset modifier input form fields
    setNewLabel("");
    setNewValue("");
    setInputError(false);
  };

  const handleRemoveModifier = (id: string) => {
    setModifiers(modifiers.filter((mod) => mod.id !== id));
  };

  const handleCommitLedger = async () => {
    if (!selectedStudentId) return;
    setSaving(true);
    setSaveSuccess(false);

    const success = await updateStudentLedger(selectedStudentId, modifiers);
    setSaving(false);
    if (success) {
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        router.push("/admin");
      }, 1500);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Manage Student Fees & Scholarships</h1>
        <p className="text-xs text-zinc-505 mt-0.5 font-normal">Set base tuition costs, apply custom fees, or add scholarship discounts for individual student accounts.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Student Selector Card */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border border-zinc-200 shadow-xs relative focus-within:z-30 hover:z-20">
            <CardHeader className="p-5">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <User className="w-4.5 h-4.5 text-emerald-850" /> 1. Find a Student
              </CardTitle>
              <CardDescription>Locate student profile to load ledger.</CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0 space-y-4">
              <div className="space-y-1.5 relative">
                <label className="text-[10px] font-bold text-zinc-650 uppercase tracking-wide">Student Profile Search</label>
                <div className="relative">
                  <Select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    disabled={loading}
                    className="pl-3"
                  >
                    <option value="">-- Choose student profile --</option>
                    {students.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.personal_details.first_name} {s.personal_details.last_name} (G{s.academic_mapping.current_grade}-{s.academic_mapping.section})
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              {studentDetails && (
                <div className="border border-zinc-200/60 rounded-xl p-4 bg-zinc-50/50 space-y-3.5 text-xs text-zinc-500">
                  <div className="border-b border-zinc-150 pb-2">
                    <span className="font-semibold text-zinc-800 text-sm block">
                      {studentDetails.personal_details.first_name} {studentDetails.personal_details.last_name}
                    </span>
                    <span className="text-[10px] text-zinc-400">Student ID: {studentDetails._id}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Current Grade Level:</span>
                    <span className="font-semibold text-zinc-700">Grade {studentDetails.academic_mapping.current_grade} ({studentDetails.academic_mapping.section})</span>
                  </div>

                  <div className="flex justify-between">
                    <span>Base Fee Plan:</span>
                    <span className="font-semibold text-emerald-900">₹{baseFee.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Ledger Modification Panel */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border border-zinc-200 h-full flex flex-col justify-between shadow-xs relative focus-within:z-30 hover:z-20">
            <div>
              <CardHeader className="p-5 border-b border-zinc-100 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">2. Edit Fees and Discounts for this Student</CardTitle>
                  <CardDescription>Stack positive extra charges or negative discount scholarship packages.</CardDescription>
                </div>
                <Badge variant="primary" className="gap-1.5 py-1 px-3">
                  <Calculator className="w-3.5 h-3.5" /> Real-time preview
                </Badge>
              </CardHeader>

              <CardContent className="p-5 space-y-6">
                {!selectedStudentId ? (
                  <div className="p-12 text-center text-zinc-400 text-xs">
                    Please choose a student profile from the dropdown menu on the left to review or change their billing settings.
                  </div>
                ) : (
                  <>
                    {/* Add Modifier Form */}
                    <form onSubmit={handleAddModifier} className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 border border-zinc-200 rounded-xl p-4 bg-zinc-50/30">
                      <div className="sm:col-span-4 space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-650 uppercase tracking-wide">Scholarship or Fee Name</label>
                        <Input
                          value={newLabel}
                          onChange={(e) => setNewLabel(e.target.value)}
                          placeholder="e.g. Sports Scholarship, Lab Fee"
                          required
                        />
                      </div>
                      <div className="sm:col-span-2 space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-650 uppercase tracking-wide">Category</label>
                        <Select
                          value={newApplication}
                          onChange={(e) => {
                            setNewApplication(e.target.value as any);
                            setInputError(false);
                          }}
                        >
                          <option value="discount">Discount (-)</option>
                          <option value="charge">Extra Charge (+)</option>
                        </Select>
                      </div>
                      <div className="sm:col-span-3 space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-650 uppercase tracking-wide">Type</label>
                        <Select
                          value={newType}
                          onChange={(e) => {
                            const val = e.target.value as any;
                            setNewType(val);
                            if (val === "fixed_amount" && Number(newValue) < 0) {
                              setNewValue("0");
                            }
                            setInputError(false);
                          }}
                        >
                          <option value="fixed_amount">Fixed Amount (₹)</option>
                          <option value="percentage">Percentage (%)</option>
                        </Select>
                      </div>
                      <div className="sm:col-span-2 space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-655 uppercase tracking-wide">Amount</label>
                        <Input
                          type="number"
                          value={newValue}
                          onChange={(e) => {
                            let val = e.target.value;
                            if (newType === "fixed_amount" && Number(val) < 0) {
                              val = "0";
                            }
                            setNewValue(val);
                            setInputError(false);
                          }}
                          placeholder="5000"
                          min="0"
                          required
                          className={inputError ? "border-[#EF4444] focus:border-[#EF4444] focus:ring-[#EF4444]/20" : ""}
                        />
                      </div>
                      <div className="sm:col-span-1 flex items-end">
                        <Button type="submit" variant="outline" className="w-full p-2 h-[38px] hover:border-emerald-600 hover:bg-emerald-50/20 text-emerald-950">
                          <Plus className="w-4.5 h-4.5" />
                        </Button>
                      </div>
                    </form>

                    {/* Active Modifiers Table List */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-wider">Scholarships & Fees List</h3>
                      
                      {modifiers.length === 0 ? (
                        <div className="border border-dashed border-zinc-200 rounded-lg p-5 text-center text-zinc-400 text-xs">
                          No scholarships or extra fees added yet. Paying standard base fee rate.
                        </div>
                      ) : (
                        <div className="border border-zinc-200 rounded-xl overflow-hidden divide-y divide-zinc-200">
                          {modifiers.map((mod) => {
                            const isDiscount = mod.application === "discount";
                            const isPercent = mod.type === "percentage";
                            return (
                              <div key={mod.id} className="flex justify-between items-center p-3.5 hover:bg-zinc-50/40 text-xs transition-colors">
                                <div className="space-y-0.5">
                                  <span className="font-semibold text-zinc-800">{mod.label}</span>
                                  <div className="flex gap-2">
                                    <Badge variant={isDiscount ? "primary" : "danger"} className="text-[10px] py-0 px-1.5 font-normal">
                                      {isDiscount ? "Discount" : "Charge"}
                                    </Badge>
                                    <span className="text-[10px] text-zinc-400 font-medium">
                                      {isPercent ? `${mod.value}% off base` : `₹${mod.value.toLocaleString("en-IN")} flat`}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-4">
                                  <span className={`font-semibold ${isDiscount ? "text-emerald-900" : "text-red-750"}`}>
                                    {isDiscount ? "-" : "+"}
                                    ₹{isPercent ? ((mod.value / 100) * baseFee).toLocaleString("en-IN") : mod.value.toLocaleString("en-IN")}
                                  </span>
                                  <button
                                    onClick={() => handleRemoveModifier(mod.id)}
                                    className="text-zinc-400 hover:text-red-750 cursor-pointer p-1 rounded-lg hover:bg-zinc-50 transition-colors"
                                  >
                                    <Trash2 className="w-4.5 h-4.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Mathematical Summary Preview card */}
                    <div className="border border-zinc-200 rounded-xl p-4 bg-zinc-50/50 flex flex-col gap-2.5 text-xs text-zinc-500">
                      <div className="flex justify-between">
                        <span>Base Tuition Fee Rate:</span>
                        <span className="text-zinc-850">₹{baseFee.toLocaleString("en-IN")}</span>
                      </div>
                      
                      {modifiers.map((mod) => {
                        const amt = mod.type === "percentage" ? (mod.value / 100) * baseFee : mod.value;
                        const isDiscount = mod.application === "discount";
                        return (
                          <div key={mod.id} className="flex justify-between text-[11px]">
                            <span>└ {mod.label}:</span>
                            <span className={isDiscount ? "text-emerald-900" : "text-red-750"}>
                              {isDiscount ? "-" : "+"}₹{amt.toLocaleString("en-IN")}
                            </span>
                          </div>
                        );
                      })}

                      <div className="border-t border-zinc-200 pt-2.5 mt-1 flex justify-between items-center">
                        <span className="font-semibold text-zinc-900 text-sm">Preview Total Unpaid Fees:</span>
                        <span className="font-bold text-emerald-950 text-base">₹{outstandingBalance.toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </div>

            <CardFooter className="p-5 border-t border-zinc-100 bg-zinc-50/50 justify-end gap-3 shrink-0">
              {saveSuccess && (
                <div className="text-emerald-900 text-xs font-semibold flex items-center gap-1.5 mr-auto">
                  <CheckCircle2 className="w-4.5 h-4.5 text-emerald-700" />
                  <span>Ledger committed successfully. Routing...</span>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedStudentId("")}
                disabled={!selectedStudentId || saving}
              >
                Clear
              </Button>
              <Button
                size="sm"
                onClick={handleCommitLedger}
                disabled={!selectedStudentId || saving}
                className="gap-2"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Storing...
                  </>
                ) : (
                  <>
                    <Landmark className="w-3.5 h-3.5" /> Save Financial Changes
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
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
