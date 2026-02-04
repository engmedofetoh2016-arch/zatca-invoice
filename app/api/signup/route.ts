import bcrypt from "bcryptjs"
import { pool } from "@/lib/db"
import { rateLimit } from "@/lib/rate-limit"
import { getClientIp, requireCsrf } from "@/lib/security"

export async function POST(req: Request) {
  try {
    if (!(await requireCsrf(req))) {
      return new Response("CSRF validation failed", { status: 403 })
    }

    const ip = getClientIp(req)
    const rl = rateLimit(`signup:${ip}`, 5, 60_000)
    if (!rl.ok) {
      return new Response("Too many requests", {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfter) },
      })
    }

    const { email, password } = await req.json()

    if (!email || !password) {
      return new Response("Missing email/password", { status: 400 })
    }

    const pwd = String(password)
    if (
      pwd.length < 8 ||
      !/[a-z]/.test(pwd) ||
      !/[A-Z]/.test(pwd) ||
      !/[0-9]/.test(pwd)
    ) {
      return new Response("Password must be 8+ chars with upper/lower/number", { status: 400 })
    }

    const passwordHash = await bcrypt.hash(String(password), 10)

    const q = `
      INSERT INTO users (email, password_hash)
      VALUES ($1, $2)
      RETURNING id, email, created_at
    `
    const result = await pool.query(q, [String(email).toLowerCase(), passwordHash])
    const user = result.rows[0]
    await pool.query(
      `UPDATE users SET password_updated_at = NOW() WHERE id = $1`,
      [user.id]
    )
    return Response.json({ user: result.rows[0] })
  } catch (e: any) {
    console.error("SIGNUP ERROR:", e) // ✅ this will show the real reason in Coolify logs
    if (e?.code === "23505") return new Response("Email already exists", { status: 409 })
    return new Response("Server error", { status: 500 })
  }
}
