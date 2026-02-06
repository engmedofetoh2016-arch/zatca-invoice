import crypto from "node:crypto"
import { decryptText } from "@/lib/crypto"

export function signXmlWithPrivateKey(input: {
  xml: string
  encryptedPrivateKey: string
  iv: string
  tag: string
}) {
  // TODO(ZATCA-Phase2): Implement XMLDSig (canonicalization + signed properties) per ZATCA spec.
  // Current implementation is a simple RSA-SHA256 signature and is not ZATCA-compliant.
  const privateKeyPem = decryptText(input.encryptedPrivateKey, input.iv, input.tag)
  const signer = crypto.createSign("RSA-SHA256")
  signer.update(input.xml)
  signer.end()
  return signer.sign(privateKeyPem, "base64")
}
