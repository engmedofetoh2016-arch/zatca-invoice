import { pool } from "@/lib/db"

export async function GET() {
  const result = await pool.query("SELECT NOW() as now")
  return Response.json({ ok: true, now: result.rows[0].now })
}
