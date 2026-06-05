const pg = require("pg");

async function check() {
  const dbUrl = process.env.DATABASE_URL || "postgresql://postgres:tpz6tmfOAcZtNT9i@db.vbwvuycwhjepsrxuekfh.supabase.co:5432/postgres";
  const client = new pg.Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected to PostgreSQL successfully.");

    // 1. Check if public.profiles exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles'
      );
    `);
    const tableExists = tableCheck.rows[0].exists;
    console.log(`Table 'public.profiles' exists: ${tableExists}`);

    if (tableExists) {
      // 2. Query all profiles to inspect what is currently registered
      const res = await client.query("SELECT id, school_id, email, full_name, role FROM public.profiles;");
      console.log("\nRegistered profiles inside database:");
      console.log(JSON.stringify(res.rows, null, 2));

      // 3. Check specific UUIDs
      const dev1 = "c84a86ea-3d88-454e-ab54-edcd0663f3b7";
      const dev2 = "f8d4c615-94f7-43ba-a0fb-133804027cbf";
      const dev1Check = res.rows.find(r => r.id === dev1);
      const dev2Check = res.rows.find(r => r.id === dev2);

      console.log(`\nDeveloper 1 (${dev1}) profile found: ${!!dev1Check}`);
      console.log(`Developer 2 (${dev2}) profile found: ${!!dev2Check}`);
    } else {
      console.log("\nWARNING: The database has no tables created. Please run the db.sql schema migrations first.");
    }
  } catch (err) {
    console.error("Database query failed:", err.message);
  } finally {
    await client.end();
  }
}

check();
