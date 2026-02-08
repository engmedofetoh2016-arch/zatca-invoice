import { NextResponse } from "next/server"
import { pool } from "@/lib/db"
import { validateEnv } from "@/lib/env"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const env = validateEnv()
  if (!env.ok) {
    return NextResponse.json(
      { ok: false, env: "missing", missing: env.missing },
      { status: 500 }
    )
  }

  try {
    await pool.query("SELECT 1")
    return NextResponse.json({ ok: true, db: "ok", time: new Date().toISOString() })
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, db: "error", message: String(error?.message ?? "DB error") },
      { status: 500 }
    )
  }
}
