import { NextResponse } from "next/server"
import { pool } from "@/lib/db"
import { getClientIp, requireCsrf } from "@/lib/security"
import { rateLimit } from "@/lib/rate-limit"
import { randomUuid, sha256Hex } from "@/lib/crypto"
import { hasSmtp, sendEmail } from "@/lib/email"

export async function POST(req: Request) {
  if (!(await requireCsrf(req))) {
    return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 })
  }

  const ip = getClientIp(req)
  const rl = rateLimit(`password:request:${ip}`, 5, 60_000)
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    )
  }

  const { email } = await req.json().catch(() => ({}))
  const normalizedEmail = String(email ?? "").toLowerCase().trim()
  if (!normalizedEmail) {
    return NextResponse.json({ error: "Missing email" }, { status: 400 })
  }

  const userRes = await pool.query(`SELECT id FROM users WHERE email = $1`, [normalizedEmail])
  const user = userRes.rows[0]

  if (user) {
    const token = randomUuid()
    const tokenHash = sha256Hex(token)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)
    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, tokenHash, expiresAt]
    )

    const origin = req.headers.get("origin") ?? ""
    const baseUrl = process.env.APP_URL ?? origin
    const resetUrl = baseUrl ? `${baseUrl}/reset/${token}` : `/reset/${token}`

    if (hasSmtp()) {
      const subject = "????? ????? ???? ??????"
      const text = `?????? ??? ?????? ?????? ????? ???? ??????: ${resetUrl}`
      const html = `<p>?????? ??? ?????? ?????? ????? ???? ??????:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`
      await sendEmail({ to: normalizedEmail, subject, text, html })
    }

    const isProd = process.env.NODE_ENV === "production"
    if (!isProd && !hasSmtp()) {
      return NextResponse.json({ ok: true, resetUrl, token })
    }
  }

  return NextResponse.json({ ok: true })
}
