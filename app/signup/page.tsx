"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

export default function SignupPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const router = useRouter()

  async function submit() {
    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) return alert(await res.text())
    router.push("/login")
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-xl mb-4">إنشاء حساب</h1>
      <input className="border p-2 w-full mb-2" placeholder="البريد الإلكتروني" value={email} onChange={e=>setEmail(e.target.value)} />
      <input className="border p-2 w-full mb-2" type="password" placeholder="كلمة المرور" value={password} onChange={e=>setPassword(e.target.value)} />
      <button className="bg-black text-white w-full p-2" onClick={submit}>تسجيل</button>
    </div>
  )
}
