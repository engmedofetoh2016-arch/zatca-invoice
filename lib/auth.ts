import jwt from "jsonwebtoken"

const secret = process.env.JWT_SECRET!

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, secret) as { userId: string; email: string; jti?: string }
  } catch {
    return null
  }
}
