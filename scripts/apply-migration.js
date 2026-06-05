const fs = require("fs");
const path = require("path");

async function run() {
  const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || process.argv[2];

  if (!dbUrl) {
    console.error("\x1b[31mError: Database connection URL is missing.\x1b[0m");
    console.log("\nPlease provide the PostgreSQL connection URL via one of the following methods:");
    console.log("1. Environment variable: export DATABASE_URL=\"postgresql://postgres:[password]@db.[project-id].supabase.co:5432/postgres\"");
    console.log("2. Command line argument: node scripts/apply-migration.js \"postgresql://...\"");
    console.log("\nAlternatively, you can copy-paste the SQL migrations directly into the Supabase SQL Editor:");
    console.log("- supabase/migrations/exam_notices.sql");
    console.log("- supabase/migrations/20260605_onboarding_staging.sql\n");
    process.exit(1);
  }

  let pg;
  try {
    pg = require("pg");
  } catch (err) {
    console.log("\x1b[33mThe 'pg' PostgreSQL client package is not installed.\x1b[0m");
    console.log("Installing 'pg' devDependency automatically...");
    const { execSync } = require("child_process");
    try {
      execSync("npm install pg --save-dev", { stdio: "inherit" });
      pg = require("pg");
    } catch (installErr) {
      console.error("\x1b[31mFailed to install 'pg' client. Please run: npm install pg --save-dev\x1b[0m");
      process.exit(1);
    }
  }

  const client = new pg.Client({
    connectionString: dbUrl,
    ssl: dbUrl.includes("supabase.co") ? { rejectUnauthorized: false } : false,
  });

  try {
    await client.connect();
    console.log("\x1b[32mSuccessfully connected to PostgreSQL database.\x1b[0m");

    const migrationsDir = path.join(__dirname, "..", "supabase", "migrations");
    if (!fs.existsSync(migrationsDir)) {
      console.error(`\x1b[31mMigrations directory not found at: ${migrationsDir}\x1b[0m`);
      process.exit(1);
    }

    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith(".sql"))
      .sort();

    if (files.length === 0) {
      console.log("No migration SQL files found.");
      return;
    }

    console.log(`Found ${files.length} migration(s). Applying in order...`);

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      console.log(`\n\x1b[36mRunning migration: ${file}\x1b[0m`);
      const sql = fs.readFileSync(filePath, "utf8");
      
      try {
        await client.query("BEGIN;");
        await client.query(sql);
        await client.query("COMMIT;");
        console.log(`\x1b[32mCompleted: ${file}\x1b[0m`);
      } catch (sqlErr) {
        await client.query("ROLLBACK;");
        console.error(`\x1b[31mError applying migration ${file}: ${sqlErr.message}\x1b[0m`);
        throw sqlErr;
      }
    }

    console.log("\n\x1b[32mAll migrations applied successfully!\x1b[0m");
  } catch (err) {
    console.error("\x1b[31mMigration execution failed.\x1b[0m");
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
