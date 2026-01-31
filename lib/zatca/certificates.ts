import crypto from "node:crypto"
import { pool } from "@/lib/db"
import { encryptText } from "@/lib/crypto"

export async function createKeypairAndCsr(input: {
  businessId: string
  commonName: string
  organization: string
  country: string
}) {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  })

  const csr = crypto.createSign("RSA-SHA256")
  csr.update(`${input.commonName}|${input.organization}|${input.country}`)
  csr.end()
  const csrSignature = csr.sign(privateKey, "base64")

  const encrypted = encryptText(privateKey)

  const res = await pool.query(
    `INSERT INTO zatca_certificates (business_id, type, public_key, encrypted_private_key, private_key_iv, private_key_tag, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING id`,
    [input.businessId, "CSID", publicKey, encrypted.encrypted, encrypted.iv, encrypted.tag, "draft"]
  )

  return {
    certificateId: res.rows[0].id as string,
    publicKey,
    csr: `CSR:${input.commonName}:${csrSignature}`,
  }
}

export async function activateCertificate(input: {
  certificateId: string
  certificatePem: string
  csid?: string | null
  pcsid?: string | null
  expiresAt?: string | null
}) {
  await pool.query(
    `UPDATE zatca_certificates
     SET certificate_pem = $1, csid = $2, pcsid = $3, status = 'active', expires_at = $4
     WHERE id = $5`,
    [input.certificatePem, input.csid ?? null, input.pcsid ?? null, input.expiresAt ? new Date(input.expiresAt) : null, input.certificateId]
  )
}

export async function getActiveCertificate(businessId: string) {
  const res = await pool.query(
    `SELECT * FROM zatca_certificates WHERE business_id = $1 AND status = 'active' ORDER BY created_at DESC LIMIT 1`,
    [businessId]
  )
  return res.rows[0] ?? null
}
