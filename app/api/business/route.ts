import { pool } from "@/lib/db"
import { cookies } from "next/headers"
import { verifyToken } from "@/lib/auth"

export async function POST(req: Request) {
  const cookieStore = await cookies()
  const token = cookieStore.get("token")?.value

  const user = token ? verifyToken(token) : null
  if (!user) return new Response("Unauthorized", { status: 401 })

  const form = await req.formData()
  const name = form.get("name")
  const vat = form.get("vat")
  const cr = form.get("cr")

  if (!name || !vat || !cr) {
    return new Response("Missing fields", { status: 400 })
  }

  await pool.query(
    `
    INSERT INTO businesses (user_id, name, vat_number, cr_number)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (user_id)
    DO UPDATE SET
      name = EXCLUDED.name,
      vat_number = EXCLUDED.vat_number,
      cr_number = EXCLUDED.cr_number
    `,
    [user.userId, name, vat, cr]
  )

  return new Response(null, {
  status: 302,
  headers: { Location: "/dashboard?saved=1" },
})

}
