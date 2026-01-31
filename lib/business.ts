import { pool } from "@/lib/db"

export async function getBusinessByUserId(userId: string) {
  const res = await pool.query(
    `
    SELECT b.id, b.name, b.vat_number, b.cr_number
    FROM businesses b
    LEFT JOIN business_memberships bm ON bm.business_id = b.id
    WHERE b.user_id = $1 OR bm.user_id = $1
    ORDER BY b.created_at DESC
    LIMIT 1
    `,
    [userId]
  )

  return res.rows[0] ?? null
}
