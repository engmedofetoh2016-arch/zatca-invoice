import { NextResponse } from "next/server"
import { nextPendingJobs, markJobRunning, markJobFailed, markJobDone } from "@/lib/zatca/queue"
import { pool } from "@/lib/db"
import { getActiveCertificate } from "@/lib/zatca/certificates"
import { signXmlWithPrivateKey } from "@/lib/zatca/signing"
import { auditLog } from "@/lib/audit"

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

export async function POST() {
  const jobs = await nextPendingJobs(5)
  const endpoint = process.env.ZATCA_ENDPOINT_URL
  const token = process.env.ZATCA_API_TOKEN

  if (!endpoint) {
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
      const response = await callZatca(endpoint, signedPayload, token)

      if (!response.ok) {
        await markJobFailed(job.id, `ZATCA error ${response.status}`)
        continue
      }

      await markJobDone(job.id)
      await auditLog({ businessId: inv.business_id, action: "zatca.job.done", entityType: "invoice", entityId: inv.id })
    } catch (e: any) {
      await markJobFailed(job.id, String(e?.message ?? "Unknown error"))
    }
  }

  return NextResponse.json({ ok: true, processed: jobs.length })
}
