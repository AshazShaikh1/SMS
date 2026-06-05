const fs = require("fs");
const path = require("path");
const pg = require("pg");

async function run() {
  const dbUrl = "postgresql://postgres:tpz6tmfOAcZtNT9i@db.vbwvuycwhjepsrxuekfh.supabase.co:5432/postgres";
  const client = new pg.Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected to Supabase PostgreSQL database.");

    const dbSqlPath = path.join(__dirname, "..", "db.sql");
    const sqlContent = fs.readFileSync(dbSqlPath, "utf8");

    console.log("Applying database schema from db.sql...");
    
    // We execute the SQL schema inside a transaction block
    await client.query("BEGIN;");
    await client.query(sqlContent);
    await client.query("COMMIT;");

    console.log("Database schema, recursive-safe RLS, and permissions applied successfully!");
  } catch (err) {
    try {
      await client.query("ROLLBACK;");
    } catch (rbErr) {
      // ignore rollback errors
    }
    console.error("Failed to apply database schema:", err.message);
  } finally {
    await client.end();
  }
}

run();
