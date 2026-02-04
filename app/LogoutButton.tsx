"use client"

import { useRouter } from "next/navigation"
import { getCsrfToken } from "@/lib/csrf-client"

export default function LogoutButton() {
  const router = useRouter()

  async function logout() {
    await fetch("/api/logout", {
      method: "POST",
      headers: { "x-csrf-token": getCsrfToken() },
    })
    router.replace("/")
  }

  return (
    <button
      onClick={logout}
      className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
    >
      تسجيل الخروج
    </button>
  )
}
