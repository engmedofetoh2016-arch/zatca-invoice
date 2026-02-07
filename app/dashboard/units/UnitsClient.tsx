"use client"

import { useEffect, useState } from "react"
import { getCsrfToken } from "@/lib/csrf-client"

type Unit = { code: string; name_en: string; name_ar: string }

export default function UnitsClient() {
  const [query, setQuery] = useState("")
  const [items, setItems] = useState<Unit[]>([])
  const [loading, setLoading] = useState(false)
  const [code, setCode] = useState("")
  const [nameAr, setNameAr] = useState("")
  const [nameEn, setNameEn] = useState("")
  const [editing, setEditing] = useState<string | null>(null)
  const [editAr, setEditAr] = useState("")
  const [editEn, setEditEn] = useState("")

  async function load() {
    setLoading(true)
    const res = await fetch("/api/units")
    const data = await res.json().catch(() => ({}))
    const rows = Array.isArray(data?.units) ? data.units : []
    const filtered = query
      ? rows.filter((u: Unit) =>
          [u.code, u.name_ar, u.name_en].some((v) =>
            String(v ?? "").toLowerCase().includes(query.toLowerCase())
          )
        )
      : rows
    setItems(filtered)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [query])

  async function create() {
    if (!code.trim() || !nameAr.trim() || !nameEn.trim()) return
    const res = await fetch("/api/units", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": getCsrfToken(),
      },
      body: JSON.stringify({
        code: code.trim().toUpperCase(),
        name_ar: nameAr.trim(),
        name_en: nameEn.trim(),
      }),
    })
    if (res.ok) {
      setCode("")
      setNameAr("")
      setNameEn("")
      load()
    }
  }

  async function save() {
    if (!editing) return
    const res = await fetch(`/api/units/${editing}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": getCsrfToken(),
      },
      body: JSON.stringify({ name_ar: editAr.trim(), name_en: editEn.trim() }),
    })
    if (res.ok) {
      setEditing(null)
      load()
    }
  }

  async function remove(codeToDelete: string) {
    const res = await fetch(`/api/units/${codeToDelete}`, {
      method: "DELETE",
      headers: { "x-csrf-token": getCsrfToken() },
    })
    if (res.ok) load()
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="text-sm font-semibold">إضافة وحدة</div>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <input className="rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="رمز الوحدة (EA)" value={code} onChange={(e) => setCode(e.target.value)} />
          <input className="rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="الاسم بالعربية" value={nameAr} onChange={(e) => setNameAr(e.target.value)} />
          <input className="rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="الاسم بالإنجليزية" value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
          <button className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90" onClick={create}>إضافة</button>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-semibold">قائمة الوحدات</div>
          <input className="rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="بحث" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>

        {loading ? (
          <div className="mt-4 text-sm text-gray-500">جاري التحميل...</div>
        ) : items.length === 0 ? (
          <div className="mt-4 text-sm text-gray-500">لا توجد وحدات</div>
        ) : (
          <div className="mt-4 divide-y">
            {items.map((u) => (
              <div key={u.code} className="flex flex-wrap items-center justify-between gap-3 py-3">
                {editing === u.code ? (
                  <div className="flex flex-1 flex-wrap items-center gap-2">
                    <div className="text-xs text-gray-500">{u.code}</div>
                    <input className="rounded-lg border border-gray-200 px-3 py-2 text-sm" value={editAr} onChange={(e) => setEditAr(e.target.value)} />
                    <input className="rounded-lg border border-gray-200 px-3 py-2 text-sm" value={editEn} onChange={(e) => setEditEn(e.target.value)} />
                  </div>
                ) : (
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">{u.name_ar} ({u.code})</div>
                    <div className="text-xs text-gray-500">{u.name_en}</div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  {editing === u.code ? (
                    <>
                      <button className="rounded-lg border px-3 py-2 text-xs font-semibold" onClick={save}>حفظ</button>
                      <button className="rounded-lg border px-3 py-2 text-xs font-semibold" onClick={() => setEditing(null)}>إلغاء</button>
                    </>
                  ) : (
                    <>
                      <button
                        className="rounded-lg border px-3 py-2 text-xs font-semibold"
                        onClick={() => {
                          setEditing(u.code)
                          setEditAr(u.name_ar)
                          setEditEn(u.name_en)
                        }}
                      >
                        تعديل
                      </button>
                      <button className="rounded-lg border px-3 py-2 text-xs font-semibold" onClick={() => remove(u.code)}>حذف</button>
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
