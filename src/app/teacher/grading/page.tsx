"use client";

import React, { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Plus, GraduationCap, ChevronRight, CheckCircle2, AlertCircle, RefreshCw, Key, Database } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { fetchStudents } from "@/lib/db/students";
import { fetchGradebook, createAssessment, updateAssessmentScoresBatch, calculateWeightedGrades, updateGradebookStatus, createExamNotice } from "@/lib/db/gradebooks";
import { Student, Gradebook, Assessment } from "@/lib/db/mockDb";
import { Toast } from "@/components/ui/toast";
import { supabase } from "@/lib/supabase/client";

function GradingMatrixContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialGrade = searchParams.get("grade") || "10";
  const initialSection = searchParams.get("section") || "A";

  const [grade, setGrade] = useState(initialGrade);
  const [section, setSection] = useState(initialSection);
  const [term, setTerm] = useState("Term 1");
  const [subjectId, setSubjectId] = useState("MATH_101");

  const [students, setStudents] = useState<Student[]>([]);
  const [gradebook, setGradebook] = useState<Gradebook | null>(null);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState("");
  
  // Matrix states
  const [editedScores, setEditedScores] = useState<Record<string, string>>({}); // student_id -> score string
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "warning" | "error">("success");

  // New assessment modal fields
  const [showAddAsm, setShowAddAsm] = useState(false);
  const [asmTitle, setAsmTitle] = useState("");
  const [asmType, setAsmType] = useState<"mock_test" | "formal_exam">("mock_test");
  const [asmMaxMarks, setAsmMaxMarks] = useState("50");
  const [asmWeight, setAsmWeight] = useState("15");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  // Accordion and exam scheduling form states
  const [examNoticeOpen, setExamNoticeOpen] = useState(false);
  const [examTitle, setExamTitle] = useState("");
  const [examDate, setExamDate] = useState("");
  const [examTime, setExamTime] = useState("");
  const [examRoom, setExamRoom] = useState("");
  const [noticeSaving, setNoticeSaving] = useState(false);

  // Load roster and gradebook details
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const studentList = await fetchStudents(grade, section);
      setStudents(studentList);

      const gb = await fetchGradebook("2026", term, grade, section, subjectId);
      setGradebook(gb);

      if (gb && gb.assessments.length > 0) {
        // Default to first assessment
        setSelectedAssessmentId(gb.assessments[0].assessment_id);
      } else {
        setSelectedAssessmentId("");
      }
      setLoading(false);
    }
    loadData();
  }, [grade, section, term, subjectId, router]);

  // Sync edited scores when selected assessment changes
  useEffect(() => {
    if (!gradebook || !selectedAssessmentId) {
      setEditedScores({});
      return;
    }

    const currentAsm = gradebook.assessments.find((a) => a.assessment_id === selectedAssessmentId);
    if (currentAsm) {
      const scoresMap: Record<string, string> = {};
      students.forEach((s) => {
        const val = currentAsm.scores[s._id];
        scoresMap[s._id] = val !== undefined ? String(val) : "";
      });
      setEditedScores(scoresMap);
    }
  }, [selectedAssessmentId, gradebook, students]);

  const activeAssessment = gradebook?.assessments.find(
    (a) => a.assessment_id === selectedAssessmentId
  );

  // Capture keystrokes in inputs to shift vertical focus (spreadsheet navigation)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      // Move focus down
      const nextInput = document.getElementById(`grade-input-${index + 1}`);
      if (nextInput) {
        (nextInput as HTMLInputElement).focus();
        (nextInput as HTMLInputElement).select();
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextInput = document.getElementById(`grade-input-${index + 1}`);
      if (nextInput) {
        (nextInput as HTMLInputElement).focus();
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevInput = document.getElementById(`grade-input-${index - 1}`);
      if (prevInput) {
        (prevInput as HTMLInputElement).focus();
      }
    }
  };

  const handleScoreKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    // Completely block execution of alphabetic keys inside numerical grade cells.
    const isAlphabet = /^[a-zA-Z]$/.test(e.key);
    if (isAlphabet) {
      e.preventDefault();
      return;
    }
    handleKeyDown(e, index);
  };

  const handleScoreChange = (studentId: string, val: string) => {
    // Restrict inputs to valid integers or decimals
    if (val !== "" && !/^\d*\.?\d*$/.test(val)) {
      return;
    }

    setEditedScores({
      ...editedScores,
      [studentId]: val,
    });
  };

  const handleCreateAssessmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradebook || !asmTitle.trim()) return;

    setSaving(true);
    const success = await createAssessment(
      gradebook._id,
      asmTitle.trim(),
      Number(asmMaxMarks),
      asmType,
      asmType === "mock_test" ? 15 : 50,
      subjectId
    );

    if (success) {
      // Reload gradebook
      const updated = await fetchGradebook("2026", term, grade, section, subjectId);
      setGradebook(updated);
      if (updated && updated.assessments.length > 0) {
        setSelectedAssessmentId(updated.assessments[updated.assessments.length - 1].assessment_id);
      }
      setShowAddAsm(false);
      setAsmTitle("");
      setToastMessage("New test column created successfully.");
      setToastType("success");
      setShowToast(true);
    }
    setSaving(false);
  };

  const handleCommitScores = async () => {
    if (!gradebook || !selectedAssessmentId) return;

    const maxVal = activeAssessment ? activeAssessment.max_marks : 100;
    let hasInvalid = false;
    const revertedScores = { ...editedScores };

    Object.entries(editedScores).forEach(([studentId, strVal]) => {
      if (strVal !== "") {
        const num = Number(strVal);
        if (isNaN(num) || num < 0 || num > maxVal) {
          hasInvalid = true;
          // Revert the cell input value to its previous valid historical state in database
          const lastSavedScore = activeAssessment?.scores[studentId] !== undefined ? String(activeAssessment.scores[studentId]) : "";
          revertedScores[studentId] = lastSavedScore;
        }
      }
    });

    if (hasInvalid) {
      setEditedScores(revertedScores);
      setToastMessage("Invalid Score: Marks entered must be between 0 and the maximum total marks allowed.");
      setToastType("error");
      setShowToast(true);
      return;
    }

    setSaving(true);
    setSaveMessage("Saving score modifications...");

    // Convert strings back to numbers
    const scoreNumbers: Record<string, number> = {};
    Object.entries(editedScores).forEach(([studentId, strVal]) => {
      if (strVal !== "") {
        scoreNumbers[studentId] = Number(strVal);
      }
    });

    const success = await updateAssessmentScoresBatch(
      gradebook._id,
      selectedAssessmentId,
      scoreNumbers
    );

    if (success) {
      // Reload gradebook
      const updated = await fetchGradebook("2026", term, grade, section, subjectId);
      setGradebook(updated);
      setSaveMessage("Auto-saved scores committed to database.");
      setTimeout(() => setSaveMessage(""), 2000);
      setToastMessage("Student scores saved successfully.");
      setToastType("success");
      setShowToast(true);
    }
    setSaving(false);
  };

  const handlePublishGradebook = async () => {
    if (!gradebook || !selectedAssessmentId) return;
    setSaving(true);
    const success = await updateGradebookStatus(selectedAssessmentId, "published");
    if (success) {
      const updatedAssessments = gradebook.assessments.map((a) => {
        if (a.assessment_id === selectedAssessmentId) {
          return { ...a, status: "published" as const };
        }
        return a;
      });
      setGradebook({
        ...gradebook,
        status: "published",
        assessments: updatedAssessments,
      });
      setToastMessage("Gradebook results published successfully!");
      setToastType("success");
      setShowToast(true);
    } else {
      setToastMessage("Failed to publish gradebook results.");
      setToastType("error");
      setShowToast(true);
    }
    setSaving(false);
  };

  const handlePostExamNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examTitle.trim() || !examDate || !examTime || !examRoom.trim()) return;

    setNoticeSaving(true);
    const classId = `G${grade}-${section}`;
    const success = await createExamNotice(
      classId,
      subjectId,
      examTitle.trim(),
      examDate,
      examTime,
      examRoom.trim()
    );

    if (success) {
      setToastMessage("Exam notice posted successfully!");
      setToastType("success");
      setShowToast(true);
      setExamTitle("");
      setExamDate("");
      setExamTime("");
      setExamRoom("");
      setExamNoticeOpen(false);
    } else {
      setToastMessage("Failed to post exam notice.");
      setToastType("error");
      setShowToast(true);
    }
    setNoticeSaving(false);
  };

  // Perform weighted aggregates analysis (Term Compiler dashboard preview)
  const weightedPerformance = gradebook ? calculateWeightedGrades(gradebook, students.map((s) => s._id)) : {};

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Class Gradebook</h1>
          <p className="text-xs text-zinc-505 mt-0.5 font-normal">Click a score box to type marks. Use your keyboard's Up/Down arrows or Enter key to move quickly down rows. Scores save automatically.</p>
        </div>
        <Button size="sm" onClick={() => setShowAddAsm(true)} disabled={loading}>
          <Plus className="w-4 h-4 mr-1.5" /> Create Assessment Column
        </Button>
      </div>

      {/* Class Selection Controls */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Step 1: Select Your Class & Test</h3>
        <Card className="border border-zinc-200 shadow-xs relative focus-within:z-30 hover:z-20">
        <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-650 uppercase tracking-wide">Grade</label>
            <Select value={grade} onChange={(e) => setGrade(e.target.value)}>
              <option value="9">Grade 9</option>
              <option value="10">Grade 10</option>
              <option value="11">Grade 11</option>
              <option value="12">Grade 12</option>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-655 uppercase tracking-wide">Section</label>
            <Select value={section} onChange={(e) => setSection(e.target.value)}>
              <option value="A">Section A</option>
              <option value="B">Section B</option>
              <option value="C">Section C</option>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-655 uppercase tracking-wide">Subject</label>
            <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              <option value="MATH_101">Mathematics</option>
              <option value="SCI_202">Sciences</option>
              <option value="ENG_303">English Grammar</option>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-655 uppercase tracking-wide">Assessment Column</label>
            <Select
              value={selectedAssessmentId}
              onChange={(e) => setSelectedAssessmentId(e.target.value)}
              disabled={loading || !gradebook || gradebook.assessments.length === 0}
            >
              {!gradebook || gradebook.assessments.length === 0 ? (
                <option value="">-- No tests added yet --</option>
              ) : (
                gradebook.assessments.map((a) => (
                  <option key={a.assessment_id} value={a.assessment_id}>
                    {a.title} ({a.type === "mock_test" ? "Mock" : "Exam"} - Out of {a.max_marks})
                  </option>
                ))
              )}
            </Select>
          </div>
        </CardContent>
      </Card>
      </div>

      {/* Add Assessment column Form overlay */}
      {showAddAsm && (
        <Card className="border border-emerald-600 bg-emerald-50/5 animate-fade-in">
          <form onSubmit={handleCreateAssessmentSubmit}>
            <CardHeader className="p-5 border-b border-zinc-200">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-emerald-850" /> Add a New Test or Exam Column
              </CardTitle>
              <CardDescription>Create a new column in your spreadsheet to record grades.</CardDescription>
            </CardHeader>
            <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-800">Test or Exam Name (e.g., Algebra Quiz 1)</label>
                <Input
                  value={asmTitle}
                  onChange={(e) => setAsmTitle(e.target.value)}
                  placeholder="e.g. Unit Test Algebra"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-800">Type of Test</label>
                <Select value={asmType} onChange={(e) => setAsmType(e.target.value as any)}>
                  <option value="mock_test">Regular Class Test / Quiz</option>
                  <option value="formal_exam">Official Final / Term Exam</option>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-800">Total Marks (e.g., 50 or 100)</label>
                <Input
                  type="number"
                  value={asmMaxMarks}
                  onChange={(e) => setAsmMaxMarks(e.target.value)}
                  placeholder="50"
                  min="1"
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="p-5 border-t border-zinc-200 bg-zinc-50/50 justify-end gap-3.5">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowAddAsm(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? "Creating column..." : "Create Grade Column"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

      {/* Main Grading Matrix Table Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Spreadsheet Data Entry Grid */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <h3 className="text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2">Step 2: Enter Student Scores</h3>
            <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
              <h2 className="text-lg font-semibold text-zinc-900 tracking-tight">Score Sheet</h2>
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Key className="w-3.5 h-3.5 text-zinc-400" /> Use <kbd className="bg-zinc-150 px-1 border border-zinc-250 rounded-sm">Enter</kbd> / <kbd className="bg-zinc-150 px-1 border border-zinc-250 rounded-sm">↓</kbd> / <kbd className="bg-zinc-150 px-1 border border-zinc-250 rounded-sm">↑</kbd> keys to shift cells.
              </div>
            </div>
          </div>

          {/* Section A: The Publishing Status Banner */}
          {gradebook && activeAssessment && (
            <Card className={`border ${
              activeAssessment.status === "published"
                ? "border-[#10B981]/30 bg-[#E6F4EA]"
                : "border-amber-500/30 bg-[#FEF3C7]"
            } overflow-hidden shadow-xs animate-fade-in`}>
              <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${
                    activeAssessment.status === "published" ? "bg-[#10B981] animate-pulse" : "bg-amber-500"
                  }`} />
                  <div>
                    <span className="font-bold text-zinc-900 block leading-tight text-xs uppercase tracking-wider">
                      Status: {activeAssessment.status === "published" ? "Published" : "Draft"}
                    </span>
                    <span className="text-[10px] text-zinc-500 mt-0.5 block">
                      {activeAssessment.status === "published"
                        ? "Scores are visible to families on the Student Portal & Parent Hub."
                        : "Scores are hidden from families (Draft status)."}
                    </span>
                  </div>
                </div>
                {activeAssessment.status !== "published" && (
                  <Button
                    size="sm"
                    onClick={handlePublishGradebook}
                    disabled={saving}
                    className="btn-primary"
                  >
                    Publish Results & Alert
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Section B: The Exam Scheduler Accordion */}
          <Card className="border border-zinc-200 overflow-hidden shadow-xs animate-fade-in">
            <button
              type="button"
              onClick={() => setExamNoticeOpen(!examNoticeOpen)}
              className="w-full flex justify-between items-center px-5 py-4 font-semibold text-zinc-900 hover:bg-zinc-50/50 transition-colors text-xs uppercase tracking-wider text-left cursor-pointer"
            >
              <span>Post Exam Notice / Timetable</span>
              <span className="text-zinc-400 font-bold text-base transition-transform duration-200">
                {examNoticeOpen ? "−" : "+"}
              </span>
            </button>
            
            {examNoticeOpen && (
              <CardContent className="p-5 pt-0 border-t border-zinc-100 animate-in fade-in duration-200">
                <form onSubmit={handlePostExamNotice} className="space-y-4 pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-700">Exam Title</label>
                      <Input
                        value={examTitle}
                        onChange={(e) => setExamTitle(e.target.value)}
                        placeholder="e.g. Math Midterm Exam"
                        required
                        className="input-premium"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-700">Date</label>
                      <Input
                        type="date"
                        value={examDate}
                        onChange={(e) => setExamDate(e.target.value)}
                        required
                        className="input-premium"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-700">Time</label>
                      <Input
                        type="time"
                        value={examTime}
                        onChange={(e) => setExamTime(e.target.value)}
                        required
                        className="input-premium"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-700">Room Number</label>
                      <Input
                        value={examRoom}
                        onChange={(e) => setExamRoom(e.target.value)}
                        placeholder="e.g. Room 404"
                        required
                        className="input-premium"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end pt-2">
                    <Button type="submit" size="sm" className="btn-primary" disabled={noticeSaving}>
                      {noticeSaving ? "Posting notice..." : "Post Notice to Class Portal"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            )}
          </Card>

          <Card className="border border-zinc-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-200 text-left text-sm">
                <thead className="bg-zinc-50 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="px-6 py-4">Roll</th>
                    <th scope="col" className="px-6 py-4">Student Name</th>
                    <th scope="col" className="px-6 py-4">
                      {activeAssessment ? (
                        <span>
                          Test Score <span className="font-semibold text-emerald-850">(Out of {activeAssessment.max_marks})</span>
                        </span>
                      ) : (
                        <span>Assessment Score Target</span>
                      )}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-zinc-200">
                  {loading ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-zinc-405 text-xs">
                        Fetching grade registry sheets...
                      </td>
                    </tr>
                  ) : students.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-zinc-405 text-xs">
                        No students enrolled in this section.
                      </td>
                    </tr>
                  ) : !selectedAssessmentId ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-zinc-405 text-xs">
                        Create an Assessment Column to start grading grades.
                      </td>
                    </tr>
                  ) : (
                    students.map((student, idx) => (
                      <tr key={student._id} className="hover:bg-zinc-50/30 transition-colors">
                        <td className="px-6 py-4 text-zinc-500 font-semibold text-xs">
                          #{student.personal_details.roll_number}
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-medium text-zinc-900 block leading-tight">
                            {student.personal_details.first_name} {student.personal_details.last_name}
                          </span>
                          <span className="text-[10px] text-zinc-400">ID: {student._id}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="w-32 relative">
                            <Input
                              id={`grade-input-${idx}`}
                              value={editedScores[student._id] || ""}
                              onChange={(e) => handleScoreChange(student._id, e.target.value)}
                              onKeyDown={(e) => handleScoreKeyDown(e, idx)}
                              onBlur={handleCommitScores} // Auto-saves score on blur for zero friction
                              placeholder="Pending"
                              className="text-center font-bold font-mono focus:border-emerald-600 focus:ring-emerald-600 h-9 bg-zinc-50/10 text-xs"
                              disabled={saving}
                            />
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            <CardFooter className="p-4 border-t border-zinc-100 bg-zinc-50/50 justify-between items-center text-xs text-zinc-500">
              <span className="flex items-center gap-1.5">
                <Database className="w-4 h-4 text-zinc-405" />
                {saveMessage ? (
                  <span className="text-emerald-950 font-bold tracking-tight animate-pulse">{saveMessage}</span>
                ) : (
                  <span>Grades autosave instantly when exiting an input cell (blur).</span>
                )}
              </span>
              <Button size="sm" onClick={handleCommitScores} disabled={saving || !selectedAssessmentId}>
                {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Save Scores Matrix"}
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Term Compiler Aggregates Dashboard */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
            <h2 className="text-lg font-semibold text-zinc-900 tracking-tight">Class Averages</h2>
          </div>

          <Card className="border border-zinc-200 shadow-xs">
            <CardHeader className="p-5 border-b border-zinc-100">
              <CardTitle className="text-sm font-semibold">Weighted Class Performance</CardTitle>
              <CardDescription>Real-time weighted score compilation from active assessments.</CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {loading ? (
                <div className="text-center text-zinc-400 text-xs py-4">Computing weighted stats...</div>
              ) : students.length === 0 || !gradebook || gradebook.assessments.length === 0 ? (
                <div className="text-center text-zinc-400 text-xs py-4">No grading weights compiled.</div>
              ) : (
                <div className="space-y-3.5">
                  {students.map((student) => {
                    const perf = weightedPerformance[student._id];
                    if (!perf) return null;
                    return (
                      <div key={student._id} className="flex justify-between items-center text-xs pb-3.5 border-b border-zinc-150 last:border-0 last:pb-0">
                        <div>
                          <span className="font-semibold text-zinc-800 block">
                            {student.personal_details.first_name} {student.personal_details.last_name}
                          </span>
                          <span className="text-[10px] text-zinc-400">Total weight: {perf.maxScore}% compiled</span>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <span className="font-semibold font-mono text-zinc-705 text-xs">{perf.percentage}%</span>
                          <Badge variant={perf.gradeLetter === "F" ? "danger" : "primary"} className="w-8 justify-center font-bold">
                            {perf.gradeLetter}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {showToast && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setShowToast(false)}
        />
      )}
    </div>
  );
}

export default function GradingMatrix() {
  return (
    <Suspense fallback={<div className="text-center text-zinc-400 text-xs py-12">Loading grading matrix...</div>}>
      <GradingMatrixContent />
    </Suspense>
  );
}
