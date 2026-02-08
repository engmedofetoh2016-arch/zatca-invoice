import { NextResponse } from "next/server"
import { pool } from "@/lib/db"
import { getCurrentUser } from "@/lib/current"
import { getBusinessByUserId } from "@/lib/business"
import { parseCsv } from "@/lib/csv"
import { rateLimit } from "@/lib/rate-limit"
import { getClientIp, requireCsrf } from "@/lib/security"

function normalizeHeader(h: string) {
  const key = h.trim().toLowerCase()
  const map: Record<string, string> = {
    "??? ??????": "name",
    "???_??????": "name",
    "???-??????": "name",
    "?????": "name",
    "customer name": "name",
    "customer_name": "name",
    "name": "name",
    "????? ???????": "vat_number",
    "??? ???????": "vat_number",
    "??? ????? ??????": "vat_number",
    "vat": "vat_number",
    "vat number": "vat_number",
    "vat_number": "vat_number",
  }
  return map[key] ?? key
}

type Row = Record<string, string>

export async function POST(req: Request) {
  if (!requireCsrf(req)) {
    return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 })
  }

  const ip = getClientIp(req)
  const rl = rateLimit(`customers:import:${ip}`, 10, 60_000)
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    )
  }

  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const business = await getBusinessByUserId(user.userId)
  if (!business?.id) return NextResponse.json({ error: "Business not found" }, { status: 400 })

  const form = await req.formData()
  const file = form.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 })
  }

  const text = await file.text()
  const rows = parseCsv(text)
  if (rows.length < 2) {
    return NextResponse.json({ error: "CSV is empty" }, { status: 400 })
  }

  const headers = rows[0].map(normalizeHeader)
  if (!headers.includes("name")) {
    return NextResponse.json({ error: "Missing required column: name" }, { status: 400 })
  }

  const parsed: Row[] = rows.slice(1).map((r) => {
    const obj: Row = {}
    headers.forEach((h, i) => {
      obj[h] = r[i] ?? ""
    })
    return obj
  })

  let created = 0
  let skipped = 0

  const client = await pool.connect()
  try {
    await client.query("BEGIN")

    for (const r of parsed) {
      const name = String(r.name ?? "").trim()
      const vatNumber = r.vat_number ? String(r.vat_number).trim() : null
      if (!name) {
        skipped += 1
        continue
      }

      const res = await client.query(
        `INSERT INTO customers (business_id, name, vat_number)
         VALUES ($1,$2,$3)
         ON CONFLICT (business_id, name, vat_number) DO NOTHING
         RETURNING id`,
        [business.id, name, vatNumber]
      )

      if (res.rows[0]) created += 1
      else skipped += 1
    }

    await client.query("COMMIT")
  } catch (e) {
    await client.query("ROLLBACK")
    console.error("CUSTOMERS IMPORT ERROR:", e)
    return NextResponse.json({ error: "Import failed" }, { status: 500 })
  } finally {
    client.release()
  }

  return NextResponse.json({ ok: true, created, skipped })
}
