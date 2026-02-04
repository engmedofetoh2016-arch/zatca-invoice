"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { getCsrfToken } from "@/lib/csrf-client"

type Item = { description: string; qty: number; unitPrice: number; vatRate: number; vatExemptReason?: string }

type InvoiceType = "invoice" | "credit" | "debit"

export default function NewInvoicePage() {
  const router = useRouter()
  const sp = useSearchParams()

  const initialType = (sp.get("type") as InvoiceType) || "invoice"
  const initialOriginal = sp.get("original") || ""

  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [nextNumber, setNextNumber] = useState<string>("")
  const [customerName, setCustomerName] = useState("")
  const [customerVat, setCustomerVat] = useState("")
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [invoiceType, setInvoiceType] = useState<InvoiceType>(
    initialType === "credit" || initialType === "debit" ? initialType : "invoice"
  )
  const [originalInvoiceId, setOriginalInvoiceId] = useState(initialOriginal)
  const [noteReason, setNoteReason] = useState("")
  const [customerQuery, setCustomerQuery] = useState("")
  const [customerResults, setCustomerResults] = useState<Array<{ id: string; name: string; vat_number?: string | null }>>([])
  const [customerOpen, setCustomerOpen] = useState(false)
  const [customerLoading, setCustomerLoading] = useState(false)
  const [items, setItems] = useState<Item[]>([
    { description: "", qty: 1, unitPrice: 0, vatRate: 0.15 },
  ])
  const [loading, setLoading] = useState(false)

  const subtotal = useMemo(
    () => items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.unitPrice) || 0), 0),
    [items]
  )
  const vat = useMemo(
    () => items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.unitPrice) || 0) * (Number(it.vatRate) || 0), 0),
    [items]
  )
  const total = +(subtotal + vat).toFixed(2)
  const signedTotal = invoiceType === "credit" ? -total : total

  useEffect(() => {
    let cancelled = false
    async function loadNext() {
      const res = await fetch("/api/invoices/next-number")
      if (!res.ok) return
      const data = await res.json()
      if (!cancelled) setNextNumber(String(data?.next ?? ""))
    }
    loadNext()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function loadCustomers() {
      setCustomerLoading(true)
      const res = await fetch(`/api/customers?q=${encodeURIComponent(customerQuery)}`)
      if (res.ok) {
        const data = await res.json()
        if (!cancelled) setCustomerResults(data?.customers ?? [])
      }
      if (!cancelled) setCustomerLoading(false)
    }
    loadCustomers()
    return () => {
      cancelled = true
    }
  }, [customerQuery])

  function updateItem(i: number, patch: Partial<Item>) {
    setItems(prev => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)))
  }

  function addItem() {
    setItems(prev => [...prev, { description: "", qty: 1, unitPrice: 0, vatRate: 0.15 }])
  }

  function removeItem(i: number) {
    setItems(prev => prev.filter((_, idx) => idx !== i))
  }

  async function submit(status: "issued" | "draft") {
    setLoading(true)
    const cleanedItems = items
      .map((it) => ({
        description: String(it.description ?? "").trim(),
        qty: Number(it.qty),
        unitPrice: Number(it.unitPrice),
        vatRate: Number(it.vatRate ?? 0.15),
        vatExemptReason: it.vatExemptReason ? String(it.vatExemptReason).trim() : undefined,
      }))
      .filter((it) => it.description)

    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": getCsrfToken(),
      },
      body: JSON.stringify({
        invoiceNumber,
        customerId,
        customerName: customerName || null,
        customerVat: customerVat || null,
        invoiceType,
        originalInvoiceId: originalInvoiceId || null,
        noteReason: noteReason || null,
        items: cleanedItems,
        status,
      }),
    })
    setLoading(false)

    if (!res.ok) return alert(await res.text())
    const data = await res.json()
    router.push(`/dashboard/invoices/${data.invoiceId}`)
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <div className="text-xs text-gray-500">إنشاء فاتورة</div>
        <h1 className="mt-2 text-2xl font-semibold">فاتورة جديدة</h1>
        <p className="mt-1 text-sm text-gray-600">أدخل بيانات الفاتورة وبنودها.</p>
      </div>

      <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs text-gray-500">رقم الفاتورة</label>
            <input
              className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700"
              value={nextNumber ? `تلقائي: ${nextNumber}` : "تلقائي"}
              onChange={() => {}}
              disabled
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">نوع الفاتورة</label>
            <select className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800" value={invoiceType} onChange={e=>setInvoiceType(e.target.value as InvoiceType)}>
              <option value="invoice">فاتورة</option>
              <option value="credit">إشعار دائن</option>
              <option value="debit">إشعار مدين</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500">اسم العميل (اختياري)</label>
            <div className="relative">
              <input
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value)
                  setCustomerId(null)
                  setCustomerQuery(e.target.value)
                  setCustomerOpen(true)
                }}
                onFocus={() => setCustomerOpen(true)}
                placeholder="ابحث عن عميل أو اكتب اسماً جديداً"
              />
              {customerOpen && (
                <div className="absolute z-20 mt-1 w-full rounded-lg border bg-white shadow-sm">
                  <div className="max-h-48 overflow-auto">
                    {customerLoading && (
                      <div className="px-3 py-2 text-xs text-gray-500">جاري البحث...</div>
                    )}
                    {!customerLoading && customerResults.length === 0 && (
                      <div className="px-3 py-2 text-xs text-gray-500">
                        {customerQuery ? "لا يوجد عملاء مطابقون" : "ابدأ بالبحث"}
                      </div>
                    )}
                    {customerResults.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className="flex w-full items-center justify-between px-3 py-2 text-xs hover:bg-gray-50"
                        onClick={() => {
                          setCustomerName(c.name)
                          setCustomerVat(c.vat_number ?? "")
                          setCustomerId(c.id)
                          setCustomerOpen(false)
                        }}
                      >
                        <span className="font-semibold text-gray-800">{c.name}</span>
                        <span className="text-gray-500">{c.vat_number ?? ""}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500">الرقم الضريبي للعميل (اختياري)</label>
            <input className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={customerVat} onChange={e=>setCustomerVat(e.target.value)} placeholder="الرقم الضريبي" />
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-gray-50"
            onClick={async () => {
              if (!customerName.trim()) return
              const res = await fetch("/api/customers", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "x-csrf-token": getCsrfToken(),
                },
                body: JSON.stringify({ name: customerName.trim(), vat_number: customerVat || null }),
              })
              if (res.ok) {
                const data = await res.json()
                setCustomerId(data?.customer?.id ?? null)
                setCustomerQuery(customerName.trim())
              }
            }}
          >
            حفظ كعميل جديد
          </button>
          <button
            type="button"
            className="rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-gray-50"
            onClick={() => setCustomerOpen(false)}
          >
            إغلاق البحث
          </button>
        </div>

        {(invoiceType === "credit" || invoiceType === "debit") && (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs text-gray-500">معرّف الفاتورة الأصلية</label>
              <input className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={originalInvoiceId} onChange={e=>setOriginalInvoiceId(e.target.value)} placeholder="UUID أو رقم الفاتورة" />
            </div>
            <div>
              <label className="text-xs text-gray-500">سبب الإشعار (اختياري)</label>
              <input className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={noteReason} onChange={e=>setNoteReason(e.target.value)} placeholder="سبب الإشعار" />
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-3">
        <div className="font-semibold">بنود الفاتورة</div>
        {items.map((it, i) => (
          <div key={i} className="grid grid-cols-12 gap-2">
            <input
              className="col-span-12 rounded-lg border border-gray-200 px-3 py-2 text-sm md:col-span-4"
              placeholder="الوصف"
              value={it.description}
              onChange={e=>updateItem(i, { description: e.target.value })}
            />
            <input
              className="col-span-6 rounded-lg border border-gray-200 px-3 py-2 text-sm md:col-span-2"
              type="number"
              placeholder="الكمية"
              value={it.qty}
              onChange={e=>updateItem(i, { qty: Number(e.target.value) })}
            />
            <input
              className="col-span-6 rounded-lg border border-gray-200 px-3 py-2 text-sm md:col-span-2"
              type="number"
              placeholder="سعر الوحدة"
              value={it.unitPrice}
              onChange={e=>updateItem(i, { unitPrice: Number(e.target.value) })}
            />
            <input
              className="col-span-6 rounded-lg border border-gray-200 px-3 py-2 text-sm md:col-span-2"
              type="number"
              step="0.01"
              placeholder="VAT %"
              value={(Number(it.vatRate) * 100).toString()}
              onChange={e=>updateItem(i, { vatRate: Number(e.target.value) / 100 })}
            />
            <button className="col-span-6 rounded-lg border px-3 text-xs font-semibold hover:bg-gray-50 md:col-span-1" onClick={()=>removeItem(i)} type="button">حذف</button>
            <input
              className="col-span-12 rounded-lg border border-gray-200 px-3 py-2 text-sm"
              placeholder="سبب الإعفاء (اختياري عند 0%)"
              value={it.vatExemptReason ?? ""}
              onChange={e=>updateItem(i, { vatExemptReason: e.target.value })}
            />
          </div>
        ))}
        <button className="rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-gray-50" type="button" onClick={addItem}>
          + إضافة بند
        </button>
      </div>

      <div className="rounded-2xl border bg-white p-5 shadow-sm space-y-1 text-sm">
        <div>الإجمالي قبل الضريبة: {subtotal.toFixed(2)} SAR</div>
        <div>الضريبة: {vat.toFixed(2)} SAR</div>
        <div className="font-bold">الإجمالي: {signedTotal.toFixed(2)} SAR</div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          disabled={loading}
          onClick={() => submit("issued")}
        >
          {loading ? "..." : "إصدار الفاتورة"}
        </button>
        <button
          className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-gray-50"
          disabled={loading}
          onClick={() => submit("draft")}
        >
          حفظ كمسودة
        </button>
      </div>
    </div>
  )
}
