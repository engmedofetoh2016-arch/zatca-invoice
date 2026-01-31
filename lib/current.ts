import { cookies } from "next/headers"
import { verifyToken } from "@/lib/auth"
import { pool } from "@/lib/db"

export async function getCurrentUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get("token")?.value
  const user = token ? verifyToken(token) : null
  if (!user?.jti) return user

  const res = await pool.query(
    `SELECT id FROM user_sessions WHERE user_id = $1 AND jti = $2 AND revoked_at IS NULL`,
    [user.userId, user.jti]
  )
  return res.rows[0] ? user : null
}

export async function getCurrentBusinessId(userId: string) {
  const res = await pool.query(
    `SELECT id FROM businesses WHERE user_id = $1`,
    [userId]
  )
  return res.rows[0]?.id ?? null
}
