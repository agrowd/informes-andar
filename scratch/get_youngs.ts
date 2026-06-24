import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const { connectToDB, sql } = await import('../src/lib/db');
  await connectToDB();
  if (sql) {
    const res = await sql`SELECT * FROM youngs WHERE id = 2`;
    console.log("Juan Pablo Herrera row:", JSON.stringify(res.rows[0], null, 2));
  }
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
