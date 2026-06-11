import { hashPassword } from "../auth/passwords.js";
import { pool } from "../db.js";

const [email, password] = process.argv.slice(2);
if (!email || !password) {
  console.error("usage: create-user <email> <password>");
  process.exit(1);
}

const hash = await hashPassword(password);
await pool.query(
  `INSERT INTO auth.users (email, password_hash) VALUES (lower($1), $2)
   ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
  [email, hash]
);
console.log(`user created/updated: ${email.toLowerCase()}`);
await pool.end();
