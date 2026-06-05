"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileSpreadsheet, Play, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
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

  const [importMethod, setImportMethod] = useState<"single" | "bulk">("single");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [gradeLevel, setGradeLevel] = useState("10");
  const [sectionVal, setSectionVal] = useState("A");

  const [csvText, setCsvText] = useState("");
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [status, setStatus] = useState<{ type: "idle" | "success" | "error" | "processing"; message: string }>({
    type: "idle",
    message: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const defaultCsvSample = `first_name,last_name,roll_number,current_grade,section
Amit,Kumar,12,10,A
Deepa,Rao,34,10,A
Karan,Sharma,56,10,B
Sneha,Patel,89,9,C`;

  // Parse CSV helper
  const parseCSV = (text: string) => {
    try {
      const lines = text.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);
      if (lines.length <= 1) {
        throw new Error("CSV must include a header row and at least one student row.");
      }

      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const requiredHeaders = ["first_name", "last_name", "current_grade", "section"];
      
      const missing = requiredHeaders.filter((req) => !headers.includes(req));
      if (missing.length > 0) {
        throw new Error(`Missing required CSV column headers: ${missing.join(", ")}`);
      }

      const rowObjects: ParsedRow[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map((v) => v.trim());
        if (values.length < headers.length) continue; // Skip malformed rows
        
        const rowData: any = {};
        headers.forEach((header, index) => {
          rowData[header] = values[index];
        });

        rowObjects.push({
          first_name: rowData.first_name,
          last_name: rowData.last_name,
          roll_number: Number(rowData.roll_number) || i,
          current_grade: rowData.current_grade,
          section: rowData.section.toUpperCase(),
          parent_id: rowData.parent_id || undefined,
        });
      }

      setParsedData(rowObjects);
      setStatus({ type: "idle", message: "" });
    } catch (err: any) {
      setParsedData([]);
      setStatus({ type: "error", message: err.message || "Failed to parse CSV values." });
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setCsvText(text);
    if (text.trim()) {
      parseCSV(text);
    } else {
      setParsedData([]);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
      parseCSV(text);
    };
    reader.readAsText(file);
  };

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
        setCsvText("");
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
        <p className="text-xs text-zinc-505 mt-0.5 font-normal">Add new students to your school database, either one by one or by uploading a spreadsheet.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Selection Card: Single or Bulk */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border border-zinc-200 shadow-xs relative focus-within:z-30 hover:z-20">
            <CardHeader className="p-5">
              <div className="flex flex-wrap gap-2 border-b border-zinc-100 pb-3 mb-2">
                <button
                  type="button"
                  onClick={() => setImportMethod("single")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    importMethod === "single"
                      ? "bg-emerald-950 text-emerald-50 border-emerald-950"
                      : "bg-white text-zinc-650 border-zinc-200 hover:bg-zinc-50"
                  }`}
                >
                  Type Student Details
                </button>
                <button
                  type="button"
                  onClick={() => setImportMethod("bulk")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    importMethod === "bulk"
                      ? "bg-emerald-950 text-emerald-50 border-emerald-950"
                      : "bg-white text-zinc-655 border-zinc-200 hover:bg-zinc-50"
                  }`}
                >
                  Upload Spreadsheet (CSV)
                </button>
              </div>
              <CardTitle className="text-sm font-semibold">
                {importMethod === "single" ? "Add Single Student" : "1. Select or Drop Spreadsheet File"}
              </CardTitle>
              <CardDescription>
                {importMethod === "single" 
                  ? "Enter the student's details below to verify and save them." 
                  : "Upload a standard spreadsheet file or paste raw rows directly."}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0 space-y-4">
              {importMethod === "single" ? (
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
                  <Button type="submit" variant="outline" className="w-full mt-2 hover:border-emerald-600 hover:bg-emerald-50/20 text-emerald-950">
                    Add Student to Preview List
                  </Button>
                </form>
              ) : (
                <div className="space-y-5">
                  {/* Drag and Drop Area */}
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-zinc-200 hover:border-emerald-600 rounded-xl p-6 text-center cursor-pointer hover:bg-emerald-50/10 transition-all duration-200 group"
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileUpload} 
                      accept=".csv" 
                      className="hidden" 
                    />
                    <Upload className="w-8 h-8 text-zinc-400 group-hover:text-emerald-850 mx-auto transition-colors" />
                    <span className="text-xs font-semibold text-zinc-700 block mt-2">Select CSV File</span>
                    <span className="text-[10px] text-zinc-450 block mt-1">Accepts comma separated spreadsheets</span>
                  </div>

                  <div className="relative flex items-center justify-center">
                    <div className="absolute border-t border-zinc-200 w-full" />
                    <span className="relative bg-white px-2.5 text-[9px] font-semibold text-zinc-400 uppercase tracking-widest">
                      OR COPY & PASTE
                    </span>
                  </div>

                  {/* Text Area */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-zinc-650 uppercase tracking-wide">Pasted spreadsheet rows</label>
                      <button 
                        type="button"
                        onClick={() => {
                          setCsvText(defaultCsvSample);
                          parseCSV(defaultCsvSample);
                        }}
                        className="text-[10px] text-emerald-805 hover:text-emerald-950 font-semibold cursor-pointer"
                      >
                        Load Sample Rows
                      </button>
                    </div>
                    <textarea
                      value={csvText}
                      onChange={handleTextareaChange}
                      placeholder="first_name,last_name,roll_number,current_grade,section..."
                      className="w-full h-36 border border-zinc-200 rounded-lg p-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 resize-none bg-zinc-50/30"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Preview / Validation Grid */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border border-zinc-200 h-full flex flex-col justify-between relative focus-within:z-30 hover:z-20">
            <div>
              <CardHeader className="p-5 border-b border-zinc-100 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">2. Preview Student List</CardTitle>
                  <CardDescription>Review student row parsing properties before database commitment.</CardDescription>
                </div>
                <Badge variant={parsedData.length > 0 ? "success" : "neutral"}>
                  {parsedData.length} records parsed
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
                          <Badge variant="primary" className="py-0.5 px-2">
                            Grade {row.current_grade}-{row.section}
                          </Badge>
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
                  setCsvText("");
                  setStatus({ type: "idle", message: "" });
                }}
                disabled={parsedData.length === 0 || status.type === "processing"}
              >
                Clear
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
