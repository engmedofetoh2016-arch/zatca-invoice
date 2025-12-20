import { pool } from "@/lib/db"

export async function getBusinessByUserId(userId: string) {
  const res = await pool.query(
    `
    SELECT id, name, vat_number, cr_number
    FROM businesses
    WHERE user_id = $1
    LIMIT 1
    `,
    [userId]
  )

  return res.rows[0] ?? null
}
