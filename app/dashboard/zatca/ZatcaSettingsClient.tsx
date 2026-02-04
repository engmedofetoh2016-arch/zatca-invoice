"use client"

import { useState } from "react"
import { getCsrfToken } from "@/lib/csrf-client"

type Props = {
  initial: { environment: string | null; csid: string | null; pcsid: string | null; certificate_pem: string | null } | null
}

export default function ZatcaSettingsClient({ initial }: Props) {
  const [environment, setEnvironment] = useState(initial?.environment ?? "sandbox")
  const [csid, setCsid] = useState(initial?.csid ?? "")
  const [pcsid, setPcsid] = useState(initial?.pcsid ?? "")
  const [certificate, setCertificate] = useState(initial?.certificate_pem ?? "")
  const [message, setMessage] = useState<string | null>(null)

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

      <div className="flex items-center gap-3">
        <button className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90" onClick={save}>
          حفظ الإعدادات
        </button>
        {message && <div className="text-xs text-gray-600">{message}</div>}
      </div>
    </div>
  )
}
