import { NextResponse } from "next/server"
import { nextPendingJobs, markJobRunning, markJobFailed, markJobDone, markJobResult } from "@/lib/zatca/queue"
import { pool } from "@/lib/db"
import { getActiveCertificate } from "@/lib/zatca/certificates"
import { signXmlWithPrivateKey } from "@/lib/zatca/signing"
import { auditLog } from "@/lib/audit"
import { validateWithZatcaSdk } from "@/lib/zatca/sdk-client"
import { requireCsrf } from "@/lib/security"

async function callZatca(endpoint: string, payload: string, token?: string | null) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/xml",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: payload,
  })
  const text = await res.text()
  return { ok: res.ok, status: res.status, text }
}

function getZatcaEndpoint(jobType: "report" | "clear") {
  if (jobType === "report") return process.env.ZATCA_REPORT_URL ?? process.env.ZATCA_ENDPOINT_URL
  return process.env.ZATCA_CLEAR_URL ?? process.env.ZATCA_ENDPOINT_URL
}

export async function POST(req: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const headerSecret = req.headers.get("x-cron-secret") ?? ""
    if (headerSecret !== cronSecret && !(await requireCsrf(req))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  } else if (!(await requireCsrf(req))) {
    return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 })
  }

  const jobs = await nextPendingJobs(5)
  const endpointBase = process.env.ZATCA_ENDPOINT_URL
  const token = process.env.ZATCA_API_TOKEN

  if (!endpointBase && !process.env.ZATCA_REPORT_URL && !process.env.ZATCA_CLEAR_URL) {
    return NextResponse.json({ error: "ZATCA_ENDPOINT_URL missing" }, { status: 500 })
  }

  for (const job of jobs) {
    try {
      await markJobRunning(job.id)

      const invRes = await pool.query(
        `SELECT id, xml_payload, business_id FROM invoices WHERE id = $1`,
        [job.invoice_id]
      )
      const inv = invRes.rows[0]
      if (!inv?.xml_payload) {
        await markJobFailed(job.id, "Missing XML payload")
        continue
      }

      const cert = await getActiveCertificate(inv.business_id)
      if (!cert) {
        await markJobFailed(job.id, "No active certificate")
        continue
      }

      const signature = signXmlWithPrivateKey({
        xml: inv.xml_payload,
        encryptedPrivateKey: cert.encrypted_private_key,
        iv: cert.private_key_iv,
        tag: cert.private_key_tag,
      })

      const signedPayload = `${inv.xml_payload}\n<!-- Signature:${signature} -->`
      const sdkValidation = await validateWithZatcaSdk(signedPayload)
      if (!sdkValidation.ok) {
        const errs = "errors" in sdkValidation ? (sdkValidation.errors ?? []) : []
        await markJobFailed(job.id, `SDK validation failed: ${errs.join("; ")}`)
        continue
      }
      const endpoint = getZatcaEndpoint(job.job_type)
      if (!endpoint) {
        await markJobFailed(job.id, "ZATCA endpoint missing for job type")
        continue
      }

      const response = await callZatca(endpoint, signedPayload, token)
      await markJobResult({
        id: job.id,
        responseStatus: response.status,
        responseBody: response.text,
      })

      if (!response.ok) {
        await markJobFailed(job.id, `ZATCA error ${response.status}`)
        continue
      }

      if (job.job_type === "report") {
        await pool.query(
          `UPDATE invoices SET status = 'reported', status_changed_at = NOW(), reported_at = NOW(),
           zatca_status = 'reported', zatca_last_response = $1
           WHERE id = $2`,
          [response.text, inv.id]
        )
      } else if (job.job_type === "clear") {
        await pool.query(
          `UPDATE invoices SET status = 'cleared', status_changed_at = NOW(), cleared_at = NOW(),
           zatca_status = 'cleared', zatca_last_response = $1
           WHERE id = $2`,
          [response.text, inv.id]
        )
      }

      await markJobDone(job.id)
      await auditLog({ businessId: inv.business_id, action: "zatca.job.done", entityType: "invoice", entityId: inv.id })
    } catch (e: any) {
      await markJobFailed(job.id, String(e?.message ?? "Unknown error"))
    }
  }

  return NextResponse.json({ ok: true, processed: jobs.length })
}
