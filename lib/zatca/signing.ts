import crypto from "node:crypto"
import { decryptText } from "@/lib/crypto"

export function signXmlWithPrivateKey(input: {
  xml: string
  encryptedPrivateKey: string
  iv: string
  tag: string
}) {
  const privateKeyPem = decryptText(input.encryptedPrivateKey, input.iv, input.tag)
  const signer = crypto.createSign("RSA-SHA256")
  signer.update(input.xml)
  signer.end()
  return signer.sign(privateKeyPem, "base64")
}
