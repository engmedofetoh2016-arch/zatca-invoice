"use client"

import { useEffect, useState } from "react"

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark" | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem("theme") as "light" | "dark" | null
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    const initial = stored ?? (prefersDark ? "dark" : "light")
    document.documentElement.dataset.theme = initial
    setTheme(initial)
  }, [])

  function toggle() {
    const next = theme === "dark" ? "light" : "dark"
    document.documentElement.dataset.theme = next
    localStorage.setItem("theme", next)
    setTheme(next)
  }

  if (!theme) return null

  return (
    <button
      type="button"
      onClick={toggle}
      className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
      aria-label="تبديل الوضع الداكن"
    >
      {theme === "dark" ? "وضع فاتح" : "وضع داكن"}
    </button>
  )
}
