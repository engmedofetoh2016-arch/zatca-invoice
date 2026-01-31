import { sha256Hex, randomUuid } from "@/lib/crypto"

function xmlEscape(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

export function buildUblInvoice(input: {
  invoiceNumber: string
  issueDate: string
  sellerName: string
  sellerVat: string
  buyerName?: string | null
  buyerVat?: string | null
  subtotal: number
  vatAmount: number
  total: number
  uuid?: string
  items: Array<{
    description: string
    qty: number
    unitPrice: number
    lineTotal: number
    vatRate: number
    vatAmount: number
  }>
}) {
  const uuid = input.uuid ?? randomUuid()

  const lines = input.items.map((it, i) => {
    return `
      <cac:InvoiceLine>
        <cbc:ID>${i + 1}</cbc:ID>
        <cbc:InvoicedQuantity>${it.qty}</cbc:InvoicedQuantity>
        <cbc:LineExtensionAmount>${it.lineTotal.toFixed(2)}</cbc:LineExtensionAmount>
        <cac:Item>
          <cbc:Description>${xmlEscape(it.description)}</cbc:Description>
        </cac:Item>
        <cac:Price>
          <cbc:PriceAmount>${it.unitPrice.toFixed(2)}</cbc:PriceAmount>
        </cac:Price>
        <cac:TaxTotal>
          <cbc:TaxAmount>${it.vatAmount.toFixed(2)}</cbc:TaxAmount>
          <cac:TaxSubtotal>
            <cbc:TaxableAmount>${it.lineTotal.toFixed(2)}</cbc:TaxableAmount>
            <cbc:TaxAmount>${it.vatAmount.toFixed(2)}</cbc:TaxAmount>
            <cac:TaxCategory>
              <cbc:Percent>${(it.vatRate * 100).toFixed(2)}</cbc:Percent>
              <cac:TaxScheme>
                <cbc:ID>VAT</cbc:ID>
              </cac:TaxScheme>
            </cac:TaxCategory>
          </cac:TaxSubtotal>
        </cac:TaxTotal>
      </cac:InvoiceLine>
    `
  }).join("\n")

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:ID>${xmlEscape(input.invoiceNumber)}</cbc:ID>
  <cbc:UUID>${uuid}</cbc:UUID>
  <cbc:IssueDate>${xmlEscape(input.issueDate)}</cbc:IssueDate>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyName><cbc:Name>${xmlEscape(input.sellerName)}</cbc:Name></cac:PartyName>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${xmlEscape(input.sellerVat)}</cbc:CompanyID>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyName><cbc:Name>${xmlEscape(input.buyerName ?? "-")}</cbc:Name></cac:PartyName>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${xmlEscape(input.buyerVat ?? "-")}</cbc:CompanyID>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount>${input.subtotal.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount>${input.subtotal.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount>${input.total.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount>${input.total.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  <cac:TaxTotal>
    <cbc:TaxAmount>${input.vatAmount.toFixed(2)}</cbc:TaxAmount>
  </cac:TaxTotal>
  ${lines}
</Invoice>`

  return { xml, uuid }
}

export function hashInvoiceXml(xml: string) {
  return sha256Hex(xml)
}
