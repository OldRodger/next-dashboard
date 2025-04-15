import postgres from "postgres";

const sql = postgres({
  host: process.env.POSTGRES_HOST!,
  user: process.env.POSTGRES_USER!,
  password: process.env.POSTGRES_PASSWORD!,
  database: process.env.POSTGRES_DATABASE!,
  port: +process.env.POSTGRES_PORT!,
});

console.log("✅ db.ts called");

export { sql };
