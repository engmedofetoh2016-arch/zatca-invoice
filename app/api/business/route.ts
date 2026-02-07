import { pool } from "@/lib/db"
import { cookies } from "next/headers"
import { verifyToken } from "@/lib/auth"
import { rateLimit } from "@/lib/rate-limit"
import { getClientIp, requireCsrf, requireCsrfToken } from "@/lib/security"

export async function POST(req: Request) {
  const cookieStore = await cookies()
  const token = cookieStore.get("token")?.value

  const user = token ? verifyToken(token) : null
  if (!user) return new Response("Unauthorized", { status: 401 })

  const errorRedirect = (code: string) => {
    const url = new URL("/dashboard", req.url)
    url.searchParams.set("error", code)
    return new Response(null, { status: 303, headers: { Location: url.toString() } })
  }

  const ip = getClientIp(req)
  const rl = rateLimit(`business:update:${ip}`, 20, 60_000)
  if (!rl.ok) {
    return errorRedirect("rate")
  }

  const form = await req.formData()
  const csrfToken = String(form.get("csrf") ?? "")
  if (!(await requireCsrf(req)) && !(await requireCsrfToken(csrfToken))) {
    return errorRedirect("csrf")
  }


  const name = String(form.get("name") ?? "").trim()
  const vat = String(form.get("vat") ?? "").trim()
  const cr = String(form.get("cr") ?? "").trim()
  const branchName = String(form.get("branch_name") ?? "").trim()
  const addressLine = String(form.get("address_line") ?? "").trim()
  const district = String(form.get("district") ?? "").trim()
  const city = String(form.get("city") ?? "").trim()
  const postalCode = String(form.get("postal_code") ?? "").trim()
  const countryCode = String(form.get("country_code") ?? "SA").trim().toUpperCase()

  if (!name || !vat || !cr || !branchName || !addressLine || !district || !city || !postalCode || !countryCode) {
    return errorRedirect("missing")
  }
  if (!/^\d{15}$/.test(vat)) {
    return errorRedirect("vat")
  }
  if (!/^\d{10}$/.test(cr)) {
    return errorRedirect("cr")
  }
  if (!/^\d{5}$/.test(postalCode)) {
    return errorRedirect("postal")
  }

  await pool.query(
    `
    INSERT INTO businesses (user_id, name, vat_number, cr_number, branch_name, address_line, district, city, postal_code, country_code)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    ON CONFLICT (user_id)
    DO UPDATE SET
      name = EXCLUDED.name,
      vat_number = EXCLUDED.vat_number,
      cr_number = EXCLUDED.cr_number,
      branch_name = EXCLUDED.branch_name,
      address_line = EXCLUDED.address_line,
      district = EXCLUDED.district,
      city = EXCLUDED.city,
      postal_code = EXCLUDED.postal_code,
      country_code = EXCLUDED.country_code
    `,
    [user.userId, name, vat, cr, branchName, addressLine, district, city, postalCode, countryCode]
  )

  const bizRes = await pool.query(
    `SELECT id FROM businesses WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [user.userId]
  )
  const businessId = bizRes.rows[0]?.id
  if (businessId) {
    await pool.query(
      `INSERT INTO business_memberships (business_id, user_id, role)
       VALUES ($1,$2,'owner')
       ON CONFLICT (business_id, user_id) DO NOTHING`,
      [businessId, user.userId]
    )
  }

  return new Response(null, {
  status: 302,
  headers: { Location: "/dashboard?saved=1" },
})

}
