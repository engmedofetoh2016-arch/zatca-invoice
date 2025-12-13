import QRCode from "qrcode"

function toTLV(tag: number, value: string) {
  const buf = Buffer.from(value, "utf8")
  return Buffer.concat([Buffer.from([tag]), Buffer.from([buf.length]), buf])
}

export async function zatcaQrDataUrl(input: {
  sellerName: string
  vatNumber: string
  timestampISO: string
  total: string
  vatAmount: string
}) {
  const tlv = Buffer.concat([
    toTLV(1, input.sellerName),
    toTLV(2, input.vatNumber),
    toTLV(3, input.timestampISO),
    toTLV(4, input.total),
    toTLV(5, input.vatAmount),
  ])

  const base64 = tlv.toString("base64")
  return QRCode.toDataURL(base64)
}
