import bcrypt from "bcryptjs"
import { NextResponse } from "next/server"
import { pool } from "@/lib/db"
import { getClientIp, requireCsrf } from "@/lib/security"
import { rateLimit } from "@/lib/rate-limit"
import { sha256Hex } from "@/lib/crypto"

export async function POST(req: Request) {
  if (!(await requireCsrf(req))) {
    return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 })
  }

  const ip = getClientIp(req)
  const rl = rateLimit(`password:reset:${ip}`, 10, 60_000)
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    )
  }

  const { token, password } = await req.json().catch(() => ({}))
  const rawToken = String(token ?? "").trim()
  const pwd = String(password ?? "")
  if (!rawToken || !pwd) {
    return NextResponse.json({ error: "Missing token/password" }, { status: 400 })
  }

  if (pwd.length < 8 || !/[a-z]/.test(pwd) || !/[A-Z]/.test(pwd) || !/[0-9]/.test(pwd)) {
    return NextResponse.json(
      { error: "Password must be 8+ chars with upper/lower/number" },
      { status: 400 }
    )
  }

  const tokenHash = sha256Hex(rawToken)
  const tokenRes = await pool.query(
    `SELECT id, user_id, expires_at, used_at FROM password_reset_tokens
     WHERE token_hash = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [tokenHash]
  )
  const row = tokenRes.rows[0]
  if (!row || row.used_at) {
    return NextResponse.json({ error: "Invalid or used token" }, { status: 400 })
  }
  if (new Date(row.expires_at) < new Date()) {
    return NextResponse.json({ error: "Token expired" }, { status: 400 })
  }

  const passwordHash = await bcrypt.hash(pwd, 10)
  await pool.query(
    `UPDATE users SET password_hash = $1, password_updated_at = NOW() WHERE id = $2`,
    [passwordHash, row.user_id]
  )
  await pool.query(
    `UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1`,
    [row.id]
  )
  await pool.query(`DELETE FROM user_sessions WHERE user_id = $1`, [row.user_id])

  return NextResponse.json({ ok: true })
}
