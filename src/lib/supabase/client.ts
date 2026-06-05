import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-url.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Fetch the active user's school_id for multi-tenant filtering.
 */
export async function getActiveUserSchoolId(): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("school_id")
      .eq("id", user.id)
      .single();
      
    if (error || !profile) return null;
    return profile.school_id;
  } catch (e) {
    console.error("Error retrieving user school context:", e);
    return null;
  }
}

/**
 * Fetch the active user's full profile info.
 */
export async function getActiveUserProfile(): Promise<{
  id: string;
  school_id: string;
  email: string;
  full_name: string;
  role: "admin" | "teacher" | "student" | "parent";
} | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, school_id, email, full_name, role")
      .eq("id", user.id)
      .single();
      
    if (error || !profile) return null;
    return profile as any;
  } catch (e) {
    console.error("Error retrieving user profile context:", e);
    return null;
  }
}

// Synchronize auth session cookie with Edge middleware
if (typeof window !== "undefined") {
  supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
      const maxAge = 100 * 365 * 24 * 60 * 60; // 100 years
      document.cookie = `sb-auth-token=${encodeURIComponent(JSON.stringify(session))}; path=/; max-age=${maxAge}; SameSite=Lax;`;
    } else {
      document.cookie = `sb-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax;`;
    }
  });
}
