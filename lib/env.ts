export function validateEnv() {
  const required = ["JWT_SECRET", "DATABASE_URL", "APP_URL"] as const
  const missing = required.filter((key) => !process.env[key])
  return { ok: missing.length === 0, missing }
}

