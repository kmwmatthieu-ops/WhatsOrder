import postgres from "postgres";
import fs from "fs";

const connectionString = "postgresql://postgres.hzexwajoxzhistuqleek:EHZRvEmmt2aCxKZg@aws-1-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require";

const sql = postgres(connectionString);

async function run() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.log("Testing connection...");
    const result = await sql`SELECT current_database(), current_user;`;
    console.log("Success:", result);
    await sql.end();
    return;
  }

  console.log(`Executing migration file: ${filePath}`);
  const content = fs.readFileSync(filePath, "utf-8");
  await sql.unsafe(content);
  console.log("Migration executed successfully!");
  await sql.end();
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
