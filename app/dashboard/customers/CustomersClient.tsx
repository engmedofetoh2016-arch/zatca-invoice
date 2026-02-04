"use client"

import { useEffect, useState } from "react"
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

  return (
    <div className="space-y-6">
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
