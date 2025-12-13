import { cookies } from "next/headers"
import { verifyToken } from "@/lib/auth"
import { pool } from "@/lib/db"

export async function getCurrentUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get("token")?.value
  const user = token ? verifyToken(token) : null
  return user
}

export async function getCurrentBusinessId(userId: string) {
  const res = await pool.query(
    `SELECT id FROM businesses WHERE user_id = $1`,
    [userId]
  )
  return res.rows[0]?.id ?? null
}
