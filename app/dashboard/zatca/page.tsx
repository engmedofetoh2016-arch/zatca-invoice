import { pool } from "@/lib/db"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { verifyToken } from "@/lib/auth"
import { getBusinessByUserId } from "@/lib/business"
import ZatcaSettingsClient from "./ZatcaSettingsClient"

export const dynamic = "force-dynamic"

export default async function ZatcaSettingsPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get("token")?.value
  const user = token ? verifyToken(token) : null
  if (!user) redirect("/login")

  const business = await getBusinessByUserId(user.userId)
  if (!business) return <div className="p-6">No business found for this user.</div>

  const res = await pool.query(
    `SELECT environment, csid, pcsid, certificate_pem
     FROM zatca_settings
     WHERE business_id = $1`,
    [business.id]
  )

  const settings = res.rows[0] ?? null

  return (
    <div dir="rtl" className="space-y-6">
      <div>
        <div className="text-xs text-gray-500">إعدادات الربط</div>
        <h1 className="mt-2 text-2xl font-semibold">ZATCA</h1>
        <p className="mt-1 text-sm text-gray-600">قم بإدخال بيانات الربط الأساسية.</p>
      </div>
      <ZatcaSettingsClient initial={settings} />
    </div>
  )
}
