import { NextResponse } from "next/server"
import { pool } from "@/lib/db"
import { getCurrentUser } from "@/lib/current"
import { requireCsrf } from "@/lib/security"

export async function PUT(req: Request, { params }: { params: Promise<{ code: string }> }) {
  if (!(await requireCsrf(req))) {
    return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 })
  }

  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { code } = await params
  const body = await req.json().catch(() => ({}))
  const nameEn = String(body?.name_en ?? "").trim()
  const nameAr = String(body?.name_ar ?? "").trim()

  if (!nameEn || !nameAr) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  const res = await pool.query(
    `UPDATE units SET name_en = $1, name_ar = $2 WHERE code = $3 RETURNING code, name_en, name_ar`,
    [nameEn, nameAr, String(code).trim().toUpperCase()]
  )
  if (!res.rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ unit: res.rows[0] })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ code: string }> }) {
  if (!(await requireCsrf(req))) {
    return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 })
  }

  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { code } = await params
  try {
    const res = await pool.query(`DELETE FROM units WHERE code = $1 RETURNING code`, [
      String(code).trim().toUpperCase(),
    ])
    if (!res.rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: "Unit is in use" }, { status: 409 })
  }
}
