import { NextResponse } from "next/server"
import { pool } from "@/lib/db"
import { getCurrentUser } from "@/lib/current"
import { parseCsv } from "@/lib/csv"
import { rateLimit } from "@/lib/rate-limit"
import { getClientIp, requireCsrf } from "@/lib/security"

function normalizeHeader(h: string) {
  const key = h.trim().toLowerCase()
  const map: Record<string, string> = {
    "رمز الوحدة": "code",
    "رمز_الوحدة": "code",
    "رمز-الوحدة": "code",
    "code": "code",
    "الاسم بالعربية": "name_ar",
    "الاسم_بالعربية": "name_ar",
    "name_ar": "name_ar",
    "الاسم بالانجليزية": "name_en",
    "الاسم_بالانجليزية": "name_en",
    "name_en": "name_en",
  }
  return map[key] ?? key
}

type Row = Record<string, string>

export async function POST(req: Request) {
  if (!requireCsrf(req)) {
    return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 })
  }

  const ip = getClientIp(req)
  const rl = rateLimit(`units:import:${ip}`, 10, 60_000)
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    )
  }

  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

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
  if (!headers.includes("code") || !headers.includes("name_ar") || !headers.includes("name_en")) {
    return NextResponse.json({ error: "Missing required columns: code, name_ar, name_en" }, { status: 400 })
  }

  const parsed: Row[] = rows.slice(1).map((r) => {
    const obj: Row = {}
    headers.forEach((h, i) => {
      obj[h] = r[i] ?? ""
    })
    return obj
  })

  let created = 0
  let updated = 0
  let skipped = 0

  const client = await pool.connect()
  try {
    await client.query("BEGIN")

    for (const r of parsed) {
      const code = String(r.code ?? "").trim().toUpperCase()
      const nameAr = String(r.name_ar ?? "").trim()
      const nameEn = String(r.name_en ?? "").trim()

      if (!code || !nameAr || !nameEn) {
        skipped += 1
        continue
      }
      if (code.length > 10 || nameAr.length > 100 || nameEn.length > 100) {
        skipped += 1
        continue
      }

      const res = await client.query(
        `INSERT INTO units (code, name_en, name_ar)
         VALUES ($1,$2,$3)
         ON CONFLICT (code) DO UPDATE SET name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar
         RETURNING code, (xmax = 0) AS inserted`,
        [code, nameEn, nameAr]
      )

      if (res.rows[0]?.inserted) created += 1
      else updated += 1
    }

    await client.query("COMMIT")
  } catch (e) {
    await client.query("ROLLBACK")
    console.error("UNITS IMPORT ERROR:", e)
    return NextResponse.json({ error: "Import failed" }, { status: 500 })
  } finally {
    client.release()
  }

  return NextResponse.json({ ok: true, created, updated, skipped })
}
