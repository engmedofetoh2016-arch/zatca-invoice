import { Suspense } from "react"
import LoginClient from "./login-client"

export const dynamic = "force-dynamic"

export default function LoginPage() {
  return (
    <div>
      <Suspense fallback={<div className="p-6">Loading...</div>}>
        <LoginClient />
      </Suspense>
      <footer className="mx-auto max-w-5xl px-6 pb-8 flex flex-wrap items-center justify-center gap-4 text-xs text-gray-500">
        <a className="underline" href="/terms">الشروط والأحكام</a>
        <a className="underline" href="/privacy">سياسة الخصوصية</a>
        <a className="underline" href="/support">الدعم الفني</a>
      </footer>
    </div>
  )
}


