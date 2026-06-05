"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Users, Landmark, UserPlus, FileEdit, ChevronRight, Wallet, Loader2, Sparkles } from "lucide-react";
import { FinancialHealthBar } from "@/components/dashboard/FinancialHealthBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fetchStudents } from "@/lib/db/students";
import { Student } from "@/lib/db/mockDb";
import { supabase } from "@/lib/supabase/client";
import { createClient } from "@supabase/supabase-js";

export default function AdminDashboard() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [schoolName, setSchoolName] = useState("School Dashboard");
  const [loading, setLoading] = useState(true);
  const [schoolId, setSchoolId] = useState<string | null>(null);

  // Materialization & Onboarding Ledger States
  const [isMaterializing, setIsMaterializing] = useState(false);
  const [materializingStatus, setMaterializingStatus] = useState("");
  const [materializationError, setMaterializationError] = useState<string | null>(null);
  const [showLedgerBanner, setShowLedgerBanner] = useState(false);
  const [rosterCredentials, setRosterCredentials] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      // Verify session
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // Fetch School Name and School ID
      const { data: profile } = await supabase
        .from("profiles")
        .select("school_id, school:schools(school_name)")
        .eq("id", user.id)
        .single();
      
      let currentSchoolId = "";
      if (profile) {
        currentSchoolId = profile.school_id;
        setSchoolId(currentSchoolId);
        if (profile.school) {
          setSchoolName((profile.school as any).school_name);
        }
      }

      if (currentSchoolId) {
        // 1. Check if staging row exists
        const { data: stagingData, error: stagingError } = await supabase
          .from("onboarding_staging")
          .select("staged_data")
          .eq("school_id", currentSchoolId)
          .maybeSingle();

        if (stagingData && stagingData.staged_data) {
          // Trigger Phase 2 bulk row materialization
          await materializeSchoolData(currentSchoolId, stagingData.staged_data);
        } else {
          // 2. No staging row. Check if credentials exist in localStorage from a previous execution
          const cachedRoster = localStorage.getItem(`staged_credentials_${currentSchoolId}`);
          const cachedBanner = localStorage.getItem(`show_ledger_banner_${currentSchoolId}`);
          if (cachedRoster && cachedBanner === "true") {
            setRosterCredentials(JSON.parse(cachedRoster));
            setShowLedgerBanner(true);
          }
        }
      }

      const list = await fetchStudents();
      setStudents(list);
      setLoading(false);
    }
    loadData();
  }, [router]);

  const materializeSchoolData = async (activeSchoolId: string, stagedData: any) => {
    setIsMaterializing(true);
    setMaterializationError(null);
    const schoolSlug = stagedData.schoolSlug || "school";
    
    // Create the secondary non-persisting Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-url.supabase.co";
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";
    
    const tempAuthClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });

    const roster: any[] = [];
    const existingUsernames = new Set<string>();

    // Helper for unique username generation
    const generateUniqueUsername = (base: string): string => {
      let username = base;
      let counter = 1;
      while (existingUsernames.has(username)) {
        username = `${base}-${counter}`;
        counter++;
      }
      existingUsernames.add(username);
      return username;
    };

    // Helper for password generation
    const generateRandomPIN = (): string => {
      let pin = "";
      for (let i = 0; i < 8; i++) {
        pin += Math.floor(Math.random() * 10).toString();
      }
      return pin;
    };

    // Helper for Levenshtein Distance (to find typographical variations in names)
    const getLevenshteinDistance = (a: string, b: string): number => {
      const tmp = [];
      let i, j;
      for (i = 0; i <= a.length; i++) {
        tmp.push([i]);
      }
      for (j = 0; j <= b.length; j++) {
        tmp[0][j] = j;
      }
      for (i = 1; i <= a.length; i++) {
        for (j = 1; j <= b.length; j++) {
          tmp[i][j] = Math.min(
            tmp[i - 1][j] + 1,
            tmp[i][j - 1] + 1,
            tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
          );
        }
      }
      return tmp[a.length][b.length];
    };

    try {
      // 1. Provision Classes
      setMaterializingStatus("Provisioning school structure & classrooms...");
      const { preparedClasses = [], teachers = [], parsedStudents = [] } = stagedData;

      // Check existing classes to prevent duplicate key errors
      const { data: existingClasses, error: fetchClassesError } = await supabase
        .from("classes")
        .select("id, grade_level, section")
        .eq("school_id", activeSchoolId);

      if (fetchClassesError) throw new Error(`Failed to check existing classes: ${fetchClassesError.message}`);

      const classIdMap = new Map<string, string>(); // "Grade X-Section" -> classId UUID
      if (existingClasses) {
        existingClasses.forEach(c => {
          classIdMap.set(`${c.grade_level}-${c.section}`, c.id);
        });
      }

      for (const cls of preparedClasses) {
        const classKey = `${cls.gradeKey}-${cls.section}`;
        if (!classIdMap.has(classKey)) {
          const { data: insertedClass, error: insertClassError } = await supabase
            .from("classes")
            .insert({
              school_id: activeSchoolId,
              grade_level: cls.gradeKey,
              section: cls.section,
              base_fee_amount: cls.baseFee
            })
            .select("id")
            .single();

          if (insertClassError || !insertedClass) {
            throw new Error(`Failed to create class ${classKey}: ${insertClassError?.message}`);
          }
          classIdMap.set(classKey, insertedClass.id);
        }
      }

      // 2. Provision Teachers
      setMaterializingStatus("Registering teacher credentials...");
      
      const teacherProfileIdMap = new Map<string, string>(); // staged teacher ID -> newly created user UUID

      for (const teacher of teachers) {
        // Mrs. Susan Smith -> Smith
        const cleanName = teacher.name.replace(/^(mr|mrs|ms|dr|prof)\.?\s+/i, "").trim();
        const parts = cleanName.split(/\s+/);
        let last = "teach";
        let firsts = "";
        if (parts.length > 0) {
          last = parts[parts.length - 1].toLowerCase().replace(/[^a-z0-9]/g, "");
          firsts = parts.slice(0, -1).map((p: string) => p[0] || "").join("").toLowerCase().replace(/[^a-z0-9]/g, "");
        }
        
        const baseTeacherUsername = `${schoolSlug}-teach-${last}${firsts}`;
        const teacherUsername = generateUniqueUsername(baseTeacherUsername);
        const teacherEmail = `${teacherUsername}@internal-sms.local`;
        const teacherPassword = generateRandomPIN();

        // Sign up teacher in Auth
        const { data: teacherAuth, error: teacherAuthError } = await tempAuthClient.auth.signUp({
          email: teacherEmail,
          password: teacherPassword,
          options: {
            data: {
              full_name: teacher.name,
            }
          }
        });

        if (teacherAuthError || !teacherAuth.user) {
          throw new Error(`Auth signup failed for teacher ${teacher.name}: ${teacherAuthError?.message}`);
        }

        const teacherUserId = teacherAuth.user.id;
        teacherProfileIdMap.set(teacher.id, teacherUserId);

        // Create Profile row
        const { error: teacherProfileError } = await supabase
          .from("profiles")
          .insert({
            id: teacherUserId,
            school_id: activeSchoolId,
            email: teacherUsername, // username stored in email field
            full_name: teacher.name,
            role: "teacher"
          });

        if (teacherProfileError) {
          throw new Error(`Failed to establish profile for teacher ${teacher.name}: ${teacherProfileError.message}`);
        }

        // Link Teacher to their assigned classes in database
        for (const classKey of (teacher.assignedClasses || [])) {
          const classId = classIdMap.get(classKey);
          if (classId) {
            const { error: updateClassError } = await supabase
              .from("classes")
              .update({ instructor_id: teacherUserId })
              .eq("id", classId);

            if (updateClassError) {
              console.error(`Failed to assign teacher to class ${classKey}:`, updateClassError);
            }
          }
        }

        // Push to Roster list
        roster.push({
          fullName: teacher.name,
          role: "Teacher",
          assignedClass: teacher.assignedClasses.join(", ").replace(/Grade /g, "") || "None",
          username: teacherUsername,
          password: teacherPassword
        });
      }

      // 3. De-duplicate and Provision Parents (Phone-First 2-Step Verification)
      setMaterializingStatus("De-duplicating and registering parent accounts...");
      
      // Cache map key: clean phone number -> array of registered parent records for that phone number
      const phoneParentCache = new Map<string, { id: string; name: string; username: string; password: string }[]>();
      const studentParentIdMap = new Map<string, string>(); // student email -> parent profile UUID

      for (const student of parsedStudents) {
        const parentName = (student.parentName || "").trim();
        const parentPhone = (student.parentPhone || "").trim();
        const cleanPhone = parentPhone.replace(/[\s\-\(\)]/g, "");

        if (!parentName) continue;

        let resolvedParent: { id: string; username: string; password: string } | null = null;

        // 1. Primary Lock: Extract and clean parent phone number
        if (cleanPhone) {
          const existingParents = phoneParentCache.get(cleanPhone);
          if (existingParents) {
            // 2. Secondary Confirmation: check parent's name string normalization
            const normalizeName = (n: string) => n.toLowerCase().replace(/[^a-z0-9]/g, "");
            const normNewName = normalizeName(parentName);
            
            // Check if match or minor typographical variation (Levenshtein distance <= 2)
            const matchedParent = existingParents.find(p => {
              const normExistingName = normalizeName(p.name);
              const distance = getLevenshteinDistance(normNewName, normExistingName);
              return distance <= 2;
            });

            if (matchedParent) {
              // Bypass creating duplicate parent account
              resolvedParent = matchedParent;
            } else {
              // Names are completely distinct -> administrative typo
              console.warn(`[Diagnostic Warning] Suspected administrative typo: Distinct parent names ("${parentName}" vs "${existingParents[0].name}") sharing same phone number: ${cleanPhone}. Creating isolated parent record.`);
            }
          }
        }

        // If no match found (or phone number did not exist or names were completely distinct)
        if (!resolvedParent) {
          const baseParentUsername = `${schoolSlug}-par-${student.rollNumber}`;
          const parentUsername = generateUniqueUsername(baseParentUsername);
          const parentEmail = `${parentUsername}@internal-sms.local`;
          const parentPassword = generateRandomPIN();

          // Sign up parent in Auth
          const { data: parentAuth, error: parentAuthError } = await tempAuthClient.auth.signUp({
            email: parentEmail,
            password: parentPassword,
            options: {
              data: {
                full_name: student.parentName,
              }
            }
          });

          if (parentAuthError || !parentAuth.user) {
            throw new Error(`Auth signup failed for parent ${student.parentName}: ${parentAuthError?.message}`);
          }

          const parentUserId = parentAuth.user.id;

          // Create Profile row
          const { error: parentProfileError } = await supabase
            .from("profiles")
            .insert({
              id: parentUserId,
              school_id: activeSchoolId,
              email: parentUsername,
              full_name: student.parentName,
              role: "parent",
              phone_number: parentPhone || null
            });

          if (parentProfileError) {
            throw new Error(`Failed to establish profile for parent ${student.parentName}: ${parentProfileError.message}`);
          }

          resolvedParent = {
            id: parentUserId,
            username: parentUsername,
            password: parentPassword
          };

          // Save to phone cache
          if (cleanPhone) {
            if (!phoneParentCache.has(cleanPhone)) {
              phoneParentCache.set(cleanPhone, []);
            }
            phoneParentCache.get(cleanPhone)!.push({
              id: parentUserId,
              name: student.parentName,
              username: parentUsername,
              password: parentPassword
            });
          }

          // Push to Roster list
          roster.push({
            fullName: student.parentName,
            role: "Parent",
            assignedClass: `${student.gradeLevel.replace("Grade ", "")}-${student.section} (Child: ${student.name})`,
            username: parentUsername,
            password: parentPassword
          });
        }

        // Associate parent UUID with student email
        studentParentIdMap.set(student.email, resolvedParent.id);
      }

      // 4. Provision Students
      setMaterializingStatus("Registering student accounts & setting up ledgers...");

      for (const student of parsedStudents) {
        const gradeNum = student.gradeLevel.replace(/[^0-9]/g, "");
        const cleanSec = student.section.toLowerCase().replace(/[^a-z0-9]/g, "");
        const baseStudentUsername = `${schoolSlug}-stu-${gradeNum}${cleanSec}-${student.rollNumber}`;
        const studentUsername = generateUniqueUsername(baseStudentUsername);
        const studentEmail = `${studentUsername}@internal-sms.local`;
        const studentPassword = generateRandomPIN();

        // Sign up student in Auth
        const { data: studentAuth, error: studentAuthError } = await tempAuthClient.auth.signUp({
          email: studentEmail,
          password: studentPassword,
          options: {
            data: {
              full_name: student.name,
            }
          }
        });

        if (studentAuthError || !studentAuth.user) {
          throw new Error(`Auth signup failed for student ${student.name}: ${studentAuthError?.message}`);
        }

        const studentUserId = studentAuth.user.id;

        // Create Profile row
        const { error: studentProfileError } = await supabase
          .from("profiles")
          .insert({
            id: studentUserId,
            school_id: activeSchoolId,
            email: studentUsername,
            full_name: student.name,
            role: "student"
          });

        if (studentProfileError) {
          throw new Error(`Failed to establish profile for student ${student.name}: ${studentProfileError.message}`);
        }

        // Get class ID
        const classKey = `${student.gradeLevel}-${student.section}`;
        let classId = classIdMap.get(classKey);

        if (!classId) {
          // Create class on the fly if staging classes were staging-skipped
          const { data: onFlyClass, error: onFlyClassError } = await supabase
            .from("classes")
            .insert({
              school_id: activeSchoolId,
              grade_level: student.gradeLevel,
              section: student.section,
              base_fee_amount: student.baseFee || 50000.0
            })
            .select("id")
            .single();

          if (onFlyClassError || !onFlyClass || !onFlyClass.id) {
            throw new Error(`Failed to auto-create class for student ${student.name}: ${onFlyClassError?.message}`);
          }
          classId = onFlyClass.id as string;
          classIdMap.set(classKey, classId);
        }

        // Parent linkage ID using pre-provisioned map
        let linkedParentId: string | null = null;
        if (student.parentName) {
          linkedParentId = studentParentIdMap.get(student.email) || null;
        }

        // Set fee modifiers (e.g. WhatsApp disabled if parent phone is blank)
        const feeModifiers = [];
        if (!student.parentPhone || student.repairedFields?.whatsappDisabled) {
          feeModifiers.push({
            name: "whatsapp_disabled",
            amount: 0.0,
            percentage: 0.0,
            description: "WhatsApp notifications disabled (no mobile number provided)"
          });
        }

        // Insert student record
        const { error: studentRecordError } = await supabase
          .from("students")
          .insert({
            school_id: activeSchoolId,
            profile_id: studentUserId,
            parent_id: linkedParentId,
            class_id: classId,
            roll_number: student.rollNumber,
            fee_modifiers: feeModifiers
          });

        if (studentRecordError) {
          throw new Error(`Failed to create student link record for ${student.name}: ${studentRecordError.message}`);
        }

        // Push to Roster list
        roster.push({
          fullName: student.name,
          role: "Student",
          assignedClass: `${student.gradeLevel.replace("Grade ", "")}-${student.section}`,
          username: studentUsername,
          password: studentPassword
        });
      }

      // 5. Clean up Staging Table
      setMaterializingStatus("Finalizing setups & clearing cache...");
      const { error: deleteStagingError } = await supabase
        .from("onboarding_staging")
        .delete()
        .eq("school_id", activeSchoolId);

      if (deleteStagingError) {
        console.error("Failed to delete staging row:", deleteStagingError);
      }

      // Cache credentials and state in local storage to prevent accidental data loss on refresh
      localStorage.setItem(`staged_credentials_${activeSchoolId}`, JSON.stringify(roster));
      localStorage.setItem(`show_ledger_banner_${activeSchoolId}`, "true");

      setRosterCredentials(roster);
      setShowLedgerBanner(true);
      setIsMaterializing(false);

    } catch (err: any) {
      console.error("Materialization error:", err);
      setMaterializationError(err.message || "An unexpected error occurred during database provisioning.");
      setIsMaterializing(false);
    }
  };

  const downloadCSV = () => {
    if (rosterCredentials.length === 0) return;

    // Headers
    const headers = ["Full Name", "Account Role", "Assigned Class/Section", "Generated Username ID", "Default Password"];
    
    // Rows
    const rows = rosterCredentials.map(item => [
      item.fullName,
      item.role,
      item.assignedClass,
      item.username,
      item.password
    ]);

    // CSV format conversion
    const csvContent = [
      headers.join(","),
      ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    // Blob & Download execution
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${schoolName.toLowerCase().replace(/[^a-z0-9]/g, "")}_credentials_ledger.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDismissBanner = () => {
    if (schoolId) {
      localStorage.removeItem(`staged_credentials_${schoolId}`);
      localStorage.removeItem(`show_ledger_banner_${schoolId}`);
    }
    setShowLedgerBanner(false);
  };

  const totalOutstanding = students.reduce(
    (sum, s) => sum + (s.financial_ledger?.current_outstanding_balance || 0),
    0
  );

  const totalExpected = students.reduce((sum, s) => {
    return sum + ((s.financial_ledger as any)?.base_fee || 0);
  }, 0);

  const collectedFees = Math.max(0, totalExpected - totalOutstanding);

  return (
    <div className="space-y-8 animate-fade-in relative">
      {/* Materializing Loading Overlay */}
      {isMaterializing && (
        <div className="fixed inset-0 bg-white/95 backdrop-blur-md z-50 flex items-center justify-center p-6 animate-fade-in">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="mx-auto w-16 h-16 rounded-3xl bg-[#064e3b] text-white flex items-center justify-center font-bold shadow-lg text-xl animate-pulse">
              S
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Materializing School Databases</h2>
              <p className="text-xs text-zinc-505 font-light max-w-xs mx-auto">
                Please do not close, refresh, or navigate away from this page. We are preparing secure authentication portals for students, faculty, and families.
              </p>
            </div>
            
            {/* Progress Bar Loader */}
            <div className="relative w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden border border-zinc-200/50">
              <div className="absolute top-0 bottom-0 left-0 bg-[#064e3b] rounded-full w-[80%] animate-pulse"></div>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-zinc-650 font-medium bg-[#ecfdf5] border border-[#064e3b]/10 py-2.5 px-4 rounded-xl">
              <Loader2 className="w-4 h-4 animate-spin text-[#064e3b]" />
              <span>{materializingStatus}</span>
            </div>
          </div>
        </div>
      )}

      {/* Materialization Error Alert Banner */}
      {materializationError && (
        <div className="bg-red-50 border border-red-200 text-red-750 text-xs rounded-2xl p-4 flex flex-col gap-2 shadow-xs">
          <div className="font-bold flex items-center gap-1">⚠️ Database Materialization Interrupted</div>
          <div className="whitespace-pre-wrap leading-relaxed font-mono text-[11px] bg-white/50 p-2.5 rounded-lg border border-red-150">{materializationError}</div>
          <p className="text-[10px] text-zinc-505 font-medium">Please verify your Supabase database migrations and schema RLS boundaries, then reload the dashboard to retry the setup.</p>
        </div>
      )}

      {/* Ledger Credentials Download Banner */}
      {showLedgerBanner && (
        <div className="bg-[#ecfdf5] border border-emerald-250 rounded-2xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-sm animate-fade-in">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-emerald-950 flex items-center gap-1.5">
              <span>🎉</span> Onboarding Complete!
            </h4>
            <p className="text-xs text-[#064e3b]/85 leading-relaxed font-light">
              We have successfully provisioned accounts for all students, parents, and teachers. Download the credentials ledger below to distribute them.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              onClick={downloadCSV}
              size="sm"
              className="bg-[#064e3b] hover:bg-[#0f766e] text-white font-bold gap-1.5 cursor-pointer text-xs h-9"
            >
              Download Ledger (.CSV)
            </Button>
            <Button
              onClick={handleDismissBanner}
              size="sm"
              variant="outline"
              className="border-emerald-200 text-[#064e3b] hover:bg-emerald-100/30 cursor-pointer text-xs h-9"
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">{schoolName}</h1>
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white border border-zinc-200/50 rounded-2xl p-6 shadow-sm flex flex-col justify-between card-accent-emerald">
          <div className="flex items-center justify-between pb-2 border-none">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Total Enrolled Students</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-950 flex items-center justify-center shadow-xs">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-zinc-900">{loading ? "..." : students.length}</div>
            <p className="text-[10px] text-zinc-405 mt-1 font-medium">Students mapped across all active grades.</p>
          </div>
        </div>

        <div className="bg-white border border-zinc-200/50 rounded-2xl p-6 shadow-sm flex flex-col justify-between card-accent-amber">
          <div className="flex items-center justify-between pb-2 border-none">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Total Unpaid Fees</span>
            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-705 flex items-center justify-center shadow-xs">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-zinc-900">
              {loading ? "..." : `₹${totalOutstanding.toLocaleString("en-IN")}`}
            </div>
            {!loading && (
              <FinancialHealthBar collected={collectedFees} remaining={totalOutstanding} />
            )}
          </div>
        </div>
      </div>

      {/* Asymmetric Section Grid (Main Content Split) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT CONTENT COLUMN: Active Student Directory (2/3 width) */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 tracking-tight">Active Student Directory</h2>
            <p className="text-xs text-zinc-450 mt-0.5">Quick oversight list. Select "Edit Fees" to configure modifier parameters.</p>
          </div>

          <Card className="card-premium p-0 bg-white card-accent-indigo">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-100 text-left text-sm">
                <thead className="bg-zinc-50/50 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="px-6 py-4">Roll</th>
                    <th scope="col" className="px-6 py-4">Student Name</th>
                    <th scope="col" className="px-6 py-4">Grade & Section</th>
                    <th scope="col" className="px-6 py-4">Outstanding Balance</th>
                    <th scope="col" className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-zinc-100">
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
                      <tr key={student._id} className="hover:bg-zinc-50/30 transition-colors border-b border-zinc-100">
                        <td className="px-6 py-4 text-zinc-500 text-xs font-semibold">
                          #{student.personal_details.roll_number}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-50 text-emerald-800 font-semibold flex items-center justify-center rounded-full text-sm uppercase shrink-0 shadow-sm border border-emerald-100 animate-pulse">
                              {student.personal_details.first_name[0]}
                            </div>
                            <div>
                              <span className="font-semibold text-zinc-900 block leading-tight">
                                {student.personal_details.first_name} {student.personal_details.last_name}
                              </span>
                              <span className="text-[10px] text-zinc-400">ID: {student._id}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="secondary" className="font-normal text-[10px] py-0.5 px-2 bg-zinc-100 border border-zinc-200/50">
                            Grade {student.academic_mapping.current_grade} - {student.academic_mapping.section}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 font-bold text-zinc-800 text-xs">
                          ₹{student.financial_ledger?.current_outstanding_balance.toLocaleString("en-IN")}
                        </td>
                        <td className="px-6 py-4 text-right text-xs">
                          <Link
                            href={`/admin/finance?studentId=${student._id}`}
                            className="inline-flex items-center gap-1.5 text-emerald-800 hover:text-emerald-950 font-bold transition-colors"
                          >
                            <FileEdit className="w-3.5 h-3.5" /> Edit Fees
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile View Roster List */}
            <div className="space-y-4 md:hidden p-4">
              {loading ? (
                <div className="p-8 text-center text-zinc-405 text-xs bg-white border border-zinc-100 rounded-xl">
                  Loading directory database...
                </div>
              ) : students.length === 0 ? (
                <div className="p-8 text-center text-zinc-405 text-xs bg-white border border-zinc-100 rounded-xl">
                  No student records found. Add students to start.
                </div>
              ) : (
                students.map((student) => (
                  <div key={student._id} className="p-4 space-y-4 bg-white border border-zinc-100 rounded-xl">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-50 text-emerald-800 font-semibold flex items-center justify-center rounded-full text-xs uppercase shadow-sm border border-emerald-100">
                          {student.personal_details.first_name[0]}
                        </div>
                        <div>
                          <span className="font-semibold text-zinc-900 block leading-tight text-sm">
                            {student.personal_details.first_name} {student.personal_details.last_name}
                          </span>
                          <span className="text-[10px] text-zinc-400">Roll: #{student.personal_details.roll_number} | ID: {student._id}</span>
                        </div>
                      </div>
                      <Badge variant="secondary" className="font-normal text-[10px] py-0.5 px-2 bg-zinc-100 border border-zinc-200/50">
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
                        <Button size="sm" variant="outline" className="gap-1.5 px-3 py-1.5 h-8 text-xs border-zinc-250 hover:bg-emerald-50/20 hover:border-emerald-600 hover:text-emerald-950 font-semibold">
                          <FileEdit className="w-3.5 h-3.5" /> Edit Fees
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* RIGHT CONTENT COLUMN: Quick Actions (1/3 width) */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 tracking-tight">Quick Operations</h2>
              <p className="text-xs text-zinc-450 mt-0.5">Instant tasks and shortcuts.</p>
            </div>

            <Card className="card-premium bg-white border border-zinc-200/50 shadow-sm p-0 card-accent-rose">
              <CardHeader className="p-5 pb-3">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="p-5 pt-0 flex flex-col gap-3.5">
                <Link href="/admin/intake" className="w-full">
                  <button className="w-full text-left rounded-xl px-4 py-3 font-medium transition-all hover:shadow-md border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 hover:-translate-y-0.5 flex items-center justify-between text-xs cursor-pointer">
                    <span className="flex items-center gap-2">
                      <UserPlus className="w-4 h-4 text-emerald-800" />
                      Add Student List (CSV)
                    </span>
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                  </button>
                </Link>
                
                <Link href="/admin/finance" className="w-full">
                  <button className="w-full text-left rounded-xl px-4 py-3 font-medium transition-all hover:shadow-md border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 hover:-translate-y-0.5 flex items-center justify-between text-xs cursor-pointer">
                    <span className="flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-emerald-800" />
                      Edit Fees & Discounts
                    </span>
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                  </button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
