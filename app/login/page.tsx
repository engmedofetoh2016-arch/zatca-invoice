"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"

export default function LoginPage() {
  const router = useRouter()
  const sp = useSearchParams()
  const next = sp.get("next") || "/dashboard"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data?.error ?? "Login failed")
      return
    }

    router.push(next)
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-sm p-6 space-y-3">
      <h1 className="text-xl font-semibold">Login</h1>
      {error && <div className="border p-2 text-sm">{error}</div>}
      <input className="border p-2 w-full" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
      <input className="border p-2 w-full" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" />
      <button className="bg-black text-white w-full p-2">Login</button>
    </form>
  )
}
