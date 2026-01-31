import crypto from "node:crypto"

const ENC_ALGO = "aes-256-gcm"

function getKey() {
  const secret = process.env.KEY_ENCRYPTION_SECRET
  if (!secret || secret.length < 32) {
    throw new Error("KEY_ENCRYPTION_SECRET must be at least 32 chars")
  }
  return crypto.createHash("sha256").update(secret).digest()
}

export function encryptText(plain: string) {
  const iv = crypto.randomBytes(12)
  const key = getKey()
  const cipher = crypto.createCipheriv(ENC_ALGO, key, iv)
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return {
    encrypted: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
  }
}

export function decryptText(encrypted: string, iv: string, tag: string) {
  const key = getKey()
  const decipher = crypto.createDecipheriv(ENC_ALGO, key, Buffer.from(iv, "base64"))
  decipher.setAuthTag(Buffer.from(tag, "base64"))
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64")),
    decipher.final(),
  ])
  return decrypted.toString("utf8")
}

export function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex")
}

export function randomUuid() {
  return crypto.randomUUID()
}
