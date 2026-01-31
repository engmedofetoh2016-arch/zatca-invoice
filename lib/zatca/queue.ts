import { pool } from "@/lib/db"

export async function enqueueZatcaJob(input: {
  businessId: string
  invoiceId: string
  jobType: "report" | "clear"
}) {
  await pool.query(
    `INSERT INTO zatca_jobs (business_id, invoice_id, job_type)
     VALUES ($1,$2,$3)`,
    [input.businessId, input.invoiceId, input.jobType]
  )
}

export async function nextPendingJobs(limit = 5) {
  const res = await pool.query(
    `SELECT * FROM zatca_jobs
     WHERE status = 'queued' AND next_run_at <= NOW()
     ORDER BY created_at ASC
     LIMIT $1`,
    [limit]
  )
  return res.rows
}

export async function markJobRunning(id: string) {
  await pool.query(
    `UPDATE zatca_jobs SET status = 'running', updated_at = NOW() WHERE id = $1`,
    [id]
  )
}

export async function markJobFailed(id: string, error: string) {
  await pool.query(
    `UPDATE zatca_jobs SET status = 'failed', attempts = attempts + 1, last_error = $1, next_run_at = NOW() + INTERVAL '5 minutes', updated_at = NOW()
     WHERE id = $2`,
    [error, id]
  )
}

export async function markJobDone(id: string) {
  await pool.query(
    `UPDATE zatca_jobs SET status = 'done', updated_at = NOW() WHERE id = $1`,
    [id]
  )
}
