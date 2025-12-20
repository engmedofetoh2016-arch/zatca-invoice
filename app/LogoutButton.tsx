"use client"

import { useRouter } from "next/navigation"

export default function LogoutButton() {
  const router = useRouter()

  async function logout() {
    await fetch("/api/logout", { method: "POST" })
    router.replace("/") // go to public home
  }

  return (
    <button
      onClick={logout}
      className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
    >
      تسجيل الخروج
    </button>
  )
}
