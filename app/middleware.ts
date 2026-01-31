// middleware.ts
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(req: NextRequest) {
  const token = req.cookies.get("token")?.value
  const csrf = req.cookies.get("csrf")?.value
  const isProd = process.env.NODE_ENV === "production"

  if (req.nextUrl.pathname === "/" && token) {
    const url = req.nextUrl.clone()
    url.pathname = "/dashboard"
    const res = NextResponse.redirect(url)
    if (!csrf) {
      res.cookies.set({
        name: "csrf",
        value: crypto.randomUUID(),
        httpOnly: false,
        sameSite: "lax",
        secure: isProd,
        path: "/",
      })
    }
    return res
  }

  if (req.nextUrl.pathname.startsWith("/dashboard") && !token) {
    const url = req.nextUrl.clone()
    url.pathname = "/login"
    const res = NextResponse.redirect(url)
    if (!csrf) {
      res.cookies.set({
        name: "csrf",
        value: crypto.randomUUID(),
        httpOnly: false,
        sameSite: "lax",
        secure: isProd,
        path: "/",
      })
    }
    return res
  }

  const res = NextResponse.next()
  if (!csrf) {
    res.cookies.set({
      name: "csrf",
      value: crypto.randomUUID(),
      httpOnly: false,
      sameSite: "lax",
      secure: isProd,
      path: "/",
    })
  }
  return res
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/login", "/signup"],
}
