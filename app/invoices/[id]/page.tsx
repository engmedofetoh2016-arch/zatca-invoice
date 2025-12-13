export const dynamic = "force-dynamic"

import Link from "next/link"
import { pool } from "@/lib/db"

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const inv = await pool.query(`SELECT * FROM invoices WHERE id = $1`, [id])
  if (!inv.rows[0]) return <div className="p-6">Invoice not found</div>

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-3">
      <h1 className="text-xl">فاتورة {inv.rows[0].invoice_number}</h1>

      <div className="border p-3 space-y-1">
        <div>Subtotal: {inv.rows[0].subtotal}</div>
        <div>VAT: {inv.rows[0].vat_amount}</div>
        <div>Total: {inv.rows[0].total}</div>
      </div>

      <Link className="inline-block bg-black text-white px-4 py-2" href={`/api/invoices/${id}/pdf`}>
        تحميل PDF
      </Link>

      <Link className="inline-block border px-4 py-2" href="/invoices/new">
        فاتورة جديدة
      </Link>
    </div>
  )
}
