"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type Item = { description: string; qty: number; unitPrice: number }

export default function NewInvoicePage() {
  const router = useRouter()
  const [invoiceNumber, setInvoiceNumber] = useState("INV-0001")
  const [customerName, setCustomerName] = useState("")
  const [customerVat, setCustomerVat] = useState("")
  const [items, setItems] = useState<Item[]>([{ description: "", qty: 1, unitPrice: 0 }])
  const [loading, setLoading] = useState(false)

  const subtotal = items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.unitPrice) || 0), 0)
  const vat = +(subtotal * 0.15).toFixed(2)
  const total = +(subtotal + vat).toFixed(2)

  function updateItem(i: number, patch: Partial<Item>) {
    setItems(prev => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)))
  }

  function addItem() {
    setItems(prev => [...prev, { description: "", qty: 1, unitPrice: 0 }])
  }

  function removeItem(i: number) {
    setItems(prev => prev.filter((_, idx) => idx !== i))
  }

  async function submit() {
    setLoading(true)
    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        invoiceNumber,
        customerName: customerName || null,
        customerVat: customerVat || null,
        items,
      }),
    })
    setLoading(false)

    if (!res.ok) return alert(await res.text())
    const data = await res.json()
    router.push(`/invoices/${data.invoiceId}`)
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-xl">فاتورة جديدة</h1>

      <div className="grid gap-3">
        <input className="border p-2" value={invoiceNumber} onChange={e=>setInvoiceNumber(e.target.value)} placeholder="رقم الفاتورة" />
        <input className="border p-2" value={customerName} onChange={e=>setCustomerName(e.target.value)} placeholder="اسم العميل (اختياري)" />
        <input className="border p-2" value={customerVat} onChange={e=>setCustomerVat(e.target.value)} placeholder="الرقم الضريبي للعميل (اختياري)" />
      </div>

      <div className="space-y-3">
        <div className="font-medium">بنود الفاتورة</div>
        {items.map((it, i) => (
          <div key={i} className="grid grid-cols-12 gap-2">
            <input
              className="border p-2 col-span-6"
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
              className="border p-2 col-span-3"
              type="number"
              placeholder="سعر الوحدة"
              value={it.unitPrice}
              onChange={e=>updateItem(i, { unitPrice: Number(e.target.value) })}
            />
            <button className="border col-span-1" onClick={()=>removeItem(i)} type="button">✕</button>
          </div>
        ))}
        <button className="border p-2" type="button" onClick={addItem}>+ إضافة بند</button>
      </div>

      <div className="border p-3 space-y-1">
        <div>الإجمالي قبل الضريبة: {subtotal.toFixed(2)} SAR</div>
        <div>الضريبة (15%): {vat.toFixed(2)} SAR</div>
        <div className="font-bold">الإجمالي: {total.toFixed(2)} SAR</div>
      </div>

      <button className="bg-black text-white w-full p-2" disabled={loading} onClick={submit}>
        {loading ? "..." : "حفظ الفاتورة"}
      </button>
    </div>
  )
}
