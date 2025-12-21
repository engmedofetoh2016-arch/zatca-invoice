import bcrypt from "bcryptjs"
import { pool } from "@/lib/db"

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return new Response("Missing email/password", { status: 400 })
    }

    const passwordHash = await bcrypt.hash(String(password), 10)

    const q = `
      INSERT INTO users (email, password_hash)
      VALUES ($1, $2)
      RETURNING id, email, created_at
    `
    const result = await pool.query(q, [String(email).toLowerCase(), passwordHash])
    return Response.json({ user: result.rows[0] })
  } catch (e: any) {
    console.error("SIGNUP ERROR:", e) // ✅ this will show the real reason in Coolify logs
    if (e?.code === "23505") return new Response("Email already exists", { status: 409 })
    return new Response("Server error", { status: 500 })
  }
}
