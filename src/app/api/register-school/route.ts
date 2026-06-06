import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/register-school
 *
 * Server-side school onboarding endpoint.
 * Uses the service_role key which:
 *  1. Bypasses ALL RLS policies
 *  2. Creates users with email_confirm = true (no confirmation email needed)
 *  3. Can insert directly into schools, profiles, onboarding_staging
 */
export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Server misconfiguration: missing Supabase service role credentials." },
      { status: 500 }
    );
  }

  // Admin client — bypasses RLS entirely
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const {
    schoolName,
    academicYear,
    adminName,
    schoolSlug,
    gradeFees,
    sectionsList,
    preparedClasses,
    teachers,
    parsedStudents,
  } = body;

  if (!schoolName || !adminName) {
    return NextResponse.json({ error: "School name and admin name are required." }, { status: 400 });
  }

  try {
    // ─── 1. Create School Record ─────────────────────────────────────────────
    const { data: schoolData, error: schoolError } = await adminClient
      .from("schools")
      .insert({
        school_name: schoolName,
        subscription_tier: "trial",
        is_active: true,
      })
      .select("id")
      .single();

    if (schoolError || !schoolData) {
      throw new Error(`Failed to create school: ${schoolError?.message}`);
    }

    const newSchoolId = schoolData.id;

    // ─── 2. Generate Admin Credentials ───────────────────────────────────────
    const slug = (schoolSlug || schoolName.toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 15)) || "school";
    const adminUsername = `${slug}-admin-1`;
    const adminEmailAddress = `${adminUsername}@internal-sms.local`;

    let pin = "";
    for (let i = 0; i < 8; i++) {
      pin += Math.floor(Math.random() * 10).toString();
    }

    // ─── 3. Create Admin in Supabase Auth (email_confirm = true) ─────────────
    // Clean up any existing auth user with the same email to avoid registration conflicts
    try {
      const { data: userData } = await adminClient.auth.admin.listUsers({
        page: 1,
        perPage: 1000
      });
      const existingUser = userData?.users.find(u => u.email === adminEmailAddress);
      if (existingUser) {
        await adminClient.auth.admin.deleteUser(existingUser.id);
      }
    } catch (cleanupErr) {
      console.warn("Auth cleanup warning:", cleanupErr);
    }

    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: adminEmailAddress,
      password: pin,
      email_confirm: true, // ← No confirmation email needed
      user_metadata: {
        full_name: adminName,
      },
    });

    if (authError || !authData.user) {
      throw new Error(`Failed to create admin auth account: ${authError?.message}`);
    }

    const adminUserId = authData.user.id;

    // ─── 4. Create Admin Profile ──────────────────────────────────────────────
    const { error: profileError } = await adminClient.from("profiles").insert({
      id: adminUserId,
      school_id: newSchoolId,
      email: adminUsername,
      full_name: adminName,
      role: "admin",
    });

    if (profileError) {
      throw new Error(`Failed to create admin profile: ${profileError.message}`);
    }

    // ─── 5. Write Staging Payload ─────────────────────────────────────────────
    const stagedData = {
      schoolName,
      academicYear: academicYear || "2026-2027",
      schoolSlug: slug,
      gradeFees: gradeFees || [],
      sectionsList: sectionsList || [],
      preparedClasses: preparedClasses || [],
      teachers: teachers || [],
      parsedStudents: parsedStudents || [],
    };

    const { error: stagingError } = await adminClient.from("onboarding_staging").insert({
      school_id: newSchoolId,
      staged_data: stagedData,
    });

    if (stagingError) {
      throw new Error(`Failed to write staging data: ${stagingError.message}`);
    }

    return NextResponse.json({
      success: true,
      adminUsername,
      adminPassword: pin,
      schoolId: newSchoolId,
    });
  } catch (err: any) {
    console.error("[register-school] Error:", err);
    return NextResponse.json({ error: err.message || "Unexpected server error." }, { status: 500 });
  }
}
