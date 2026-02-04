import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { NextResponse } from "next/server"
import { pool } from "@/lib/db"
import { rateLimit } from "@/lib/rate-limit"
import { getClientIp, requireCsrf } from "@/lib/security"
import { randomUuid } from "@/lib/crypto"
import { cookies } from "next/headers";

export async function POST(req: Request) {
  if (!(await requireCsrf(req))) {
    return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 })
  }

  const ip = getClientIp(req)
  const rl = rateLimit(`login:${ip}`, 10, 60_000)
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    )
  }

  const { email, password } = await req.json()
  if (!email || !password) {
    return NextResponse.json({ error: "Missing email/password" }, { status: 400 })
  }

  const userRes = await pool.query(
    `SELECT id, email, password_hash, failed_login_attempts, locked_until FROM users WHERE email = $1`,
    [String(email).toLowerCase()]
  )
  const user = userRes.rows[0]
  if (!user) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })

  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    return NextResponse.json({ error: "Account locked. Try later." }, { status: 423 })
  }

  const ok = await bcrypt.compare(password, user.password_hash)
  if (!ok) {
    const attempts = (user.failed_login_attempts ?? 0) + 1
    const lockedUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null
    await pool.query(
      `UPDATE users SET failed_login_attempts = $1, locked_until = $2 WHERE id = $3`,
      [attempts, lockedUntil, user.id]
    )
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
  }

  const secret = process.env.JWT_SECRET
  if (!secret) return NextResponse.json({ error: "JWT_SECRET is missing" }, { status: 500 })

  const jti = randomUuid()
  await pool.query(
    `INSERT INTO user_sessions (user_id, jti) VALUES ($1,$2)`,
    [user.id, jti]
  )
  await pool.query(
    `UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login_at = NOW() WHERE id = $1`,
    [user.id]
  )

  const token = jwt.sign({ userId: user.id, email: user.email, jti }, secret, { expiresIn: "7d" })
  const isProd = process.env.NODE_ENV === "production"

  const res = NextResponse.json({ ok: true })
  res.cookies.set({
    name: "token",
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  })
  return res
}

export async function csrfCookieValue() {
  const cookieStore = await cookies();
  return cookieStore.get("csrf")?.value ?? "";
}
