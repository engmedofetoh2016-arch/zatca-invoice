type ItemInput = {
  description: unknown
  qty: unknown
  unitPrice: unknown
  vatRate?: unknown
  vatExemptReason?: unknown
  unitCode?: unknown
  vatCategory?: unknown
}

const allowedVatCategories = new Set(["standard", "zero", "exempt", "outofscope"])

export function validateInvoiceInput(body: {
  invoiceNumber?: unknown
  customerName?: unknown
  customerVat?: unknown
  items?: unknown
  invoiceType?: unknown
  originalInvoiceId?: unknown
  noteReason?: unknown
}, options?: { allowEmptyItems?: boolean }) {
  const errors: string[] = []
  const allowEmptyItems = options?.allowEmptyItems ?? false

  const invoiceNumber = String(body.invoiceNumber ?? "").trim()
  if (invoiceNumber && invoiceNumber.length > 50) errors.push("invoiceNumber is too long")

  const customerNameRaw = body.customerName ?? null
  const customerName = customerNameRaw ? String(customerNameRaw).trim() : null
  if (customerName && customerName.length > 200) errors.push("customerName is too long")

  const customerVatRaw = body.customerVat ?? null
  const customerVat = customerVatRaw ? String(customerVatRaw).trim() : null
  // Allow any customer VAT value; validation removed per request

  const itemsInput = Array.isArray(body.items) ? (body.items as ItemInput[]) : []
  if (!allowEmptyItems && itemsInput.length === 0) errors.push("items is required")
  if (itemsInput.length > 200) errors.push("items is too long")

  const items = itemsInput
    .map((it) => {
      const description = String(it.description ?? "").trim()
      const qty = Number(it.qty)
      const unitPrice = Number(it.unitPrice)
      const vatRateRaw = it.vatRate ?? 0.15
      const vatRate = Number(vatRateRaw)
      const vatExemptReason = it.vatExemptReason ? String(it.vatExemptReason).trim() : null
      const unitCodeRaw = it.unitCode ? String(it.unitCode).trim() : null
      const unitCode = unitCodeRaw && unitCodeRaw.length > 10 ? unitCodeRaw.slice(0, 10) : unitCodeRaw
      const vatCategoryRaw = it.vatCategory ? String(it.vatCategory).trim().toLowerCase() : null
      const vatCategory = vatCategoryRaw && allowedVatCategories.has(vatCategoryRaw) ? vatCategoryRaw : null
      const lineErrors: string[] = []

      if (!description) lineErrors.push("description is required")
      if (description.length > 200) lineErrors.push("description is too long")
      if (!Number.isFinite(qty) || qty <= 0) lineErrors.push("qty must be > 0")
      if (qty > 100000) lineErrors.push("qty is too large")
      if (!Number.isFinite(unitPrice) || unitPrice < 0) lineErrors.push("unitPrice must be >= 0")
      if (unitPrice > 1_000_000_000) lineErrors.push("unitPrice is too large")
      if (!Number.isFinite(vatRate) || vatRate < 0 || vatRate > 1) lineErrors.push("vatRate must be between 0 and 1")
      if (unitCode && unitCode.length > 10) lineErrors.push("unitCode is too long")
      if (vatCategoryRaw && !allowedVatCategories.has(vatCategoryRaw)) lineErrors.push("vatCategory is invalid")
      if (vatRate === 0 && vatExemptReason && vatExemptReason.length > 200) lineErrors.push("vatExemptReason is too long")

      return {
        description,
        qty,
        unitPrice,
        vatRate,
        vatExemptReason,
        unitCode,
        vatCategory,
        lineErrors,
      }
    })
    .filter((it) => it.description || it.qty || it.unitPrice || it.lineErrors.length > 0)

  if (!allowEmptyItems || items.length > 0) {
    items.forEach((it, i) => {
      if (it.lineErrors.length > 0) {
        errors.push(`items[${i}]: ${it.lineErrors.join(", ")}`)
      }
    })
  }

  return {
    ok: errors.length === 0,
    errors,
    invoiceNumber,
    customerName,
    customerVat,
    invoiceType: String(body.invoiceType ?? "invoice").trim(),
    originalInvoiceId: body.originalInvoiceId ? String(body.originalInvoiceId).trim() : null,
    noteReason: body.noteReason ? String(body.noteReason).trim() : null,
    items: items.map((it) => ({
      description: it.description,
      qty: it.qty,
      unitPrice: it.unitPrice,
      vatRate: it.vatRate,
      vatExemptReason: it.vatExemptReason,
      unitCode: it.unitCode,
      vatCategory: it.vatCategory,
    })),
  }
}
