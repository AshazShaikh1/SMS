"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { Users, Landmark, UserPlus, FileEdit, ChevronRight, ChevronLeft, Wallet, Loader2, Sparkles, Download, BookOpen, GraduationCap } from "lucide-react";
import { FinancialHealthBar } from "@/components/dashboard/FinancialHealthBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fetchStudents } from "@/lib/db/students";
import { recordPayment } from "@/lib/db/finance";
import { Student } from "@/lib/db/mockDb";
import { supabase } from "@/lib/supabase/client";
import { createClient } from "@supabase/supabase-js";

export default function AdminDashboard() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [schoolName, setSchoolName] = useState("School Dashboard");
  const [loading, setLoading] = useState(true);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Materialization & Onboarding Ledger States
  const [isMaterializing, setIsMaterializing] = useState(false);
  const [materializingStatus, setMaterializingStatus] = useState("");
  const [materializationError, setMaterializationError] = useState<string | null>(null);
  const [showLedgerBanner, setShowLedgerBanner] = useState(false);
  const [rosterCredentials, setRosterCredentials] = useState<any[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Stats counts
  const [classCount, setClassCount] = useState<number | null>(null);
  const [teacherCount, setTeacherCount] = useState<number | null>(null);

  useEffect(() => {
    async function loadData() {
      // Verify session
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // Fetch School Name, Role and School ID
      const { data: profile } = await supabase
        .from("profiles")
        .select("school_id, role, school:schools(school_name)")
        .eq("id", user.id)
        .single();
      
      let currentSchoolId = "";
      if (profile) {
        currentSchoolId = profile.school_id;
        setSchoolId(currentSchoolId);
        setUserRole(profile.role);
        if (profile.school) {
          setSchoolName((profile.school as any).school_name);
        }
      }

      if (currentSchoolId) {
        // 1. Check if staging row exists
        const { data: stagingData } = await supabase
          .from("onboarding_staging")
          .select("staged_data")
          .eq("school_id", currentSchoolId)
          .maybeSingle();

        if (stagingData && stagingData.staged_data) {
          // Trigger Phase 2 bulk row materialization in the background
          materializeSchoolData(currentSchoolId, stagingData.staged_data);
        } else {
          // 2. No staging row. Check if credentials exist in localStorage from a previous execution
          const cachedRoster = localStorage.getItem(`staged_credentials_${currentSchoolId}`);
          const cachedBanner = localStorage.getItem(`show_ledger_banner_${currentSchoolId}`);
          if (cachedRoster && cachedBanner === "true") {
            setRosterCredentials(JSON.parse(cachedRoster));
            setShowLedgerBanner(true);
          }
        }

        // Fetch dynamic counts
        const { count: clCount } = await supabase
          .from("classes")
          .select("id", { count: "exact", head: true })
          .eq("school_id", currentSchoolId);
        setClassCount(clCount);

        const { count: tCount } = await supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("school_id", currentSchoolId)
          .eq("role", "teacher");
        setTeacherCount(tCount);
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
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    
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
        let teacherUsername = generateUniqueUsername(baseTeacherUsername);
        let teacherEmail = `${teacherUsername}@internal-sms.local`;
        const teacherPassword = generateRandomPIN();

        // Check if teacher profile already exists in DB
        const { data: existingTeacherProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("school_id", activeSchoolId)
          .eq("email", teacherUsername)
          .maybeSingle();

        let teacherUserId: string;
        let finalTeacherPassword = teacherPassword;

        if (existingTeacherProfile) {
          teacherUserId = existingTeacherProfile.id;
          finalTeacherPassword = "(Existing PIN)";
          
          // Update profile full_name if changed
          await supabase
            .from("profiles")
            .update({ full_name: teacher.name })
            .eq("id", teacherUserId);
          
          // Delete existing allocations to make it idempotent
          const { error: deleteAllocError } = await supabase
            .from("teacher_allocations")
            .delete()
            .eq("teacher_id", teacherUserId);
          if (deleteAllocError) {
            console.warn(`Failed to clean existing allocations for teacher ${teacher.name}:`, deleteAllocError);
          }
        } else {
          // Sign up teacher in Auth (with retry loop for email uniqueness)
          let teacherAuth = null;
          let teacherAuthError = null;
          let signupAttempts = 0;
          let tempTeacherUsername = teacherUsername;
          let tempTeacherEmail = teacherEmail;

          while (signupAttempts < 5) {
            const { data, error } = await tempAuthClient.auth.signUp({
              email: tempTeacherEmail,
              password: teacherPassword,
              options: {
                data: {
                  full_name: teacher.name,
                }
              }
            });

            if (!error && data?.user) {
              teacherAuth = data;
              teacherUsername = tempTeacherUsername;
              teacherEmail = tempTeacherEmail;
              break;
            }

            if (error && (
              error.message.toLowerCase().includes("registered") ||
              error.message.toLowerCase().includes("exists") ||
              error.message.toLowerCase().includes("taken")
            )) {
              signupAttempts++;
              tempTeacherUsername = `${teacherUsername}-${signupAttempts}`;
              tempTeacherEmail = `${tempTeacherUsername}@internal-sms.local`;
              continue;
            } else {
              teacherAuthError = error;
              break;
            }
          }

          if (teacherAuthError || !teacherAuth?.user) {
            throw new Error(`Auth signup failed for teacher ${teacher.name}: ${teacherAuthError?.message}`);
          }

          await delay(1200); // Prevent Supabase Auth rate limiting
          teacherUserId = teacherAuth.user.id;

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
        }

        teacherProfileIdMap.set(teacher.id, teacherUserId);

        // Link Teacher to their assigned subject allocations in new teacher_allocations table
        const teacherAllocationsToInsert: { school_id: string; teacher_id: string; class_id: string; subject_name: string }[] = [];
        
        for (const alloc of (teacher.allocations || [])) {
          const subjectName = (alloc.subjectName || "").trim();
          if (!subjectName) continue;
          
          for (const classKey of (alloc.classes || [])) {
            if (classKey === "unassigned") continue;
            const classId = classIdMap.get(classKey);
            if (classId) {
              teacherAllocationsToInsert.push({
                school_id: activeSchoolId,
                teacher_id: teacherUserId,
                class_id: classId,
                subject_name: subjectName
              });
            }
          }
        }

        if (teacherAllocationsToInsert.length > 0) {
          const { error: insertAllocationsError } = await supabase
            .from("teacher_allocations")
            .insert(teacherAllocationsToInsert);

          if (insertAllocationsError) {
            console.error(`Failed to bulk insert teacher allocations for ${teacher.name}:`, insertAllocationsError);
            throw new Error(`Failed to assign subject allocations for teacher ${teacher.name}: ${insertAllocationsError.message}`);
          }
        }

        // Compile a clean description of allocations for the roster sheet
        const allocationDescriptions: string[] = [];
        for (const alloc of (teacher.allocations || [])) {
          const cleanClasses = (alloc.classes || []).map((c: string) => c.replace("Grade ", ""));
          if (cleanClasses.length > 0 && alloc.subjectName) {
            allocationDescriptions.push(`${alloc.subjectName}: ${cleanClasses.join(", ")}`);
          }
        }

        // Push to Roster list
        roster.push({
          fullName: teacher.name,
          role: "Teacher",
          assignedClass: allocationDescriptions.join(" | ") || "None",
          username: teacherUsername,
          password: finalTeacherPassword
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
          let parentUsername = generateUniqueUsername(baseParentUsername);
          let parentEmail = (student.parentEmail && student.parentEmail.includes("@"))
            ? student.parentEmail.trim().toLowerCase()
            : `${parentUsername}@internal-sms.local`;
          const parentPassword = generateRandomPIN();

          // Check if parent profile already exists in DB
          const { data: existingParentProfile } = await supabase
            .from("profiles")
            .select("id")
            .eq("school_id", activeSchoolId)
            .eq("email", parentUsername)
            .maybeSingle();

          let parentUserId: string;
          let finalParentPassword = parentPassword;

          if (existingParentProfile) {
            parentUserId = existingParentProfile.id;
            finalParentPassword = "(Existing PIN)";
            
            // Update profile full_name if changed
            await supabase
              .from("profiles")
              .update({ full_name: student.parentName })
              .eq("id", parentUserId);
          } else {
            // Sign up parent in Auth (with retry loop for email uniqueness)
            let parentAuth = null;
            let parentAuthError = null;
            let signupAttempts = 0;
            let tempParentUsername = parentUsername;
            let tempParentEmail = parentEmail;

            while (signupAttempts < 5) {
              const { data, error } = await tempAuthClient.auth.signUp({
                email: tempParentEmail,
                password: parentPassword,
                options: {
                  data: {
                    full_name: student.parentName,
                  }
                }
              });

              if (!error && data?.user) {
                parentAuth = data;
                parentUsername = tempParentUsername;
                parentEmail = tempParentEmail;
                break;
              }

              if (error && (
                error.message.toLowerCase().includes("registered") ||
                error.message.toLowerCase().includes("exists") ||
                error.message.toLowerCase().includes("taken")
              )) {
                signupAttempts++;
                tempParentUsername = `${parentUsername}-${signupAttempts}`;
                tempParentEmail = `${tempParentUsername}@internal-sms.local`;
                continue;
              } else {
                parentAuthError = error;
                break;
              }
            }

            if (parentAuthError || !parentAuth?.user) {
              throw new Error(`Auth signup failed for parent ${student.parentName}: ${parentAuthError?.message}`);
            }

            await delay(1200); // Prevent Supabase Auth rate limiting
            parentUserId = parentAuth.user.id;

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
          }

          resolvedParent = {
            id: parentUserId,
            username: parentUsername,
            password: finalParentPassword
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
              password: finalParentPassword
            });
          }

          // Push to Roster list
          roster.push({
            fullName: student.parentName,
            role: "Parent",
            assignedClass: `${student.gradeLevel.replace("Grade ", "")}-${student.section} (Child: ${student.name})`,
            username: parentUsername,
            password: finalParentPassword
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
        let studentUsername = generateUniqueUsername(baseStudentUsername);
        let studentEmail = `${studentUsername}@internal-sms.local`;
        const studentPassword = generateRandomPIN();

        // Check if student profile already exists in DB
        const { data: existingStudentProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("school_id", activeSchoolId)
          .eq("email", studentUsername)
          .maybeSingle();

        let studentUserId: string;
        let finalStudentPassword = studentPassword;

        if (existingStudentProfile) {
          studentUserId = existingStudentProfile.id;
          finalStudentPassword = "(Existing PIN)";
          
          // Update profile full_name if changed
          await supabase
            .from("profiles")
            .update({ full_name: student.name })
            .eq("id", studentUserId);
        } else {
          // Sign up student in Auth (with retry loop for email uniqueness)
          let studentAuth = null;
          let studentAuthError = null;
          let signupAttempts = 0;
          let tempStudentUsername = studentUsername;
          let tempStudentEmail = studentEmail;

          while (signupAttempts < 5) {
            const { data, error } = await tempAuthClient.auth.signUp({
              email: tempStudentEmail,
              password: studentPassword,
              options: {
                data: {
                  full_name: student.name,
                }
              }
            });

            if (!error && data?.user) {
              studentAuth = data;
              studentUsername = tempStudentUsername;
              studentEmail = tempStudentEmail;
              break;
            }

            if (error && (
              error.message.toLowerCase().includes("registered") ||
              error.message.toLowerCase().includes("exists") ||
              error.message.toLowerCase().includes("taken")
            )) {
              signupAttempts++;
              tempStudentUsername = `${studentUsername}-${signupAttempts}`;
              tempStudentEmail = `${tempStudentUsername}@internal-sms.local`;
              continue;
            } else {
              studentAuthError = error;
              break;
            }
          }

          if (studentAuthError || !studentAuth?.user) {
            throw new Error(`Auth signup failed for student ${student.name}: ${studentAuthError?.message}`);
          }

          await delay(1200); // Prevent Supabase Auth rate limiting
          studentUserId = studentAuth.user.id;

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

        // Check if student link record already exists in students table
        const { data: existingStudentRecord } = await supabase
          .from("students")
          .select("id")
          .eq("profile_id", studentUserId)
          .maybeSingle();

        if (existingStudentRecord) {
          // Update existing student record to make it idempotent
          const { error: studentRecordError } = await supabase
            .from("students")
            .update({
              parent_id: linkedParentId,
              class_id: classId,
              roll_number: student.rollNumber,
              fee_modifiers: feeModifiers,
              // Demographic fields
              first_name: student.first_name || null,
              surname: student.surname || null,
              register_no: student.register_no || null,
              gender: student.gender || null,
              birth_date: student.birth_date || null,
              dob_in_words: student.dob_in_words || null,
              birth_place: student.birth_place || null,
              phones: student.phones || null,
              address: student.address || null,
              country: student.country || null,
              state: student.state || null,
              dist: student.dist || null,
              taluka: student.taluka || null,
              colony: student.colony || null,
              distance: student.distance || null,
              admit_in_class: student.admit_in_class || null,
              last_class: student.last_class || null,
              last_school_attended: student.last_school_attended || null,
              admission_date: student.admission_date || null,
              father_name: student.father_name || null,
              father_occupation: student.father_occupation || null,
              father_qualification: student.father_qualification || null,
              father_uid_no: student.father_uid_no || null,
              mother_name: student.mother_name || null,
              mother_occupation: student.mother_occupation || null,
              mother_qualification: student.mother_qualification || null,
              mother_uid_no: student.mother_uid_no || null,
              mother_tongue: student.mother_tongue || null,
              guardian: student.guardian || null,
              sibling: student.sibling || null,
              single_parent: student.single_parent || false,
              orphan: student.orphan || false,
              aadhar_number: student.aadhar_number || null,
              aapar_id: student.aapar_id || null,
              pen_number: student.pen_number || null,
              saral_id: student.saral_id || null,
              nationality: student.nationality || null,
              religion: student.religion || null,
              caste: student.caste || null,
              sub_caste: student.sub_caste || null,
              progress: student.progress || null,
              conduct: student.conduct || null,
              reason_for_leaving: student.reason_for_leaving || null,
              leaving_date: student.leaving_date || null,
              remarks: student.remarks || null,
              bloodgroup: student.bloodgroup || null,
              height: student.height || null,
              weight: student.weight || null,
              handicap: student.handicap || false,
              login_email: student.login_email || null,
              muman: student.muman || null,
              qrcode: student.qrcode || null,
              rfid: student.rfid || null,
            })
            .eq("id", existingStudentRecord.id);

          if (studentRecordError) {
            throw new Error(`Failed to update student link record for ${student.name}: ${studentRecordError.message}`);
          }
        } else {
          // Insert student record
          const { error: studentRecordError } = await supabase
            .from("students")
            .insert({
              school_id: activeSchoolId,
              profile_id: studentUserId,
              parent_id: linkedParentId,
              class_id: classId,
              roll_number: student.rollNumber,
              fee_modifiers: feeModifiers,
              // Demographic fields
              first_name: student.first_name || null,
              surname: student.surname || null,
              register_no: student.register_no || null,
              gender: student.gender || null,
              birth_date: student.birth_date || null,
              dob_in_words: student.dob_in_words || null,
              birth_place: student.birth_place || null,
              phones: student.phones || null,
              address: student.address || null,
              country: student.country || null,
              state: student.state || null,
              dist: student.dist || null,
              taluka: student.taluka || null,
              colony: student.colony || null,
              distance: student.distance || null,
              admit_in_class: student.admit_in_class || null,
              last_class: student.last_class || null,
              last_school_attended: student.last_school_attended || null,
              admission_date: student.admission_date || null,
              father_name: student.father_name || null,
              father_occupation: student.father_occupation || null,
              father_qualification: student.father_qualification || null,
              father_uid_no: student.father_uid_no || null,
              mother_name: student.mother_name || null,
              mother_occupation: student.mother_occupation || null,
              mother_qualification: student.mother_qualification || null,
              mother_uid_no: student.mother_uid_no || null,
              mother_tongue: student.mother_tongue || null,
              guardian: student.guardian || null,
              sibling: student.sibling || null,
              single_parent: student.single_parent || false,
              orphan: student.orphan || false,
              aadhar_number: student.aadhar_number || null,
              aapar_id: student.aapar_id || null,
              pen_number: student.pen_number || null,
              saral_id: student.saral_id || null,
              nationality: student.nationality || null,
              religion: student.religion || null,
              caste: student.caste || null,
              sub_caste: student.sub_caste || null,
              progress: student.progress || null,
              conduct: student.conduct || null,
              reason_for_leaving: student.reason_for_leaving || null,
              leaving_date: student.leaving_date || null,
              remarks: student.remarks || null,
              bloodgroup: student.bloodgroup || null,
              height: student.height || null,
              weight: student.weight || null,
              handicap: student.handicap || false,
              login_email: student.login_email || null,
              muman: student.muman || null,
              qrcode: student.qrcode || null,
              rfid: student.rfid || null,
            });

          if (studentRecordError) {
            throw new Error(`Failed to create student link record for ${student.name}: ${studentRecordError.message}`);
          }
        }

        // Push to Roster list
        roster.push({
          fullName: student.name,
          role: "Student",
          assignedClass: `${student.gradeLevel.replace("Grade ", "")}-${student.section}`,
          username: studentUsername,
          password: finalStudentPassword
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
      setShowSuccessModal(true);
      setIsMaterializing(false);

      // Refetch student roster directory so the dashboard shows the new students immediately
      const list = await fetchStudents();
      setStudents(list);

    } catch (err: any) {
      console.error("Materialization error:", err);
      setMaterializationError(err.message || "An unexpected error occurred. Please try refreshing the page.");
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
      {/* Background Materializing Floating Widget */}
      {isMaterializing && (
        <div className="fixed bottom-6 right-6 bg-white border border-zinc-200/80 shadow-2xl rounded-2xl p-4 max-w-xs w-80 z-40 animate-fade-in flex items-start gap-3.5">
          <div className="bg-[#e6f0ff] p-2 rounded-xl border border-[#1572FE]/10 shrink-0">
            <Loader2 className="w-5 h-5 animate-spin text-[#1572FE]" />
          </div>
          <div className="space-y-1 flex-1 min-w-0">
            <h5 className="text-[11px] font-bold text-zinc-950 uppercase tracking-wider">Background Setup Running</h5>
            <p className="text-[11px] text-zinc-500 leading-snug truncate">
              {materializingStatus}
            </p>
            <span className="text-[9px] font-medium text-zinc-400 block pt-0.5">
              Generating rosters & credentials in background...
            </span>
          </div>
        </div>
      )}

      {/* Onboarding Success Popup Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-6 border border-zinc-100">
            <div className="text-center space-y-2">
              <span className="text-4xl block">🎉</span>
              <h3 className="text-lg font-bold text-zinc-900">Onboarding & Setup Complete!</h3>
              <p className="text-xs text-zinc-500 leading-relaxed font-light">
                We have successfully provisioned accounts and security credentials for all students, parents, and teachers. 
                Please download the credentials ledger below so you can distribute them.
              </p>
            </div>
            
            <div className="flex flex-col gap-2">
              <Button
                onClick={() => {
                  downloadCSV();
                }}
                className="w-full bg-[#1572FE] hover:bg-[#0f62d4] text-white font-bold py-2.5 rounded-xl text-xs gap-1.5 cursor-pointer h-10 animate-pulse"
              >
                Download Credentials Ledger (.CSV)
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowSuccessModal(false);
                  handleDismissBanner(); // Clears localStorage and dismisses banner
                }}
                className="w-full text-zinc-600 hover:bg-zinc-50 border border-zinc-200 text-xs font-semibold py-2.5 rounded-xl cursor-pointer h-10"
              >
                Go to Dashboard
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Materialization Error Alert Banner */}
      {materializationError && (
        <div className="bg-red-50 border border-red-200 text-red-750 text-xs rounded-2xl p-4 flex flex-col gap-2 shadow-xs">
          <div className="font-bold flex items-center gap-1">⚠️ Setup Could Not Complete</div>
          <div className="whitespace-pre-wrap leading-relaxed font-mono text-[11px] bg-white/50 p-2.5 rounded-lg border border-red-150">{materializationError}</div>
          <p className="text-[10px] text-zinc-550 font-medium">Please verify your Supabase database migrations and schema RLS boundaries, then reload the dashboard to retry the setup.</p>
        </div>
      )}

      {/* Ledger Credentials Download Banner */}
      {showLedgerBanner && (
        <div className="bg-[#e6f0ff] border border-blue-200 rounded-2xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-sm animate-fade-in">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-blue-950 flex items-center gap-1.5">
              <span>🎉</span> Onboarding Complete!
            </h4>
            <p className="text-xs text-[#1572FE]/85 leading-relaxed font-light">
              We have successfully provisioned accounts for all students, parents, and teachers. Download the credentials ledger below to distribute them.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              onClick={downloadCSV}
              size="sm"
              className="bg-[#1572FE] hover:bg-[#0f62d4] text-white font-bold gap-1.5 cursor-pointer text-xs h-9"
            >
              Download Ledger (.CSV)
            </Button>
            <Button
              onClick={handleDismissBanner}
              size="sm"
              variant="outline"
              className="border-blue-250 text-[#1572FE] hover:bg-blue-100/30 cursor-pointer text-xs h-9"
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
          <Link href="/admin/students">
            <Button size="sm" variant="outline" className="gap-2 text-xs font-semibold cursor-pointer h-9">
              <Users className="w-4 h-4 text-[#1572FE]" /> View Student Directory
            </Button>
          </Link>
          <Link href="/admin/intake">
            <Button size="sm" variant="outline" className="gap-2 text-xs font-semibold cursor-pointer h-9">
              <UserPlus className="w-4 h-4 text-blue-800" /> Add Students
            </Button>
          </Link>
          <Link href="/admin/finance">
            <Button size="sm" className="gap-2 text-xs font-semibold cursor-pointer h-9">
              <Landmark className="w-4 h-4" /> Adjust Ledgers
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Enrolled Students */}
        <div className="bg-white border border-zinc-200/50 rounded-2xl p-6 shadow-sm flex flex-col justify-between card-accent-emerald">
          <div className="flex items-center justify-between pb-2 border-none">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Total Enrolled Students</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-emerald-950 flex items-center justify-center shadow-xs">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-zinc-900">{loading ? "..." : students.length}</div>
            <p className="text-[10px] text-zinc-405 mt-1 font-medium">Students mapped across all active grades.</p>
          </div>
        </div>

        {/* Classroom Divisions */}
        <div className="bg-white border border-zinc-200/50 rounded-2xl p-6 shadow-sm flex flex-col justify-between card-accent-indigo">
          <div className="flex items-center justify-between pb-2 border-none">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Classroom Divisions</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-950 flex items-center justify-center shadow-xs">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-zinc-900">{classCount !== null ? classCount : "..."}</div>
            <p className="text-[10px] text-zinc-405 mt-1 font-medium">Active grades and sections configured.</p>
          </div>
        </div>

        {/* Faculty Members */}
        <div className="bg-white border border-zinc-200/50 rounded-2xl p-6 shadow-sm flex flex-col justify-between card-accent-rose">
          <div className="flex items-center justify-between pb-2 border-none">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Faculty Members</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-950 flex items-center justify-center shadow-xs">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-zinc-900">{teacherCount !== null ? teacherCount : "..."}</div>
            <p className="text-[10px] text-zinc-405 mt-1 font-medium">Registered teachers and subject instructors.</p>
          </div>
        </div>

        {/* Total Unpaid Fees */}
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

      {/* Balanced 2-Column Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LEFT CARD: Quick Operations */}
        <Card className="card-premium bg-white border border-zinc-200/50 shadow-sm p-6 card-accent-blue space-y-4">
          <div>
            <h3 className="text-base font-bold text-zinc-900">Quick Actions</h3>
            <p className="text-xs text-zinc-455 mt-0.5">Primary pathways to manage school databases.</p>
          </div>
          <div className="flex flex-col gap-3.5 pt-2">
            <Link href="/admin/students" className="w-full">
              <button className="w-full text-left rounded-xl px-4 py-3.5 font-semibold transition-all hover:shadow-md border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 hover:-translate-y-0.5 flex items-center justify-between text-xs cursor-pointer">
                <span className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-[#1572FE]" />
                  <span>Student Directory & Demographic Exports</span>
                </span>
                <ChevronRight className="w-4 h-4 text-zinc-400" />
              </button>
            </Link>

            <Link href="/admin/intake" className="w-full">
              <button className="w-full text-left rounded-xl px-4 py-3.5 font-semibold transition-all hover:shadow-md border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 hover:-translate-y-0.5 flex items-center justify-between text-xs cursor-pointer">
                <span className="flex items-center gap-3">
                  <UserPlus className="w-4 h-4 text-blue-800" />
                  <span>Ingest Student List (CSV/Excel Intake)</span>
                </span>
                <ChevronRight className="w-4 h-4 text-zinc-400" />
              </button>
            </Link>

            <Link href="/admin/finance" className="w-full">
              <button className="w-full text-left rounded-xl px-4 py-3.5 font-semibold transition-all hover:shadow-md border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 hover:-translate-y-0.5 flex items-center justify-between text-xs cursor-pointer">
                <span className="flex items-center gap-3">
                  <Wallet className="w-4 h-4 text-orange-700" />
                  <span>Edit Fees & Scholarships Adjustments</span>
                </span>
                <ChevronRight className="w-4 h-4 text-zinc-400" />
              </button>
            </Link>
          </div>
        </Card>

        {/* RIGHT CARD: School Profile & Status summary */}
        <Card className="card-premium bg-white border border-zinc-200/50 shadow-sm p-6 card-accent-indigo space-y-4">
          <div>
            <h3 className="text-base font-bold text-zinc-900">Academic Structure Status</h3>
            <p className="text-xs text-zinc-455 mt-0.5">Overview of configured grades and operations.</p>
          </div>
          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/40 text-xs space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-zinc-200/40">
                <span className="text-zinc-500 font-medium">Institution Name</span>
                <span className="font-bold text-zinc-800">{schoolName}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-zinc-200/40">
                <span className="text-zinc-500 font-medium">Classroom Structure</span>
                <span className="font-bold text-zinc-800">{classCount !== null ? `${classCount} Classes` : "Loading..."}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-zinc-200/40">
                <span className="text-zinc-500 font-medium">Faculty Members</span>
                <span className="font-bold text-zinc-800">{teacherCount !== null ? `${teacherCount} Teachers` : "Loading..."}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500 font-medium">Student Body</span>
                <span className="font-bold text-zinc-800">{loading ? "Loading..." : `${students.length} Enrolled`}</span>
              </div>
            </div>
            <p className="text-[11px] text-zinc-400 leading-normal">
              To update standard tuition fees, add new sections, or configure payment installments, please re-run setup onboarding operations or contact your administrator.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
