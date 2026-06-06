import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper to extract cookies in the browser
function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift() ?? null;
  return null;
}

// Intercept Supabase Auth getUser on the client to mock active user during Ghost Mode
const originalGetUser = supabase.auth.getUser.bind(supabase.auth);

supabase.auth.getUser = async (token?: string) => {
  const ghostCookie = getCookie("ghost_session");
  if (ghostCookie) {
    try {
      const ghostSession = JSON.parse(decodeURIComponent(ghostCookie));
      if (ghostSession && ghostSession.profile_id) {
        return {
          data: {
            user: {
              id: ghostSession.profile_id,
              email: ghostSession.email || "impersonated@school.edu",
              aud: "authenticated",
              role: "authenticated",
              created_at: new Date().toISOString(),
              app_metadata: {},
              user_metadata: {}
            } as any
          },
          error: null
        };
      }
    } catch (e) {
      console.error("Error parsing ghost session in getUser override:", e);
    }
  }
  return originalGetUser(token);
};

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
 * Fetch the active user's full profile.
 */
export async function getActiveUserProfile(): Promise<{
  id: string;
  school_id: string;
  email: string;
  full_name: string;
  role: "admin" | "teacher" | "student" | "parent" | "developer";
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

/**
 * Sign out — clears both the Supabase session and the auth cookie.
 */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
  document.cookie = "sb-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax;";
  document.cookie = "ghost_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax;";
}
