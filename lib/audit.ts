import { pool } from "@/lib/db"

export async function auditLog(input: {
  businessId?: string | null
  userId?: string | null
  action: string
  entityType?: string | null
  entityId?: string | null
  metadata?: Record<string, unknown> | null
}) {
  const {
    businessId = null,
    userId = null,
    action,
    entityType = null,
    entityId = null,
    metadata = null,
  } = input

  await pool.query(
    `INSERT INTO audit_logs (business_id, user_id, action, entity_type, entity_id, metadata)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [businessId, userId, action, entityType, entityId, metadata]
  )
}
