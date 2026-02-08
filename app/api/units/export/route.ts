import { NextResponse } from "next/server"
import { pool } from "@/lib/db"
import { getCurrentUser } from "@/lib/current"
import { toCsv } from "@/lib/csv"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const res = await pool.query(
    `SELECT code, name_ar, name_en
     FROM units
     ORDER BY code ASC`
  )

  const rows = [
    ["code", "name_ar", "name_en"],
    ...res.rows.map((r: any) => [r.code ?? "", r.name_ar ?? "", r.name_en ?? ""]),
  ]

  const csv = toCsv(rows)

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=units.csv",
    },
  })
}
