"use client"

import { useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { getCsrfToken } from "@/lib/csrf-client"

type Item = { description: string; qty: number; unitPrice: number; vatRate: number; vatExemptReason?: string }

type InvoiceType = "invoice" | "credit" | "debit"

export default function NewInvoicePage() {
  const router = useRouter()
  const sp = useSearchParams()

  const initialType = (sp.get("type") as InvoiceType) || "invoice"
  const initialOriginal = sp.get("original") || ""

  const [invoiceNumber, setInvoiceNumber] = useState("INV-0001")
  const [customerName, setCustomerName] = useState("")
  const [customerVat, setCustomerVat] = useState("")
  const [invoiceType, setInvoiceType] = useState<InvoiceType>(
    initialType === "credit" || initialType === "debit" ? initialType : "invoice"
  )
  const [originalInvoiceId, setOriginalInvoiceId] = useState(initialOriginal)
  const [noteReason, setNoteReason] = useState("")
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
    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": getCsrfToken(),
      },
      body: JSON.stringify({
        invoiceNumber,
        customerName: customerName || null,
        customerVat: customerVat || null,
        invoiceType,
        originalInvoiceId: originalInvoiceId || null,
        noteReason: noteReason || null,
        items,
        status,
      }),
    })
    setLoading(false)

    if (!res.ok) return alert(await res.text())
    const data = await res.json()
    router.push(`/dashboard/invoices/${data.invoiceId}`)
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-xl">فاتورة جديدة</h1>

      <div className="grid gap-3">
        <input className="border p-2" value={invoiceNumber} onChange={e=>setInvoiceNumber(e.target.value)} placeholder="رقم الفاتورة" />
        <input className="border p-2" value={customerName} onChange={e=>setCustomerName(e.target.value)} placeholder="اسم العميل (اختياري)" />
        <input className="border p-2" value={customerVat} onChange={e=>setCustomerVat(e.target.value)} placeholder="الرقم الضريبي للعميل (اختياري)" />

        <select className="border p-2" value={invoiceType} onChange={e=>setInvoiceType(e.target.value as InvoiceType)}>
          <option value="invoice">فاتورة</option>
          <option value="credit">إشعار دائن</option>
          <option value="debit">إشعار مدين</option>
        </select>

        {(invoiceType === "credit" || invoiceType === "debit") && (
          <>
            <input className="border p-2" value={originalInvoiceId} onChange={e=>setOriginalInvoiceId(e.target.value)} placeholder="معرّف الفاتورة الأصلية" />
            <input className="border p-2" value={noteReason} onChange={e=>setNoteReason(e.target.value)} placeholder="سبب الإشعار (اختياري)" />
          </>
        )}
      </div>

      <div className="space-y-3">
        <div className="font-medium">بنود الفاتورة</div>
        {items.map((it, i) => (
          <div key={i} className="grid grid-cols-12 gap-2">
            <input
              className="border p-2 col-span-4"
              placeholder="الوصف"
              value={it.description}
              onChange={e=>updateItem(i, { description: e.target.value })}
            />
            <input
              className="border p-2 col-span-2"
              type="number"
              placeholder="الكمية"
              value={it.qty}
              onChange={e=>updateItem(i, { qty: Number(e.target.value) })}
            />
            <input
              className="border p-2 col-span-2"
              type="number"
              placeholder="سعر الوحدة"
              value={it.unitPrice}
              onChange={e=>updateItem(i, { unitPrice: Number(e.target.value) })}
            />
            <input
              className="border p-2 col-span-2"
              type="number"
              step="0.01"
              placeholder="VAT %"
              value={(Number(it.vatRate) * 100).toString()}
              onChange={e=>updateItem(i, { vatRate: Number(e.target.value) / 100 })}
            />
            <button className="border col-span-1" onClick={()=>removeItem(i)} type="button">✖</button>
            <input
              className="border p-2 col-span-12"
              placeholder="سبب الإعفاء (اختياري عند 0%)"
              value={it.vatExemptReason ?? ""}
              onChange={e=>updateItem(i, { vatExemptReason: e.target.value })}
            />
          </div>
        ))}
        <button className="border p-2" type="button" onClick={addItem}>+ إضافة بند</button>
      </div>

      <div className="border p-3 space-y-1">
        <div>الإجمالي قبل الضريبة: {subtotal.toFixed(2)} SAR</div>
        <div>الضريبة: {vat.toFixed(2)} SAR</div>
        <div className="font-bold">الإجمالي: {signedTotal.toFixed(2)} SAR</div>
      </div>

      <div className="flex gap-2">
        <button
          className="bg-black text-white w-full p-2"
          disabled={loading}
          onClick={() => submit("issued")}
        >
          {loading ? "..." : "إصدار الفاتورة"}
        </button>
        <button
          className="border w-full p-2"
          disabled={loading}
          onClick={() => submit("draft")}
        >
          حفظ كمسودة
        </button>
      </div>
    </div>
  )
}
