import { NextResponse } from "next/server"
import { pool } from "@/lib/db"
import { getCurrentUser } from "@/lib/current"
import { requireCsrf } from "@/lib/security"

export async function GET() {
  const res = await pool.query(
    `SELECT code, name_en, name_ar
     FROM units
     ORDER BY code ASC`
  )
  return NextResponse.json({ units: res.rows })
}

export async function POST(req: Request) {
  if (!requireCsrf(req)) {
    return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 })
  }

  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const code = String(body?.code ?? "").trim().toUpperCase()
  const nameEn = String(body?.name_en ?? "").trim()
  const nameAr = String(body?.name_ar ?? "").trim()

  if (!code || !nameEn || !nameAr) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }
  if (code.length > 10 || nameEn.length > 100 || nameAr.length > 100) {
    return NextResponse.json({ error: "Invalid length" }, { status: 400 })
  }

  const res = await pool.query(
    `INSERT INTO units (code, name_en, name_ar)
     VALUES ($1,$2,$3)
     ON CONFLICT (code) DO UPDATE SET name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar
     RETURNING code, name_en, name_ar`,
    [code, nameEn, nameAr]
  )

  return NextResponse.json({ unit: res.rows[0] })
}
