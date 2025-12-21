import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { NextResponse } from "next/server"
import { pool } from "@/lib/db"

export async function POST(req: Request) {
  const { email, password } = await req.json()
  if (!email || !password) {
    return NextResponse.json({ error: "Missing email/password" }, { status: 400 })
  }

  const userRes = await pool.query(
    `SELECT id, email, password_hash FROM users WHERE email = $1`,
    [String(email).toLowerCase()]
  )
  const user = userRes.rows[0]
  if (!user) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })

  const ok = await bcrypt.compare(password, user.password_hash)
  if (!ok) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })

  const secret = process.env.JWT_SECRET
  if (!secret) return NextResponse.json({ error: "JWT_SECRET is missing" }, { status: 500 })

  const token = jwt.sign({ userId: user.id, email: user.email }, secret, { expiresIn: "7d" })

  const res = NextResponse.json({ ok: true })
  res.cookies.set({
    name: "token",
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: false, // IMPORTANT for localhost http
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  })
  return res
}
