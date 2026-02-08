"use client"

import { useEffect, useRef, useState } from "react"
import { getCsrfToken } from "@/lib/csrf-client"

type Customer = { id: string; name: string; vat_number: string | null }

export default function CustomersClient() {
  const [query, setQuery] = useState("")
  const [items, setItems] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState("")
  const [vat, setVat] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editVat, setEditVat] = useState("")
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const [importLoading, setImportLoading] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/customers?q=${encodeURIComponent(query)}`)
    const data = await res.json()
    setItems(data?.customers ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [query])

  async function create() {
    if (!name.trim()) return
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": getCsrfToken(),
      },
      body: JSON.stringify({ name: name.trim(), vat_number: vat || null }),
    })
    if (res.ok) {
      setName("")
      setVat("")
      load()
    }
  }

  async function save() {
    if (!editingId) return
    const res = await fetch(`/api/customers/${editingId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": getCsrfToken(),
      },
      body: JSON.stringify({ name: editName.trim(), vat_number: editVat || null }),
    })
    if (res.ok) {
      setEditingId(null)
      load()
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/customers/${id}`, {
      method: "DELETE",
      headers: { "x-csrf-token": getCsrfToken() },
    })
    if (res.ok) load()
  }

  async function onImport(fileOverride?: File) {
    setImportMessage(null)
    const file = fileOverride ?? fileRef.current?.files?.[0]
    if (!file) {
      fileRef.current?.click()
      return setImportMessage("اختر ملف CSV أولاً")
    }

    const form = new FormData()
    form.append("file", file)

    setImportLoading(true)
    const res = await fetch("/api/customers/import", {
      method: "POST",
      headers: { "x-csrf-token": getCsrfToken() },
      body: form,
    })
    setImportLoading(false)

    if (!res.ok) return setImportMessage(await res.text())
    const data = await res.json()
    setImportMessage(`تم الاستيراد: ${data.created} (تم تخطي ${data.skipped})`)
    load()
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-gray-900">استيراد/تصدير CSV</div>
            <div className="mt-1 text-xs text-gray-500">استورد العملاء بسرعة أو صدّر بياناتك.</div>
          </div>
          <button
            type="button"
            onClick={() => setImportOpen((v) => !v)}
            className="rounded-lg border px-3 py-2 text-xs font-semibold text-gray-900 hover:bg-gray-50"
          >
            {importOpen ? "إغلاق" : "فتح"}
          </button>
        </div>

        {importOpen && (
          <>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <a
                href="/templates/customers-template.csv"
                className="rounded-lg border px-3 py-2 text-xs font-semibold text-gray-900 hover:bg-gray-50"
              >
                تحميل قالب CSV
              </a>
              <a
                href="/api/customers/export"
                className="rounded-lg border px-3 py-2 text-xs font-semibold text-gray-900 hover:bg-gray-50"
              >
                تصدير CSV
              </a>
            </div>

            <div className="mt-4 rounded-xl border border-dashed bg-gray-50/60 p-4">
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  void onImport(e.target.files?.[0] ?? undefined)
                }}
              />

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="rounded-lg bg-black px-4 py-2 text-xs font-semibold text-white hover:opacity-90"
                >
                  {importLoading ? "جارٍ الاستيراد..." : "استيراد CSV"}
                </button>
                <div className="text-xs text-gray-600">اسحب الملف هنا أو اختره</div>
              </div>
            </div>

            <div className="mt-4 grid gap-2 text-xs text-gray-500">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">أعمدة مطلوبة</span>
                <span className="text-gray-600">name</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-700">أعمدة اختيارية</span>
                <span className="text-gray-600">vat_number</span>
              </div>
            </div>

            {importMessage && (
              <div className="mt-3 rounded-lg border bg-gray-50 px-3 py-2 text-xs text-gray-700">
                {importMessage}
              </div>
            )}
          </>
        )}
      </div>

      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="text-sm font-semibold">إضافة عميل</div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <input className="rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="اسم العميل" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="الرقم الضريبي" value={vat} onChange={(e) => setVat(e.target.value)} />
          <button className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90" onClick={create}>إضافة</button>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-semibold">قائمة العملاء</div>
          <input className="rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="بحث عن عميل" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>

        {loading ? (
          <div className="mt-4 text-sm text-gray-500">جاري التحميل...</div>
        ) : items.length === 0 ? (
          <div className="mt-4 text-sm text-gray-500">لا يوجد عملاء</div>
        ) : (
          <div className="mt-4 divide-y">
            {items.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                {editingId === c.id ? (
                  <div className="flex flex-1 flex-wrap items-center gap-2">
                    <input className="rounded-lg border border-gray-200 px-3 py-2 text-sm" value={editName} onChange={(e) => setEditName(e.target.value)} />
                    <input className="rounded-lg border border-gray-200 px-3 py-2 text-sm" value={editVat} onChange={(e) => setEditVat(e.target.value)} />
                  </div>
                ) : (
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">{c.name}</div>
                    <div className="text-xs text-gray-500">{c.vat_number ?? ""}</div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  {editingId === c.id ? (
                    <>
                      <button className="rounded-lg border px-3 py-2 text-xs font-semibold" onClick={save}>حفظ</button>
                      <button className="rounded-lg border px-3 py-2 text-xs font-semibold" onClick={() => setEditingId(null)}>إلغاء</button>
                    </>
                  ) : (
                    <>
                      <button
                        className="rounded-lg border px-3 py-2 text-xs font-semibold"
                        onClick={() => {
                          setEditingId(c.id)
                          setEditName(c.name)
                          setEditVat(c.vat_number ?? "")
                        }}
                      >
                        تعديل
                      </button>
                      <button className="rounded-lg border px-3 py-2 text-xs font-semibold" onClick={() => remove(c.id)}>حذف</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
