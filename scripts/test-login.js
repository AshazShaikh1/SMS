const { createClient } = require("@supabase/supabase-js");

async function test() {
  const supabaseUrl = "https://vbwvuycwhjepsrxuekfh.supabase.co";
  const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZid3Z1eWN3aGplcHNyeHVla2ZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NDc4NTcsImV4cCI6MjA5NjIyMzg1N30.ivYWQRXYnMBgP5cEkTAMtup17BZ3TcMEpWnGlH41p2U";
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  console.log("Attempting to log in as ashaz.dev@gmail.com...");
  
  try {
    // Note: Use your password here. Since we don't know it, we will catch the auth error
    // or if the user is already authenticated we can test it.
    // Wait, let's verify if the database returns an error when we query the profiles table directly
    // using the anon key (unauthenticated), or if we can see what policies exist.
    
    // Let's check what the public profiles query returns for unauthenticated clients:
    const { data: anonData, error: anonError } = await supabase
      .from("profiles")
      .select("*");
      
    console.log("\nUnauthenticated client query to profiles:");
    console.log("Data:", anonData);
    console.log("Error:", anonError);

  } catch (err) {
    console.error("Test execution error:", err);
  }
}

test();
