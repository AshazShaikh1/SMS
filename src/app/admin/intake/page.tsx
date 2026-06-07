"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Play, CheckCircle2, AlertCircle, RefreshCw, Clipboard, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { importStudentsCSV } from "@/lib/db/students";
import { supabase } from "@/lib/supabase/client";

interface ParsedRow {
  first_name: string;
  last_name: string;
  roll_number: number;
  current_grade: string;
  section: string;
  parent_id?: string;
}

export default function StudentIntake() {
  const router = useRouter();

  useEffect(() => {
    async function checkSession() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
      }
    }
    checkSession();
  }, [router]);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [gradeLevel, setGradeLevel] = useState("10");
  const [sectionVal, setSectionVal] = useState("A");

  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [status, setStatus] = useState<{ type: "idle" | "success" | "error" | "processing"; message: string }>({
    type: "idle",
    message: "",
  });

  const handleSingleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) return;

    const newRow: ParsedRow = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      roll_number: Number(rollNumber) || (parsedData.length + 1),
      current_grade: gradeLevel,
      section: sectionVal.toUpperCase(),
    };

    setParsedData([...parsedData, newRow]);
    setFirstName("");
    setLastName("");
    setRollNumber("");
  };

  const handleRemoveRow = (index: number) => {
    setParsedData(parsedData.filter((_, idx) => idx !== index));
  };

  const handleIngest = async () => {
    if (parsedData.length === 0) return;
    setStatus({ type: "processing", message: "Executing transaction batch write..." });

    try {
      const result = await importStudentsCSV(parsedData);
      if (result.success) {
        setStatus({
          type: "success",
          message: `Successfully ingested batch of ${result.count} students. Modifiers ledger calculations mapped.`,
        });
        setParsedData([]);
        setTimeout(() => {
          router.push("/admin");
        }, 1500);
      } else {
        setStatus({
          type: "error",
          message: "Failed to write batch transaction. Please check your data fields.",
        });
      }
    } catch (error: any) {
      setStatus({ type: "error", message: error.message || "An unexpected write failure occurred." });
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Add Students</h1>
        <p className="text-xs text-zinc-505 mt-0.5 font-normal">Add new students manually to your school database and verify their details.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Selection Card: Single */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border border-zinc-200 shadow-xs relative focus-within:z-30 hover:z-20">
            <CardHeader className="p-5">
              <CardTitle className="text-sm font-semibold">
                Add Single Student
              </CardTitle>
              <CardDescription>
                Enter the student's details below to verify and add them to the queue.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0 space-y-4">
              <form onSubmit={handleSingleAdd} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-800">First Name</label>
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Rahul"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-800">Last Name</label>
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="e.g. Sharma"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-800">Roll Number (Optional)</label>
                  <Input
                    type="number"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    placeholder="e.g. 76"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-800">Grade</label>
                    <Select value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)}>
                      <option value="9">Grade 9</option>
                      <option value="10">Grade 10</option>
                      <option value="11">Grade 11</option>
                      <option value="12">Grade 12</option>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-800">Section</label>
                    <Select value={sectionVal} onChange={(e) => setSectionVal(e.target.value)}>
                      <option value="A">Section A</option>
                      <option value="B">Section B</option>
                      <option value="C">Section C</option>
                    </Select>
                  </div>
                </div>
                <Button type="submit" variant="outline" className="w-full mt-2 hover:border-emerald-600 hover:bg-emerald-50/20 text-emerald-950 flex items-center justify-center gap-1.5">
                  <Plus className="w-4 h-4" /> Add Student to Queue
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Preview / Validation Grid */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border border-zinc-200 h-full flex flex-col justify-between relative focus-within:z-30 hover:z-20">
            <div>
              <CardHeader className="p-5 border-b border-zinc-100 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">Verify Student List</CardTitle>
                  <CardDescription>Review student row properties before database commitment.</CardDescription>
                </div>
                <Badge variant={parsedData.length > 0 ? "success" : "neutral"}>
                  {parsedData.length} records in queue
                </Badge>
              </CardHeader>
              
              <CardContent className="p-0">
                {status.type === "processing" && (
                  <div className="p-8 text-center text-zinc-500 text-xs flex flex-col items-center gap-3">
                    <RefreshCw className="w-6 h-6 animate-spin text-emerald-850" />
                    <span>Committing transaction blocks...</span>
                  </div>
                )}

                {status.type === "success" && (
                  <div className="p-8 text-center text-emerald-800 text-xs flex flex-col items-center gap-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-700" />
                    <span className="font-semibold text-sm">{status.message}</span>
                  </div>
                )}

                {status.type === "error" && (
                  <div className="p-5 text-red-700 text-xs flex items-start gap-2 bg-red-50 border-b border-red-150">
                    <AlertCircle className="w-4.5 h-4.5 shrink-0" />
                    <span>{status.message}</span>
                  </div>
                )}

                {status.type !== "processing" && status.type !== "success" && parsedData.length === 0 && (
                  <div className="p-12 text-center text-zinc-400 text-xs">
                    Your student rows will show up here for you to verify before saving them to the system.
                  </div>
                )}

                {parsedData.length > 0 && status.type !== "success" && status.type !== "processing" && (
                  <>
                    {/* Mobile Preview List */}
                    <div className="divide-y divide-zinc-100 md:hidden max-h-96 overflow-y-auto">
                      {parsedData.map((row, idx) => (
                        <div key={idx} className="p-4 flex items-center justify-between text-xs hover:bg-zinc-50/40 bg-white">
                          <div>
                            <span className="font-semibold text-zinc-800 block text-sm">
                              {row.first_name} {row.last_name}
                            </span>
                            <span className="text-[10px] text-zinc-400">Roll: #{row.roll_number}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="primary" className="py-0.5 px-2">
                              Grade {row.current_grade}-{row.section}
                            </Badge>
                            <button
                              onClick={() => handleRemoveRow(idx)}
                              className="text-red-650 hover:text-red-800 p-1 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop Preview Table */}
                    <div className="overflow-x-auto max-h-96 hidden md:block">
                      <table className="min-w-full divide-y divide-zinc-200 text-left text-xs">
                        <thead className="bg-zinc-50 text-[10px] font-bold text-zinc-500 uppercase tracking-wider sticky top-0">
                          <tr>
                            <th className="px-5 py-3.5">Roll</th>
                            <th className="px-5 py-3.5">First Name</th>
                            <th className="px-5 py-3.5">Last Name</th>
                            <th className="px-5 py-3.5">Grade</th>
                            <th className="px-5 py-3.5">Section</th>
                            <th className="px-5 py-3.5 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-zinc-150">
                          {parsedData.map((row, idx) => (
                            <tr key={idx} className="hover:bg-zinc-50/40">
                              <td className="px-5 py-3 text-zinc-500 font-semibold">#{row.roll_number}</td>
                              <td className="px-5 py-3 font-medium text-zinc-800">{row.first_name}</td>
                              <td className="px-5 py-3 font-medium text-zinc-800">{row.last_name}</td>
                              <td className="px-5 py-3">{row.current_grade}</td>
                              <td className="px-5 py-3">
                                <span className="font-bold text-emerald-850">{row.section}</span>
                              </td>
                              <td className="px-5 py-3 text-right">
                                <button
                                  onClick={() => handleRemoveRow(idx)}
                                  className="text-red-650 hover:text-red-800 p-1.5 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </CardContent>
            </div>
            
            <CardFooter className="p-5 border-t border-zinc-100 bg-zinc-50/50 justify-end gap-3 shrink-0">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setParsedData([]);
                  setStatus({ type: "idle", message: "" });
                }}
                disabled={parsedData.length === 0 || status.type === "processing"}
              >
                Clear Queue
              </Button>
              <Button 
                size="sm" 
                onClick={handleIngest}
                disabled={parsedData.length === 0 || status.type === "processing"}
                className="gap-2"
              >
                <Play className="w-3.5 h-3.5" /> Save All Students to School Database
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
