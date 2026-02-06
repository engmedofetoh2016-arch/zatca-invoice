"use client"

import { useEffect, useState } from "react"
import { getCsrfToken } from "@/lib/csrf-client"

type Props = {
  initial: { environment: string | null; csid: string | null; pcsid: string | null; certificate_pem: string | null } | null
}

type Job = {
  id: string
  invoice_id: string
  job_type: "report" | "clear"
  status: string
  attempts: number
  last_error: string | null
  response_status: number | null
  response_at: string | null
  created_at: string
}

export default function ZatcaSettingsClient({ initial }: Props) {
  const [environment, setEnvironment] = useState(initial?.environment ?? "sandbox")
  const [csid, setCsid] = useState(initial?.csid ?? "")
  const [pcsid, setPcsid] = useState(initial?.pcsid ?? "")
  const [certificate, setCertificate] = useState(initial?.certificate_pem ?? "")
  const [message, setMessage] = useState<string | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [jobsLoading, setJobsLoading] = useState(false)
  const [processLoading, setProcessLoading] = useState(false)

  async function loadJobs() {
    setJobsLoading(true)
    try {
      const res = await fetch("/api/zatca/jobs")
      const data = await res.json().catch(() => ({}))
      if (res.ok && Array.isArray(data.jobs)) {
        setJobs(data.jobs)
      }
    } finally {
      setJobsLoading(false)
    }
  }

  useEffect(() => {
    loadJobs()
  }, [])

  async function save() {
    setMessage(null)
    const res = await fetch("/api/zatca/settings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": getCsrfToken(),
      },
      body: JSON.stringify({ environment, csid, pcsid, certificate_pem: certificate }),
    })

    if (!res.ok) {
      setMessage("تعذر الحفظ")
      return
    }

    setMessage("تم الحفظ")
  }

  async function processJobs() {
    setProcessLoading(true)
    setMessage(null)
    try {
      const res = await fetch("/api/zatca/process", {
        method: "POST",
        headers: {
          "x-csrf-token": getCsrfToken(),
        },
      })
      if (!res.ok) {
        setMessage("تعذر تشغيل المعالجة")
        return
      }
      await loadJobs()
      setMessage("تم تشغيل المعالجة")
    } finally {
      setProcessLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-xs text-gray-500">البيئة</label>
          <select className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm" value={environment} onChange={(e) => setEnvironment(e.target.value)}>
            <option value="sandbox">Sandbox</option>
            <option value="production">Production</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500">CSID</label>
          <input className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={csid} onChange={(e) => setCsid(e.target.value)} placeholder="CSID" />
        </div>
        <div>
          <label className="text-xs text-gray-500">PCSID</label>
          <input className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={pcsid} onChange={(e) => setPcsid(e.target.value)} placeholder="PCSID" />
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-500">الشهادة (PEM)</label>
        <textarea
          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          rows={6}
          value={certificate}
          onChange={(e) => setCertificate(e.target.value)}
          placeholder="-----BEGIN CERTIFICATE-----"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90" onClick={save}>
          حفظ الإعدادات
        </button>
        <button
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50"
          onClick={processJobs}
          disabled={processLoading}
        >
          {processLoading ? "جاري التشغيل..." : "تشغيل المعالجة"}
        </button>
        <button
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50"
          onClick={loadJobs}
          disabled={jobsLoading}
        >
          {jobsLoading ? "تحديث..." : "تحديث النتائج"}
        </button>
        {message && <div className="text-xs text-gray-600">{message}</div>}
      </div>

      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <div className="text-sm font-semibold mb-2">نتائج آخر 10 مهام</div>
        {jobs.length === 0 && !jobsLoading && (
          <div className="text-xs text-gray-600">لا توجد نتائج بعد</div>
        )}
        <div className="space-y-2">
          {jobs.map((j) => (
            <div key={j.id} className="rounded-lg border bg-white px-3 py-2 text-xs">
              <div className="flex flex-wrap gap-2 text-gray-700">
                <span>النوع: {j.job_type}</span>
                <span>الحالة: {j.status}</span>
                <span>المحاولات: {j.attempts}</span>
                {j.response_status != null && <span>استجابة: {j.response_status}</span>}
              </div>
              {j.last_error && <div className="mt-1 text-rose-600">خطأ: {j.last_error}</div>}
              <div className="mt-1 text-gray-500">فاتورة: {j.invoice_id}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
