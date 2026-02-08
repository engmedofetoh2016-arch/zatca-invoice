"use client"

import { useEffect, useRef, useState } from "react"
import { getCsrfToken } from "@/lib/csrf-client"

type Unit = { code: string; name_ar: string; name_en: string }
type Product = {
  id: string
  name: string
  sku: string | null
  unit_code: string | null
  default_unit_price: number
  vat_category: string | null
  vat_rate: number
}

export default function ProductsClient() {
  const [query, setQuery] = useState("")
  const [items, setItems] = useState<Product[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState("")
  const [sku, setSku] = useState("")
  const [unitCode, setUnitCode] = useState("")
  const [price, setPrice] = useState<number>(0)
  const [vatCategory, setVatCategory] = useState("standard")
  const [vatRate, setVatRate] = useState<number>(0.15)
  const [editing, setEditing] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editSku, setEditSku] = useState("")
  const [editUnit, setEditUnit] = useState("")
  const [editPrice, setEditPrice] = useState<number>(0)
  const [editVatCategory, setEditVatCategory] = useState("standard")
  const [editVatRate, setEditVatRate] = useState<number>(0.15)
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const [importLoading, setImportLoading] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/products?q=${encodeURIComponent(query)}`)
    const data = await res.json().catch(() => ({}))
    setItems(data?.products ?? [])
    setLoading(false)
  }

  async function loadUnits() {
    const res = await fetch("/api/units")
    const data = await res.json().catch(() => ({}))
    setUnits(data?.units ?? [])
  }

  useEffect(() => {
    load()
  }, [query])

  useEffect(() => {
    loadUnits()
  }, [])

  async function create() {
    if (!name.trim()) return
    const res = await fetch("/api/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": getCsrfToken(),
      },
      body: JSON.stringify({
        name: name.trim(),
        sku: sku.trim() || null,
        unit_code: unitCode || null,
        default_unit_price: Number(price || 0),
        vat_category: vatCategory,
        vat_rate: Number(vatRate || 0),
      }),
    })
    if (res.ok) {
      setName("")
      setSku("")
      setUnitCode("")
      setPrice(0)
      setVatCategory("standard")
      setVatRate(0.15)
      load()
    }
  }

  async function save() {
    if (!editing) return
    const res = await fetch(`/api/products/${editing}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": getCsrfToken(),
      },
      body: JSON.stringify({
        name: editName.trim(),
        sku: editSku.trim() || null,
        unit_code: editUnit || null,
        default_unit_price: Number(editPrice || 0),
        vat_category: editVatCategory,
        vat_rate: Number(editVatRate || 0),
      }),
    })
    if (res.ok) {
      setEditing(null)
      load()
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/products/${id}`, {
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
    const res = await fetch("/api/products/import", {
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
            <div className="mt-1 text-xs text-gray-500">استورد المنتجات بسرعة أو صدّر بياناتك.</div>
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
                href="/templates/products-template.csv"
                className="rounded-lg border px-3 py-2 text-xs font-semibold text-gray-900 hover:bg-gray-50"
              >
                تحميل قالب CSV
              </a>
              <a
                href="/api/products/export"
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
                <span className="text-gray-600">sku, unit_code, default_unit_price, vat_category, vat_rate</span>
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
        <div className="text-sm font-semibold">إضافة منتج</div>
        <div className="mt-4 grid gap-3 md:grid-cols-6">
          <input className="rounded-lg border border-gray-200 px-3 py-2 text-sm md:col-span-2" placeholder="اسم المنتج" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="SKU" value={sku} onChange={(e) => setSku(e.target.value)} />
          <select className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm" value={unitCode} onChange={(e) => setUnitCode(e.target.value)}>
            <option value="">الوحدة</option>
            {units.map((u) => (
              <option key={u.code} value={u.code}>
                {u.name_ar} ({u.code})
              </option>
            ))}
          </select>
          <input className="rounded-lg border border-gray-200 px-3 py-2 text-sm" type="number" placeholder="السعر الافتراضي" value={price} onChange={(e) => setPrice(Number(e.target.value))} />
          <select
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            value={vatCategory}
            onChange={(e) => {
              const next = e.target.value
              setVatCategory(next)
              setVatRate(next === "standard" ? 0.15 : 0)
            }}
          >
            <option value="standard">قياسي</option>
            <option value="zero">صفرية</option>
            <option value="exempt">معفى</option>
            <option value="outofscope">خارج النطاق</option>
          </select>
          <input className="rounded-lg border border-gray-200 px-3 py-2 text-sm" type="number" step="0.01" placeholder="VAT %" value={(Number(vatRate) * 100).toString()} onChange={(e) => setVatRate(Number(e.target.value) / 100)} />
          <button className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90 md:col-span-1" onClick={create}>إضافة</button>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-semibold">قائمة المنتجات</div>
          <input className="rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="بحث" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>

        {loading ? (
          <div className="mt-4 text-sm text-gray-500">جاري التحميل...</div>
        ) : items.length === 0 ? (
          <div className="mt-4 text-sm text-gray-500">لا توجد منتجات</div>
        ) : (
          <div className="mt-4 divide-y">
            {items.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                {editing === p.id ? (
                  <div className="flex flex-1 flex-wrap items-center gap-2">
                    <input className="rounded-lg border border-gray-200 px-3 py-2 text-sm" value={editName} onChange={(e) => setEditName(e.target.value)} />
                    <input className="rounded-lg border border-gray-200 px-3 py-2 text-sm" value={editSku} onChange={(e) => setEditSku(e.target.value)} />
                    <select className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm" value={editUnit} onChange={(e) => setEditUnit(e.target.value)}>
                      <option value="">الوحدة</option>
                      {units.map((u) => (
                        <option key={u.code} value={u.code}>
                          {u.name_ar} ({u.code})
                        </option>
                      ))}
                    </select>
                    <input className="rounded-lg border border-gray-200 px-3 py-2 text-sm" type="number" value={editPrice} onChange={(e) => setEditPrice(Number(e.target.value))} />
                    <select
                      className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                      value={editVatCategory}
                      onChange={(e) => {
                        const next = e.target.value
                        setEditVatCategory(next)
                        setEditVatRate(next === "standard" ? 0.15 : 0)
                      }}
                    >
                      <option value="standard">قياسي</option>
                      <option value="zero">صفرية</option>
                      <option value="exempt">معفى</option>
                      <option value="outofscope">خارج النطاق</option>
                    </select>
                    <input className="rounded-lg border border-gray-200 px-3 py-2 text-sm" type="number" step="0.01" value={(Number(editVatRate) * 100).toString()} onChange={(e) => setEditVatRate(Number(e.target.value) / 100)} />
                  </div>
                ) : (
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">{p.name}</div>
                    <div className="text-xs text-gray-500">
                      {p.sku ? `SKU: ${p.sku} • ` : ""}الوحدة: {p.unit_code ?? "-"} • VAT: {(Number(p.vat_rate) * 100).toFixed(0)}% • {p.vat_category ?? "standard"}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  {editing === p.id ? (
                    <>
                      <button className="rounded-lg border px-3 py-2 text-xs font-semibold" onClick={save}>حفظ</button>
                      <button className="rounded-lg border px-3 py-2 text-xs font-semibold" onClick={() => setEditing(null)}>إلغاء</button>
                    </>
                  ) : (
                    <>
                      <button
                        className="rounded-lg border px-3 py-2 text-xs font-semibold"
                        onClick={() => {
                          setEditing(p.id)
                          setEditName(p.name)
                          setEditSku(p.sku ?? "")
                          setEditUnit(p.unit_code ?? "")
                          setEditPrice(Number(p.default_unit_price ?? 0))
                          setEditVatCategory(p.vat_category ?? "standard")
                          setEditVatRate(Number(p.vat_rate ?? 0.15))
                        }}
                      >
                        تعديل
                      </button>
                      <button className="rounded-lg border px-3 py-2 text-xs font-semibold" onClick={() => remove(p.id)}>حذف</button>
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
