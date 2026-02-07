import nodemailer from "nodemailer"

type SendArgs = {
  to: string
  subject: string
  text: string
  html?: string
}

export function hasSmtp() {
  return Boolean(process.env.SMTP_HOST)
}

export async function sendEmail({ to, subject, text, html }: SendArgs) {
  if (!process.env.SMTP_HOST) {
    throw new Error("SMTP_HOST missing")
  }

  const port = Number(process.env.SMTP_PORT ?? 587)
  const secure = String(process.env.SMTP_SECURE ?? "").toLowerCase() === "true"
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
  })

  const from =
    process.env.SMTP_FROM ??
    (user ? `ZATCA Invoice <${user}>` : "ZATCA Invoice <no-reply@localhost>")

  await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html,
  })
}
