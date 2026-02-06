import { z } from "zod"

const ValidateResponseSchema = z.object({
  ok: z.boolean(),
  errors: z.array(z.string()).optional(),
})

export async function validateWithZatcaSdk(xml: string) {
  const url = process.env.ZATCA_SDK_URL
  if (!url) return { ok: true, skipped: true as const }

  const res = await fetch(`${url.replace(/\/+$/, "")}/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/xml" },
    body: xml,
  })
  const text = await res.text()
  if (!res.ok) {
    return { ok: false, errors: [`SDK HTTP ${res.status}: ${text.slice(0, 500)}`] }
  }
  try {
    const json = ValidateResponseSchema.parse(JSON.parse(text))
    return json
  } catch {
    return { ok: false, errors: ["Invalid SDK response"] }
  }
}
