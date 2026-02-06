import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/current"
import { getBusinessByUserId } from "@/lib/business"
import { pool } from "@/lib/db"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const business = await getBusinessByUserId(user.userId)
  if (!business?.id) return NextResponse.json({ error: "Business not found" }, { status: 400 })

  const res = await pool.query(
    `SELECT id, invoice_id, job_type, status, attempts, last_error, response_status, response_at, created_at
     FROM zatca_jobs
     WHERE business_id = $1
     ORDER BY created_at DESC
     LIMIT 10`,
    [business.id]
  )

  return NextResponse.json({ ok: true, jobs: res.rows })
}
