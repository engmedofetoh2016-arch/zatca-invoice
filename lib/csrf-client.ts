export function getCsrfToken() {
  if (typeof document === "undefined") return ""
  const match = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("csrf="))
  return match ? decodeURIComponent(match.split("=")[1] ?? "") : ""
}
